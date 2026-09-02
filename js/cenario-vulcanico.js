/* =========================================================================
   JURASSIC UNEF - cenario vulcanico procedural do preset v2
   Desenhado numa grade pixel-art de 384x216 e ampliado para o mundo 960x540.
   ========================================================================= */

const CenarioVulcanico = (function () {
  const W = 384;
  const H = 216;
  const ESCALA = 2.5;
  const TAU = Math.PI * 2;
  const CHAO = 176;

  let tempo = 0;
  let timerMeteoro = 0.3;
  let timerErupcao = 0.5;
  const meteoros = [];
  const fumaca = [];
  const fagulhas = [];
  const cinzas = [];
  const impactos = [];

  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const rgb = (cor) => [
    parseInt(cor.slice(1, 3), 16),
    parseInt(cor.slice(3, 5), 16),
    parseInt(cor.slice(5, 7), 16),
  ];
  function misturar(a, b, t) {
    const x = rgb(a), y = rgb(b);
    return `rgb(${Math.round(x[0] + (y[0] - x[0]) * t)},${Math.round(x[1] + (y[1] - x[1]) * t)},${Math.round(x[2] + (y[2] - x[2]) * t)})`;
  }
  function aleatorio(semente) {
    return function () {
      semente |= 0;
      semente = semente + 0x6D2B79F5 | 0;
      let t = Math.imul(semente ^ semente >>> 15, 1 | semente);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function tela(l, a) {
    const c = document.createElement('canvas');
    c.width = l;
    c.height = a;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c, g };
  }
  function ret(g, x, y, l, a, cor) {
    g.fillStyle = cor;
    g.fillRect(Math.round(x), Math.round(y), Math.round(l), Math.round(a));
  }
  function disco(g, x, y, raio, cor) {
    g.fillStyle = cor;
    x = Math.round(x);
    y = Math.round(y);
    for (let dy = -Math.ceil(raio); dy <= Math.ceil(raio); dy++) {
      const resto = raio * raio - dy * dy;
      if (resto < 0) continue;
      const dx = Math.floor(Math.sqrt(resto));
      g.fillRect(x - dx, y + dy, dx * 2 + 1, 1);
    }
  }

  const ceu = (() => {
    const cores = ['#0d0912', '#1c0f22', '#3d1526', '#7a2412', '#c95415'];
    const { c, g } = tela(1, H);
    for (let y = 0; y < CHAO + 8; y += 3) {
      const t = y / (CHAO + 8);
      const f = t * (cores.length - 1);
      const i = Math.min(cores.length - 2, Math.floor(f));
      g.fillStyle = misturar(cores[i], cores[i + 1], f - i);
      g.fillRect(0, y, 1, 3);
    }
    return c;
  })();

  function criarSerra(semente, cor, brilho, base, amplitude, rachaduras) {
    const larg = W * 2;
    const { c, g } = tela(larg, H);
    const r = aleatorio(semente);
    const fase = [r() * TAU, r() * TAU, r() * TAU];
    for (let x = 0; x < larg; x++) {
      const u = x / larg * TAU;
      let y = base + Math.sin(u * 2 + fase[0]) * amplitude +
        Math.sin(u * 5 + fase[1]) * amplitude * 0.45 +
        Math.sin(u * 11 + fase[2]) * amplitude * 0.2;
      y = Math.round(y / 2) * 2;
      ret(g, x, y, 1, H - y, cor);
      ret(g, x, y, 1, 2, brilho);
    }
    for (let k = 0; k < rachaduras; k++) {
      let x = Math.floor(r() * larg), y = base + amplitude + r() * 8;
      for (let s = 0; s < 24; s++) {
        ret(g, x, y, 1, 2, s < 7 ? '#ffb02a' : (s < 15 ? '#ff5f14' : '#a52706'));
        x += r() < 0.5 ? -1 : 1;
        y += 1.7;
      }
    }
    return c;
  }

  const serraLonge = criarSerra(3, '#2a1c30', '#3b2842', 116, 15, 0);
  const serraPerto = criarSerra(11, '#160e1c', '#231532', 148, 10, 6);

  const VX = 246, VL = 226, TOPO = 42, BASE = 150, CRATER = 17;
  const vulcao = (() => {
    const { c, g } = tela(VL, BASE + 8);
    const r = aleatorio(97), pico = VL / 2, perfil = [];
    for (let x = 0; x < VL; x++) {
      const d = x - pico, ad = Math.abs(d), inclina = d > 0 ? 0.55 : 0.66;
      let y = TOPO + Math.pow(ad, 1.13) * inclina + Math.sin(x * 0.55) * 1.4 + Math.sin(x * 0.19) * 2.2;
      if (ad < CRATER) y = TOPO + 7 - Math.pow(ad / CRATER, 2) * 5;
      if (d > CRATER - 4 && d < CRATER + 7) y += 3;
      perfil.push(Math.round(Math.min(y, BASE)));
    }
    for (let x = 0; x < VL; x++) {
      const alto = perfil[x];
      for (let y = alto; y <= BASE + 7; y++) {
        const faixa = Math.floor((y - alto) / 13 + Math.sin(x * 0.08) * 0.6);
        const luz = x > pico;
        ret(g, x, y, 1, 1, faixa % 2 === 0 ? (luz ? '#3a2838' : '#2a1c2c') : (luz ? '#32222f' : '#241726'));
      }
      ret(g, x, alto, 1, 2, x > pico ? '#4a3446' : '#3a2740');
    }
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * VL);
      const y = perfil[x] + 6 + Math.floor(r() * (BASE - perfil[x]));
      if (y > BASE + 6) continue;
      const l = 2 + Math.floor(r() * 3);
      ret(g, x, y, l, 2, '#1b1120');
      ret(g, x, y, l, 1, '#453048');
    }
    for (let x = Math.round(pico - CRATER - 3); x < pico + CRATER + 3; x++) {
      if (x < 0 || x >= VL) continue;
      ret(g, x, perfil[x], 1, 1, '#7a3a24');
      ret(g, x, perfil[x] + 1, 1, 1, '#a8492a');
    }
    return { c, pico };
  })();

  const rios = (() => {
    const r = aleatorio(61), lista = [];
    for (let k = 0; k < 5; k++) {
      const direcao = k % 2 ? 1 : -1;
      let x = vulcao.pico + direcao * (4 + r() * 10), y = TOPO + 8;
      const pontos = [];
      while (y < BASE + 4) {
        pontos.push({ x, y });
        x += direcao * (1.05 + r() * 0.75) + (r() - 0.5) * 0.9;
        y += 3.1 + r() * 0.9;
      }
      lista.push(pontos);
    }
    return lista;
  })();

  function desenharVulcao(g) {
    const bx = VX - VL / 2;
    g.drawImage(vulcao.c, bx, 0);
    for (let k = 0; k < rios.length; k++) {
      const pontos = rios[k];
      for (let i = 0; i < pontos.length; i++) {
        const p = pontos[i], t = i / pontos.length;
        const l = Math.max(1, Math.round(4.2 - t * 2.6));
        const fluxo = Math.sin(i * 0.62 - tempo * 4.4 + k) * 0.5 + 0.5;
        ret(g, bx + p.x - 1, p.y, l + 2, 4, '#4a1c0c');
        ret(g, bx + p.x, p.y, l, 4, fluxo > 0.62 ? '#ff8a1e' : (fluxo > 0.3 ? '#e8480c' : '#b52c06'));
        if (fluxo > 0.72 && l > 1) ret(g, bx + p.x + (l / 2 | 0), p.y, 1, 3, '#ffd15c');
      }
    }
    const cx = bx + vulcao.pico;
    ret(g, cx - CRATER + 3, TOPO + 3, CRATER * 2 - 6, 5, '#8f2205');
    ret(g, cx - CRATER + 4, TOPO + 3, CRATER * 2 - 8, 3, '#e8480c');
    ret(g, cx - CRATER + 6, TOPO + 3, CRATER * 2 - 12, 2, '#ff9a1e');
    ret(g, cx - CRATER + 3, TOPO + 2, CRATER * 2 - 6, 1, '#ffc247');
  }

  function desenharLago(g) {
    const y = 152, x0 = VX - 160, x1 = VX + 160;
    ret(g, x0, y, x1 - x0, 5, '#8f2205');
    for (let x = x0; x < x1; x++) {
      const n = Math.sin(x * 0.21 + tempo * 0.9) + Math.sin(x * 0.07 - tempo * 0.5);
      ret(g, x, n < -0.4 ? y : y + 1, 1, n < -0.4 ? 4 : 2, n > 0.35 ? '#ff7a18' : (n > -0.4 ? '#d13a08' : '#2e1a1c'));
    }
    ret(g, x0, y, x1 - x0, 1, '#ffb02a');
  }

  function criarMeteoro(grande) {
    const direita = Math.random() < 0.75;
    meteoros.push({
      x: direita ? 120 + Math.random() * (W + 80) : -40 + Math.random() * 80,
      y: -12 - Math.random() * 30,
      vx: (direita ? -1 : 1) * (70 + Math.random() * 90),
      vy: 52 + Math.random() * 70,
      l: grande ? 26 + Math.random() * 14 : 11 + Math.random() * 10,
      grande,
    });
  }
  function desenharMeteoros(g, grandes) {
    for (const m of meteoros) {
      if (m.grande !== grandes) continue;
      const mod = Math.hypot(m.vx, m.vy), ux = -m.vx / mod, uy = -m.vy / mod, n = Math.round(m.l);
      for (let i = n; i >= 0; i--) {
        const t = i / n, x = m.x + ux * i, y = m.y + uy * i;
        if (y < -4) continue;
        const s = m.grande && t <= 0.6 ? 2 : 1;
        ret(g, x, y, s, s, t > 0.75 ? '#4a1206' : (t > 0.5 ? '#a52706' : (t > 0.25 ? '#ff5f14' : '#ffb02a')));
      }
      ret(g, m.x, m.y, m.grande ? 3 : 2, m.grande ? 3 : 2, '#fff3c4');
    }
  }
  function explodir(forca) {
    for (let i = 0; i < Math.round(forca * 26); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.95;
      const v = 55 + Math.random() * 90 * forca;
      fagulhas.push({ x: VX + (Math.random() - 0.5) * 22, y: TOPO + 4, vx: Math.cos(a) * v * 0.55, vy: Math.sin(a) * v, vida: 1 });
    }
    for (let i = 0; i < Math.round(5 * forca); i++) {
      fumaca.push({ x: VX + (Math.random() - 0.5) * 24, y: TOPO + 2, r: 4 + Math.random() * 5, vx: 4 + Math.random() * 9, vy: -9 - Math.random() * 8, vida: 1 });
    }
  }

  function atualizar(dt, velocidade) {
    tempo += dt;
    timerMeteoro -= dt;
    timerErupcao -= dt;
    if (timerMeteoro <= 0) {
      criarMeteoro(Math.random() < 0.22);
      timerMeteoro = 0.3 + Math.random() * 0.75;
    }
    if (timerErupcao <= 0) {
      explodir(0.35 + Math.random() * 0.45);
      timerErupcao = 0.8 + Math.random() * 1.7;
    }
    for (let i = meteoros.length - 1; i >= 0; i--) {
      const m = meteoros[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.y > 154 || m.x < -70 || m.x > W + 70) meteoros.splice(i, 1);
    }
    for (let i = fagulhas.length - 1; i >= 0; i--) {
      const p = fagulhas[i];
      p.vy += 150 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt * 0.8;
      if (p.vida <= 0) fagulhas.splice(i, 1);
    }
    for (let i = fumaca.length - 1; i >= 0; i--) {
      const p = fumaca[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += 5 * dt; p.vida -= dt * 0.16;
      if (p.vida <= 0) fumaca.splice(i, 1);
    }
    if (cinzas.length < 65) cinzas.push({ x: Math.random() * W, y: -4, vx: -6 - Math.random() * 10, vy: 9 + Math.random() * 16, s: Math.random() < 0.2 ? 2 : 1 });
    for (let i = cinzas.length - 1; i >= 0; i--) {
      const p = cinzas[i];
      p.x += (p.vx - velocidade / ESCALA * 0.04) * dt; p.y += p.vy * dt;
      if (p.y > H || p.x < -6) cinzas.splice(i, 1);
    }
    for (let i = impactos.length - 1; i >= 0; i--) {
      const p = impactos[i]; p.r += 82 * dt; p.vida -= 2.6 * dt;
      if (p.vida <= 0) impactos.splice(i, 1);
    }
  }

  function ladrilhar(g, img, deslocamento) {
    const off = ((deslocamento % img.width) + img.width) % img.width;
    g.drawImage(img, -off, 0);
    g.drawImage(img, -off + img.width, 0);
  }

  function desenharFundo(g, distancia) {
    g.save();
    g.imageSmoothingEnabled = false;
    g.scale(ESCALA, ESCALA);
    g.drawImage(ceu, 0, 0, 1, H, 0, 0, W, H);
    desenharMeteoros(g, false);
    ladrilhar(g, serraLonge, distancia / ESCALA * 0.10);
    desenharMeteoros(g, true);
    desenharVulcao(g);
    for (const p of fumaca) {
      g.globalAlpha = limitar(p.vida, 0, 1) * 0.55;
      disco(g, p.x, p.y, p.r, '#2b1d26');
      disco(g, p.x + 1, p.y - 1, p.r * 0.6, '#3d2a35');
    }
    g.globalAlpha = 1;
    for (const p of fagulhas) ret(g, p.x, p.y, 1, 1, p.vida > 0.6 ? '#ffe9a3' : (p.vida > 0.3 ? '#ff7a18' : '#a52706'));
    desenharLago(g);
    ladrilhar(g, serraPerto, distancia / ESCALA * 0.34);
    g.restore();
  }

  function desenharFrente(g) {
    g.save();
    g.imageSmoothingEnabled = false;
    g.scale(ESCALA, ESCALA);
    for (const p of impactos) {
      g.globalAlpha = limitar(p.vida, 0, 1) * 0.8;
      g.strokeStyle = '#ffd08a';
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(p.x, p.y, p.r, p.r * 0.32, 0, Math.PI, TAU);
      g.stroke();
    }
    g.globalAlpha = 0.7;
    for (const p of cinzas) ret(g, p.x, p.y, p.s, p.s, '#7a6a72');
    g.restore();
  }

  function impacto(x, y) {
    impactos.push({ x: x / ESCALA, y: y / ESCALA, r: 2, vida: 1 });
  }

  explodir(1);
  criarMeteoro(true);

  return { atualizar, desenharFundo, desenharFrente, impacto };
})();
