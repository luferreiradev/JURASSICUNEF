/*
 * Importa o homem das cavernas do preset HTML entregue pelo artista.
 *
 * O preset antigo desenhava o boneco por ossos e exportava uma folha unica por
 * botao; o novo (build ...-barbaro-bastao-360-...) ja traz TRES folhas prontas
 * embutidas como data URI: corrida, deslize e ataque. Entao aqui nao tem mais
 * navegador nenhum: le o HTML, tira o base64, mede cada quadro e escreve
 *
 *   assets/homem-correr.png, homem-deslizar.png, homem-atacar.png
 *   assets/homem-das-cavernas.json   (metadados, para conferencia)
 *   js/assets-homem.js               (o que o jogo le)
 *
 * Uso:
 *   node ferramentas/importar-preset-html.js caminho/para/preset.html
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const raiz = path.join(__dirname, '..');
const entrada = path.resolve(process.argv[2] || '');
const pastaAssets = path.join(raiz, 'assets');

// Altura do heroi no mundo de 960x540. E o numero em que a fisica, os vaos e
// as caixas de colisao foram calibrados; a escala das folhas sai dele, e nao o
// contrario, para o preset novo nao rebalancear o jogo sem querer.
const ALTURA_HEROI = 124;

// Quadros do ataque em que o tacape realmente varre a frente do personagem
// (o rastro branco aparece neles). Viram a janela em que o golpe machuca.
const GOLPE_DE = 3;
const GOLPE_ATE = 6;

// De que folha sai cada estado do jogo. O preset so tem corrida, deslize e
// ataque; parado, pulo e morte reaproveitam quadros, como ele proprio faz ao
// usar o ultimo quadro do deslize para o barbaro parado.
const MAPA = [
  ['parado', 'deslizar', [3], 1, 'ultimo quadro do deslize: o barbaro de pe, como no preset'],
  ['correr', 'correr', null, null, 'passada completa; o jogo ainda acelera a cadencia com a velocidade'],
  ['deslizar', 'deslizar', null, null, 'quadro 0 desce, 1 segura deitado, 2 levanta, 3 ja esta de pe'],
  ['atacar', 'atacar', null, null, 'giro de 360 graus com o tacape'],
  ['pular', 'correr', [3, 7], 6, 'os dois quadros da corrida em que ele esta no ar'],
  ['morrer', 'deslizar', [1], 1, 'o corpo esticado no chao'],
];

if (!entrada || !fs.existsSync(entrada)) {
  console.error('Informe o caminho de um preset HTML existente.');
  process.exit(1);
}

/* ---- PNG: o minimo para medir os quadros -------------------------------- */

