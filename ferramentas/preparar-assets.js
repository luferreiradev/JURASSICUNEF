/* =========================================================================
   JURASSIC UNEF — preparacao dos assets
   ---------------------------------------------------------------------------
   Converte o pacote CC0 do GameArt2D no cenario enxuto que o jogo usa.

   Fonte (CC0, dominio publico — https://www.gameart2d.com/license.html):
     - https://www.gameart2d.com/free-desert-platformer-tileset.html

   Nenhum personagem sai daqui: o heroi vem do preset
   (ferramentas/importar-preset-html.js) e o chefe vem do pacote do carnotauro
   (ferramentas/pacote-carnotauro-boss/), com folhas ja prontas.

   Os PNGs originais tem muita area transparente e pesam ~5 MB no total. Como o
   jogo precisa carregar rapido no celular de quem escaneia o QR Code, aqui a
   gente:
     1. calcula a caixa util (bbox do alfa) de cada imagem;
     2. recorta, redimensiona e repinta no estilo vulcanico;
     3. grava as medidas ja calculadas em js/assets-dados.js.

   COMO RODAR (so precisa se voce quiser regerar os assets — eles ja estao
   commitados em assets/):
     npm i sharp
     node ferramentas/preparar-assets.js <pasta-desert-png>
   ========================================================================= */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SAIDA = path.join(RAIZ, 'assets');

const DESERT_DIR = process.argv[2];

if (!DESERT_DIR) {
  console.error('uso: node preparar-assets.js <desert/png>');
  process.exit(1);
}

// O mundo do jogo tem 960x540. As imagens sao guardadas MAIORES do que o
// tamanho final e reduzidas no desenho: assim ficam nitidas em tela retina,
// onde o canvas e renderizado a 2x ou 3x. A escala vai junto nos metadados.
const ESCALA_CENARIO = 0.7;     // tiles de 128px viram 90px de mundo

/* ---- estilo vulcanico ---------------------------------------------------
   O tileset original e um deserto ensolarado. Para o clima de Era Primitiva a
   arte e repintada pela LUMINOSIDADE: cada pixel troca de cor conforme o quao
   claro ele e, seguindo uma rampa. Assim a atmosfera inteira muda sem
   redesenhar nada e sem perder as formas.

   O esticamento (p0/p1) e obrigatorio: o fundo do deserto vive todo entre 0,56
   e 0,93 de luz. Sem esticar, a rampa inteira e consumida pelo topo e a
   imagem vira uma mancha de uma cor so.                                     */

const RAMPA_CEU = [
  [0.00, [24, 14, 42]], [0.28, [68, 24, 58]], [0.52, [138, 40, 52]],
  [0.74, [214, 88, 44]], [0.90, [240, 148, 62]], [1.00, [252, 214, 150]],
];
const RAMPA_TERRA = [
  [0.00, [16, 12, 20]], [0.35, [46, 26, 36]], [0.65, [92, 42, 38]], [1.00, [158, 82, 50]],
];
// Obstaculo precisa ser visto, nao so combinar. Com a mesma rampa do chao ele
// virava um vulto escuro sobre chao escuro e so dava para reagir tarde demais.
// Rocha em brasa: mais clara e mais quente que tudo em volta.
const RAMPA_OBSTACULO = [
  [0.00, [42, 20, 26]], [0.30, [122, 44, 38]], [0.62, [196, 88, 44]], [1.00, [246, 176, 92]],
];

function repintar(paradas, p0, p1) {
  return (r, g, b) => {
    const bruto = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const y = Math.max(0, Math.min(1, (bruto - p0) / (p1 - p0)));
    for (let i = 0; i < paradas.length - 1; i++) {
      const [t0, c0] = paradas[i], [t1, c1] = paradas[i + 1];
      if (y >= t0 && y <= t1) {
        const k = (y - t0) / (t1 - t0);
        return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
      }
    }
    return paradas[paradas.length - 1][1];
  };
}

async function aplicarCor(pipeline, fn) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [r, g, b] = fn(data[i], data[i + 1], data[i + 2]);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}

/* ---- utilidades -------------------------------------------------------- */

