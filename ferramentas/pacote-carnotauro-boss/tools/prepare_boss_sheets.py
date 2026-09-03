from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "run": ROOT / "generated_images/exec-e210ec2b-c768-4433-a845-3eb07bcf9d66.png",
    "attack": ROOT / "generated_images/exec-a6ea25b8-5473-4c19-a38a-d675e5949a59.png",
    "death": ROOT / "generated_images/exec-5e62ffc2-e3bb-4d18-b8de-60df9be4cde8.png",
}
OUT = ROOT / "assets"
FRAMES = 8
CELL_W, CELL_H = 192, 128
BASELINE = 121


def remove_neutral_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    # Remove only light neutral pixels connected to the outside. This reaches
    # the checkerboard and its antialias fringe without punching transparent
    # holes into cream/gray details enclosed by the dinosaur's black contour.
    def is_background(x, y):
        r, g, b, _ = pixels[x, y]
        # Checkerboard/fringe pixels are neutral. Warm cream pixels in horns,
        # teeth and belly must never be treated as background, even when light.
        return (min(r, g, b) > 138 and
                max(r, g, b) - min(r, g, b) < 34 and
                abs(r - g) < 27 and abs(g - b) < 27)

    queue = []
    seen = set()
    for x in range(rgba.width):
        queue.extend(((x, 0), (x, rgba.height - 1)))
    for y in range(rgba.height):
        queue.extend(((0, y), (rgba.width - 1, y)))
    while queue:
        x, y = queue.pop()
        if (x, y) in seen or not is_background(x, y):
            continue
        seen.add((x, y))
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        if x: queue.append((x - 1, y))
        if x + 1 < rgba.width: queue.append((x + 1, y))
        if y: queue.append((x, y - 1))
        if y + 1 < rgba.height: queue.append((x, y + 1))
    return rgba


def remove_specks(image: Image.Image, minimum_area: int = 50) -> Image.Image:
    alpha = image.getchannel("A")
    mask = alpha.load()
    seen = set()
    remove = []
    for y in range(image.height):
        for x in range(image.width):
            if mask[x, y] == 0 or (x, y) in seen:
                continue
            stack = [(x, y)]
            seen.add((x, y))
            component = []
            while stack:
                px, py = stack.pop()
                component.append((px, py))
                for nx, ny in ((px - 1, py - 1), (px, py - 1), (px + 1, py - 1),
                               (px - 1, py),                     (px + 1, py),
                               (px - 1, py + 1), (px, py + 1), (px + 1, py + 1)):
                    if (0 <= nx < image.width and 0 <= ny < image.height and
                            mask[nx, ny] and (nx, ny) not in seen):
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            if len(component) < minimum_area:
                remove.extend(component)
    pixels = image.load()
    for x, y in remove:
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
    return image


def remove_leading_tail_fragments(image: Image.Image) -> Image.Image:
    """Remove tail tips leaked from the previous cell in this left-facing rig."""
    mask = image.getchannel("A").load()
    seen = set()
    components = []
    for y in range(image.height):
        for x in range(image.width):
            if not mask[x, y] or (x, y) in seen:
                continue
            stack = [(x, y)]
            seen.add((x, y))
            points = []
            while stack:
                px, py = stack.pop()
                points.append((px, py))
                for nx, ny in ((px - 1, py - 1), (px, py - 1), (px + 1, py - 1),
                               (px - 1, py),                     (px + 1, py),
                               (px - 1, py + 1), (px, py + 1), (px + 1, py + 1)):
                    if (0 <= nx < image.width and 0 <= ny < image.height and
                            mask[nx, ny] and (nx, ny) not in seen):
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            components.append(points)
    if not components:
        return image
    main = max(components, key=len)
    main_left = min(x for x, _ in main)
    pixels = image.load()
    for points in components:
        if points is main:
            continue
        if max(x for x, _ in points) < main_left:
            for x, y in points:
                r, g, b, _ = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)
    return image