function lerPNG(buffer) {
  let pos = 8;
  let largura = 0;
  let altura = 0;
  let profundidade = 0;
  let cor = 0;
  let entrelacado = 0;
  const idat = [];
  while (pos < buffer.length) {
    const tam = buffer.readUInt32BE(pos);
    const tipo = buffer.toString('ascii', pos + 4, pos + 8);
    const dados = buffer.subarray(pos + 8, pos + 8 + tam);
    if (tipo === 'IHDR') {
      largura = dados.readUInt32BE(0);
      altura = dados.readUInt32BE(4);
      profundidade = dados[8];
      cor = dados[9];
      entrelacado = dados[12];
    } else if (tipo === 'IDAT') idat.push(dados);
    else if (tipo === 'IEND') break;
    pos += 12 + tam;
  }
  if (profundidade !== 8 || entrelacado !== 0 || cor !== 6) {
    throw new Error('esperava PNG RGBA de 8 bits sem entrelacamento');
  }
  const bruto = zlib.inflateSync(Buffer.concat(idat));
  const passo = largura * 4;
  const saida = Buffer.alloc(altura * passo);
  let p = 0;
  for (let y = 0; y < altura; y++) {
    const filtro = bruto[p++];
    const linha = bruto.subarray(p, p + passo);
    p += passo;
    const atual = saida.subarray(y * passo, (y + 1) * passo);
    const acima = y > 0 ? saida.subarray((y - 1) * passo, y * passo) : null;
    for (let x = 0; x < passo; x++) {
      const a = x >= 4 ? atual[x - 4] : 0;
      const b = acima ? acima[x] : 0;
      const c = acima && x >= 4 ? acima[x - 4] : 0;
      let v = linha[x];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += (a + b) >> 1;
      else if (filtro === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      atual[x] = v & 255;
    }
  }
  return { largura, altura, pixels: saida };
}

// Caixa util (pixels visiveis) da folha inteira e de cada quadro. A linha do
// pe sai daqui: o artista deixa alguns pixels vazios embaixo de cada celula, e
// e o pe — nao a borda da celula — que precisa encostar no chao do jogo.
function medir(png, lq) {
  const quadros = png.largura / lq;
  if (!Number.isInteger(quadros)) throw new Error('largura da folha nao e multipla da celula');
  const uniao = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  const porQuadro = [];
  for (let f = 0; f < quadros; f++) {
    const caixa = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (let y = 0; y < png.altura; y++) {
      for (let x = 0; x < lq; x++) {
        if (png.pixels[(y * png.largura + f * lq + x) * 4 + 3] <= 8) continue;
        if (x < caixa.x0) caixa.x0 = x;
        if (x > caixa.x1) caixa.x1 = x;
        if (y < caixa.y0) caixa.y0 = y;
        if (y > caixa.y1) caixa.y1 = y;
      }
    }
    porQuadro.push(caixa);
    uniao.x0 = Math.min(uniao.x0, caixa.x0);
    uniao.x1 = Math.max(uniao.x1, caixa.x1);
    uniao.y0 = Math.min(uniao.y0, caixa.y0);
    uniao.y1 = Math.max(uniao.y1, caixa.y1);
  }
  return { quadros, uniao, porQuadro, linhaPe: uniao.y1 + 1 };
}

/* ---- Leitura do preset --------------------------------------------------- */

const html = fs.readFileSync(entrada, 'utf8');

function folha(nome) {
  const re = new RegExp(nome + "\\.src\\s*=\\s*'data:image/png;base64,([A-Za-z0-9+/=]+)'", 'g');
  let m;
  let ultima = null;
  // O preset reatribui .src algumas vezes durante o desenvolvimento; vale a
  // ultima atribuicao, que e a que o navegador acaba usando.
  while ((m = re.exec(html))) ultima = m[1];
  if (!ultima) throw new Error('nao achei a folha ' + nome + ' no preset');
  return Buffer.from(ultima, 'base64');
}

function numero(nome) {
  const m = html.match(new RegExp('\\b' + nome + '\\s*=\\s*(-?\\d+(?:\\.\\d+)?)'));
  if (!m) throw new Error('nao achei a constante ' + nome + ' no preset');
  return parseFloat(m[1]);
}

const build = (html.match(/<!--\s*build\s+([^\s>]+)\s*-->/) || [null, 'desconhecido'])[1];
// Baixar o mesmo preset duas vezes vira "preset (2).html"; o que identifica a
// versao e o build, entao o nome fica sem o sufixo do navegador.
const nomePreset = path.basename(entrada).replace(/ \(\d+\)(\.html)$/i, '$1');

const folhas = {
  correr: {
    arquivo: 'homem-correr.png',
    png: folha('RUN_SHEET'),
    lq: numero('HERO_CELL'),
    aq: numero('HERO_CELL'),
    n: numero('HERO_FRAMES'),
    fps: numero('HERO_FPS'),
  },
  deslizar: {
    arquivo: 'homem-deslizar.png',
    png: folha('SLIDE_SHEET'),
    lq: numero('SLIDE_CELL_W'),
    aq: numero('SLIDE_CELL_H'),
    n: numero('SLIDE_FRAMES'),
    fps: numero('SLIDE_FPS'),
  },
  atacar: {
    arquivo: 'homem-atacar.png',
    png: folha('ATTACK_SHEET'),
    lq: numero('ATTACK_CELL_W'),
    aq: numero('ATTACK_CELL_H'),
    n: numero('ATTACK_FRAMES'),
    fps: numero('ATTACK_FPS'),
  },
};

for (const nome in folhas) {
  const f = folhas[nome];
  const png = lerPNG(f.png);
  if (png.largura !== f.lq * f.n || png.altura !== f.aq) {
    throw new Error(`${nome}: folha ${png.largura}x${png.altura} nao bate com ${f.n} celulas de ${f.lq}x${f.aq}`);
  }
  f.medida = medir(png, f.lq);
}

// O barbaro em pe, da planta do pe ao topo da cabeca, na folha de corrida.
const alturaBruta = folhas.correr.medida.linhaPe - folhas.correr.medida.uniao.y0;
const escala = Math.round((ALTURA_HEROI / alturaBruta) * 100) / 100;

/* ---- Escrita ------------------------------------------------------------- */

fs.mkdirSync(pastaAssets, { recursive: true });
for (const nome in folhas) {
  const f = folhas[nome];
  fs.writeFileSync(path.join(pastaAssets, f.arquivo), f.png);
  const m = f.medida;
  console.log(`${f.arquivo}: ${f.png.length} bytes, ${m.quadros} quadros de ${f.lq}x${f.aq}, pe em y=${m.linhaPe}`);
}
console.log(`escala ${escala} (o barbaro tem ${alturaBruta}px na folha e ${Math.round(alturaBruta * escala)}px no jogo)`);

const anims = [];
for (const [estado, origem, quadros, fpsFixo, nota] of MAPA) {
  const f = folhas[origem];
  anims.push({
    estado,
    origem,
    arquivo: f.arquivo,
    quadros,
    n: quadros ? quadros.length : f.n,
    fps: fpsFixo || f.fps,
    lq: f.lq,
    aq: f.aq,
    dx: -f.lq / 2,          // celula centrada na coluna do jogador, como no preset
    dy: -f.medida.linhaPe,  // e o pe do desenho encostando no chao, nao a celula
    nota,
  });
}

const larguraCampo = Math.max(...anims.map((a) => a.estado.length));
const linhas = anims.map((a) => {
  const alvo = a.quadros ? `quadros: [${a.quadros.join(', ')}],` : 'coluna: 0,';
  return `  ${(a.estado + ':').padEnd(larguraCampo + 1)} { arquivo: '${a.arquivo}', ${alvo} n: ${a.n},`
    + ` lq: ${a.lq}, aq: ${a.aq}, fps: ${a.fps}, dx: ${a.dx}, dy: ${a.dy} },`;
});

const js = `/* GERADO POR ferramentas/importar-preset-html.js — nao edite a mao.
   Preset: ${nomePreset} (build ${build}).

   O preset novo nao monta mais o boneco por ossos: ele entrega tres folhas
   prontas — correr, deslizar e atacar. Os outros estados reaproveitam quadros:
${MAPA.map(([estado, , , , nota]) => `     ${estado.padEnd(8)} ${nota}`).join('\n')}

   dx centra a celula na coluna do jogador (e o alinhamento do proprio preset).
   dy usa a linha do PE medida na folha, e nao a borda da celula: assim o
   barbaro pisa exatamente em CHAO_Y, com o tacape e a capa livres para sair da
   silhueta sem levantar o personagem do chao.
   A escala nasce da altura calibrada do heroi (${ALTURA_HEROI}px no mundo de 960x540). */

const HEROI = {
${linhas.join('\n')}
  // Janela em que o tacape varre a frente do corpo: quadros ${GOLPE_DE} a ${GOLPE_ATE} do ataque.
  golpeDe: ${(GOLPE_DE / folhas.atacar.n).toFixed(3)},
  golpeAte: ${(GOLPE_ATE / folhas.atacar.n).toFixed(3)},
  escala: ${escala},
};
`;
fs.writeFileSync(path.join(raiz, 'js', 'assets-homem.js'), js);
console.log('js/assets-homem.js: ' + linhas.length + ' animacoes');

const meta = {
  name: 'homem_das_cavernas',
  source: nomePreset,
  build,
  scale: escala,
  heroHeightPx: ALTURA_HEROI,
  sheets: Object.keys(folhas).reduce((acc, nome) => {
    const f = folhas[nome];
    acc[nome] = {
      file: f.arquivo,
      cell: [f.lq, f.aq],
      frames: f.n,
      fps: f.fps,
      footLine: f.medida.linhaPe,
      contentBox: f.medida.uniao,
      // Altura util de cada quadro, em pixels da folha. E o que diz se um
      // quadro passa embaixo da saliencia sem atravessar a rocha.
      frameHeights: f.medida.porQuadro.map((c) => c.y1 - c.y0 + 1),
    };
    return acc;
  }, {}),
  animations: anims.reduce((acc, a) => {
    acc[a.estado] = {
      sheet: a.origem, file: a.arquivo, frames: a.n, fps: a.fps,
      pick: a.quadros, dx: a.dx, dy: a.dy, note: a.nota,
    };
    return acc;
  }, {}),
  attackHitbox: {
    activeFrom: Number((GOLPE_DE / folhas.atacar.n).toFixed(3)),
    activeTo: Number((GOLPE_ATE / folhas.atacar.n).toFixed(3)),
    note: 'quadros em que o rastro do tacape aparece na folha',
  },
  world: {
    nativeWidth: numero('W'),
    nativeHeight: numero('H'),
    groundY: numero('GROUND'),
    gameWidth: 960,
    gameHeight: 540,
    gameGroundY: 450,
  },
};
fs.writeFileSync(path.join(pastaAssets, 'homem-das-cavernas.json'), JSON.stringify(meta, null, 2) + '\n');
console.log('assets/homem-das-cavernas.json: metadados conferidos');