// Caixa que contem todo pixel visivel do conjunto de arquivos.
// Usar a UNIAO dos quadros e essencial: se cada quadro fosse recortado
// sozinho, o personagem tremeria na animacao.
async function caixaUtil(arquivos) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const f of arquivos) {
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: c } = info;
    for (let y = 0; y < h; y++) {
      const base = y * w * c;
      for (let x = 0; x < w; x++) {
        if (data[base + x * c + 3] > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

async function gravar(pipeline, destino) {
  await pipeline.png({ palette: true, quality: 92, effort: 10 }).toFile(destino);
  const kb = (fs.statSync(destino).size / 1024).toFixed(0);
  console.log('  ' + path.basename(destino).padEnd(26) + kb + ' KB');
  return +kb;
}

/* ---- objetos e tiles do deserto ---------------------------------------- */

async function montarDeserto() {
  console.log('\n[deserto]');
  // nome no jogo -> arquivo de origem
  const objetos = {
    'cacto-alto':   'Objects/Cactus (1).png',
    'cacto-bola':   'Objects/Cactus (2).png',
    'cacto-galho':  'Objects/Cactus (3).png',
    'pedra':        'Objects/Stone.png',
    'bloco':        'Objects/StoneBlock.png',
    'caveira':      'Objects/Skeleton.png',
    'arbusto':      'Objects/Bush (1).png',
    'galhos':       'Objects/Bush (2).png',
    'capim':        'Objects/Grass (2).png',
    'capim-seco':   'Objects/Grass (1).png',
    'arvore':       'Objects/Tree.png',
    'placa':        'Objects/Sign.png',
    'chao-topo':    'Tile/2.png',
    'saliencia-e':  'Tile/14.png',
    'saliencia-m':  'Tile/15.png',
    'saliencia-d':  'Tile/16.png',
  };

  // O que mata leva a rampa clara; o que e so paisagem fica no escuro do fundo.
  const OBSTACULOS = new Set([
    'pedra', 'bloco', 'cacto-alto', 'cacto-galho', 'caveira',
    'saliencia-e', 'saliencia-m', 'saliencia-d',
  ]);

  const saida = {};
  const tintaTerra = repintar(RAMPA_TERRA, 0.15, 0.85);
  const tintaObstaculo = repintar(RAMPA_OBSTACULO, 0.15, 0.85);
  for (const nome in objetos) {
    const origem = path.join(DESERT_DIR, objetos[nome]);
    const cx = await caixaUtil([origem]);
    const arquivo = `${nome}.png`;
    const tinta = OBSTACULOS.has(nome) ? tintaObstaculo : tintaTerra;
    await gravar(await aplicarCor(sharp(origem).extract(cx), tinta), path.join(SAIDA, arquivo));
    saida[nome] = { arquivo, l: cx.width, a: cx.height };
  }

  // Fundo: o BG original e 1280x960. O jogo usa 960x540, entao guardamos
  // ele ja na altura certa (540) — corta peso e evita reescalar todo quadro.
  const bgAlvo = { l: Math.round(1280 * (540 / 960)), a: 540 };
  await gravar(
    await aplicarCor(sharp(path.join(DESERT_DIR, 'BG.png')).resize(bgAlvo.l, bgAlvo.a),
                     repintar(RAMPA_CEU, 0.56, 0.94)),
    path.join(SAIDA, 'fundo.png')
  );
  saida['fundo'] = { arquivo: 'fundo.png', l: bgAlvo.l, a: bgAlvo.a };
  saida.escala = ESCALA_CENARIO;

  return saida;
}

/* ---- main --------------------------------------------------------------- */

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });

  const deserto = await montarDeserto();

  const cabecalho = `/* GERADO POR ferramentas/preparar-assets.js — nao edite a mao.
   Arte: GameArt2D (CC0 / dominio publico) — free desert tileset.
   O cenario traz largura e altura crus.
   O jogador vive em js/assets-homem.js e o chefe em js/assets-chefe.js. */\n\n`;

  const conteudo = cabecalho +
    'const CENARIO = ' + JSON.stringify(deserto, null, 2) + ';\n';

  fs.writeFileSync(path.join(RAIZ, 'js', 'assets-dados.js'), conteudo);

  const total = fs.readdirSync(SAIDA).reduce((s, f) => s + fs.statSync(path.join(SAIDA, f)).size, 0);
  console.log('\ntotal em assets/: ' + (total / 1024).toFixed(0) + ' KB');
})();