def harden_outline(image: Image.Image) -> Image.Image:
    # Convert only the surviving outside edge to black. No pixel is erased in
    # this stage, so internal shading, teeth, eye and skin remain fully opaque.
    pixels = image.load()
    outline = []
    for y in range(1, image.height - 1):
        for x in range(1, image.width - 1):
            if not pixels[x, y][3]:
                continue
            if any(pixels[x + dx, y + dy][3] == 0
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                outline.append((x, y))
    for x, y in outline:
        pixels[x, y] = (8, 6, 7, 255)
    return image


def split_frames(image: Image.Image, columns=FRAMES, rows=1):
    result = []
    for index in range(FRAMES):
        column, row = index % columns, index // columns
        left = round(column * image.width / columns)
        right = round((column + 1) * image.width / columns)
        top = round(row * image.height / rows)
        bottom = round((row + 1) * image.height / rows)
        frame = image.crop((left, top, right, bottom))
        if rows == 2:
            # The generated 4x2 death grid occasionally lets the previous
            # cell's tail touch the far-left edge of the next cell.
            ImageDraw.Draw(frame).rectangle((0, 0, round(frame.width * 0.035), frame.height),
                                            fill=(0, 0, 0, 0))
        frame = remove_leading_tail_fragments(remove_specks(frame))
        frame = harden_outline(frame)
        bbox = frame.getbbox()
        if bbox is None:
            raise RuntimeError(f"frame {index} is empty")
        result.append(frame.crop(bbox))
    return result


def split_death_components(image: Image.Image):
    """Extract the eight complete poses from the generated 4x2 loose grid."""
    alpha = image.getchannel("A").load()
    seen, components = set(), []
    for y in range(image.height):
        for x in range(image.width):
            if not alpha[x, y] or (x, y) in seen:
                continue
            stack, points = [(x, y)], []
            seen.add((x, y))
            while stack:
                px, py = stack.pop()
                points.append((px, py))
                for nx, ny in ((px - 1, py - 1), (px, py - 1), (px + 1, py - 1),
                               (px - 1, py),                     (px + 1, py),
                               (px - 1, py + 1), (px, py + 1), (px + 1, py + 1)):
                    if (0 <= nx < image.width and 0 <= ny < image.height and
                            alpha[nx, ny] and (nx, ny) not in seen):
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            if len(points) > 1000:
                components.append(points)
    if len(components) != FRAMES:
        raise RuntimeError(f"expected {FRAMES} death poses, found {len(components)}")
    boxes = []
    for points in components:
        x0, y0 = min(x for x, _ in points), min(y for _, y in points)
        x1, y1 = max(x for x, _ in points) + 1, max(y for _, y in points) + 1
        boxes.append((x0, y0, x1, y1))
    boxes.sort(key=lambda b: (0 if (b[1] + b[3]) / 2 < image.height / 2 else 1, b[0]))
    result = []
    for x0, y0, x1, y1 in boxes:
        pad = 42
        frame = image.crop((max(0, x0 - pad), max(0, y0 - pad),
                            min(image.width, x1 + pad), min(image.height, y1 + pad)))
        frame = harden_outline(remove_specks(frame))
        result.append(frame.crop(frame.getbbox()))
    return result


prepared = {}
for name, path in SOURCES.items():
    clean = remove_neutral_background(Image.open(path))
    prepared[name] = split_death_components(clean) if name == "death" else split_frames(clean)
all_frames = [frame for frames in prepared.values() for frame in frames]
max_w = max(frame.width for frame in all_frames)
max_h = max(frame.height for frame in all_frames)
scale = min((CELL_W - 10) / max_w, (CELL_H - 10) / max_h)

OUT.mkdir(parents=True, exist_ok=True)
for name, frames in prepared.items():
    sheet = Image.new("RGBA", (CELL_W * FRAMES, CELL_H), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
        sprite = frame.resize(size, Image.Resampling.NEAREST)
        x = index * CELL_W + (CELL_W - sprite.width) // 2
        y = BASELINE - sprite.height
        sheet.alpha_composite(sprite, (x, y))
    if name == "attack":
        # Restore bright teeth in the maximum-open bite frame. The source
        # generation darkened them together with the mouth cavity.
        draw = ImageDraw.Draw(sheet)
        ox = 4 * CELL_W
        tooth = (250, 235, 190, 255)
        for points in (
            [(ox + 27, 41), (ox + 31, 41), (ox + 29, 47)],
            [(ox + 35, 42), (ox + 39, 42), (ox + 37, 48)],
            [(ox + 43, 42), (ox + 47, 42), (ox + 45, 48)],
            [(ox + 44, 70), (ox + 47, 64), (ox + 49, 69)],
            [(ox + 49, 64), (ox + 52, 58), (ox + 54, 63)],
            [(ox + 54, 58), (ox + 57, 53), (ox + 59, 57)],
        ):
            draw.polygon(points, fill=tooth)
    sheet.save(OUT / f"boss-carnotauro-{name}.png", optimize=True)

print(f"frames={FRAMES} cell={CELL_W}x{CELL_H} scale={scale:.4f}")
