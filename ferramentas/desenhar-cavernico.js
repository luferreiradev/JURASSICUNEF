/* =========================================================================
   JURASSIC UNEF — o homem das cavernas, desenhado por codigo
   ---------------------------------------------------------------------------
   Os pacotes gratuitos nao tem um cavernico, entao ele e desenhado aqui.

   A ideia central: NAO desenhar oito figuras diferentes. Desenhar UM boneco
   articulado (cabeca, torso, coxa, canela, pe, braco, antebraco), cada peca
   uma vez, e animar girando as juntas — que e como animacao 2D de jogo e
   feita de verdade. Desenhar quadro a quadro na mao produziria oito bonecos
   ligeiramente diferentes, e a animacao tremeria.

   Cada peca aponta para BAIXO no seu proprio sistema. Em SVG, rotate(a) leva
   a ponta de (0,L) para (-L*sen a, L*cos a): angulo NEGATIVO joga o membro
   para a frente (o personagem olha para +x), POSITIVO joga para tras.

   Rodar:  npm i sharp && node ferramentas/desenhar-cavernico.js
   ========================================================================= */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SAIDA = path.join(RAIZ, 'assets');

/* ---- medidas do boneco --------------------------------------------------- */

const M = {
  quadrilX: 200, quadrilY: 300,   // origem do corpo dentro da tela de desenho
  ombroY: -100,                   // topo do torso, em relacao ao quadril
  // O braco nasce ABAIXO do topo do torso, e a cabeca fica bem acima dele.
  // Antes os tres pontos eram quase o mesmo: a cabeca engolia o ombro e o
  // braco brotava de dentro do rosto, cruzando a cara em todo quadro.
  bracoY: -84,
  cabecaY: -152,          // raio da cabeca e 52, entao ela encosta no topo do torso
  coxa: 72, canela: 68, pe: 46,
  braco: 62, antebraco: 56,
};

// Cores separadas em familias diferentes de proposito. Na primeira tentativa
// pele, couro e cabelo eram todos marrom e o boneco virava uma mancha so.
const COR = {
  contorno: '#2a1a10',
  pele: '#f2bd88',
  peleFundo: '#c08a5c',        // membros de tras mais escuros = profundidade
  couro: '#8c3a2a',            // pele de bicho avermelhada, longe do tom da pele
  mancha: '#e3c79b',
  cabelo: '#241a12',           // quase preto, para separar do rosto
  dente: '#f5ecd6',
  denteSombra: '#cfbd97',
  branco: '#ffffff',
};

const TRACO = 7;

/* ---- pecas ---------------------------------------------------------------
   Todas comecam em (0,0) e crescem para baixo, para o rotate da junta cair
   exatamente no ponto certo.                                                */

function perna(cor, comCouro) {
  const tanga = comCouro
    ? '<path d="M -19 -12 L 19 -12 L 21 26 L 11 17 L 2 28 L -8 17 L -19 26 Z" fill="' + COR.couro +
      '" stroke="' + COR.contorno + '" stroke-width="' + TRACO + '" stroke-linejoin="round"/>'
    : '';
  return '<rect x="-18" y="-12" width="36" height="' + (M.coxa + 20) + '" rx="18" fill="' + cor +
         '" stroke="' + COR.contorno + '" stroke-width="' + TRACO + '"/>' + tanga;
}

// As pecas de baixo comecam BEM acima da junta (y bem negativo). Com pouco
// avanco aparecia um vao no joelho e no tornozelo, e o boneco lia como um
// monte de capsulas soltas em vez de uma perna.
function canela(cor) {
  return '<rect x="-15" y="-22" width="30" height="' + (M.canela + 28) + '" rx="15" fill="' + cor +
         '" stroke="' + COR.contorno + '" stroke-width="' + TRACO + '"/>';
}

function pe(cor) {
  // Pe descalco, apontando para a frente (+x).
  return '<path d="M -15 -20 L 15 -20 L ' + M.pe + ' 6 Q ' + (M.pe + 6) + ' 19 ' + (M.pe - 8) +
         ' 21 L -12 21 Q -21 19 -19 4 Z" fill="' + cor + '" stroke="' + COR.contorno +
         '" stroke-width="' + TRACO + '" stroke-linejoin="round"/>';
}

function braco(cor) {
  return '<rect x="-14" y="-11" width="28" height="' + (M.braco + 18) + '" rx="14" fill="' + cor +
         '" stroke="' + COR.contorno + '" stroke-width="' + TRACO + '"/>';
}

function antebraco(cor) {
  return '<rect x="-13" y="-20" width="26" height="' + (M.antebraco + 24) + '" rx="13" fill="' + cor +
         '" stroke="' + COR.contorno + '" stroke-width="' + TRACO + '"/>' +
         '<circle cx="0" cy="' + (M.antebraco + 2) + '" r="16" fill="' + cor +
         '" stroke="' + COR.contorno + '" stroke-width="' + TRACO + '"/>';
}

// Dente de dinossauro: base larga com a raiz mais escura, ponta curva e afiada,
// serrilha na borda de tras. A primeira versao era fina demais e simetrica —
// lia como folha. O que faz virar dente e a base grossa somada a curvatura.
function dente() {
  // O giro nao e escolhido "no olho": o dente e filho do antebraco, entao o
  // angulo do antebraco entra na conta. Com o antebraco por volta de -114 no
  // mundo, este +152 poe a ponta apontando para a frente e para cima. Sem essa
  // compensacao a ponta caia para baixo e cruzava a perna.
  return '<g transform="translate(0 ' + (M.antebraco + 2) + ') rotate(152)">' +
    '<path d="M -22 6 Q -26 -30 -20 -62 Q -13 -100 3 -120 Q 9 -96 14 -66 Q 19 -32 16 6 Z" fill="' + COR.dente +
    '" stroke="' + COR.contorno + '" stroke-width="' + TRACO + '" stroke-linejoin="round"/>' +
    '<path d="M -22 6 Q -3 14 16 6 L 14 -18 Q -3 -10 -20 -18 Z" fill="' + COR.denteSombra +
    '" stroke="' + COR.contorno + '" stroke-width="6" stroke-linejoin="round"/>' +
    '<path d="M 2 -30 Q 8 -62 1 -96" fill="none" stroke="' + COR.denteSombra + '" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M -21 -32 l -8 -3 M -19 -52 l -8 -4 M -16 -72 l -8 -5 M -11 -92 l -8 -6" stroke="' + COR.contorno +
    '" stroke-width="5" stroke-linecap="round"/>' +
    '</g>';
}

function torso() {
  const o = M.ombroY;
  return '<rect x="-38" y="' + (o - 8) + '" width="76" height="' + (-o + 26) + '" rx="34" fill="' + COR.pele +
         '" stroke="' + COR.contorno + '" stroke-width="' + TRACO + '"/>' +
    // tunica de pele com bainha rasgada
    '<path d="M -40 ' + (o + 26) + ' Q 0 ' + (o + 8) + ' 40 ' + (o + 26) +
    ' L 36 8 L 22 -6 L 8 10 L -6 -6 L -22 8 L -39 -2 Z" fill="' + COR.couro +
    '" stroke="' + COR.contorno + '" stroke-width="' + TRACO + '" stroke-linejoin="round"/>' +
    // alca atravessada num ombro so, marca registrada de cavernico
    '<path d="M -30 ' + (o + 4) + ' L -8 ' + (o - 6) + ' L 6 ' + (o + 30) + ' L -16 ' + (o + 40) + ' Z" fill="' + COR.couro +
    '" stroke="' + COR.contorno + '" stroke-width="' + TRACO + '" stroke-linejoin="round"/>' +
    '<circle cx="-14" cy="' + (o + 58) + '" r="7" fill="' + COR.mancha + '"/>' +
    '<circle cx="16" cy="' + (o + 74) + '" r="6" fill="' + COR.mancha + '"/>' +
    '<circle cx="0" cy="' + (o + 92) + '" r="5" fill="' + COR.mancha + '"/>';
}

// Perfil olhando para a direita. A primeira versao punha o cabelo por cima da
// testa e o olho na beirada: lia como corte de tigela, nao como rosto. Agora o
// cabelo e uma massa no TOPO e na NUCA, a testa fica a mostra, e o nariz sai
// para fora do contorno — e o nariz que faz um circulo virar um perfil.
function cabeca() {
  const C = COR;
  return '<g transform="translate(6 ' + M.cabecaY + ')">' +
    // Nariz grande e anguloso, saindo bem para fora do circulo do cranio. Na
    // versao anterior ele mal ultrapassava a borda e lia como orelha.
    '<path d="M 38 -14 L 76 16 Q 81 27 66 28 L 36 27 Z" fill="' + C.pele +
    '" stroke="' + C.contorno + '" stroke-width="' + TRACO + '" stroke-linejoin="round"/>' +
    '<circle cx="0" cy="0" r="52" fill="' + C.pele + '" stroke="' + C.contorno + '" stroke-width="' + TRACO + '"/>' +
    // barba
    '<path d="M -20 28 Q -10 62 20 58 Q 44 54 48 28 Q 32 44 12 42 Q -8 40 -20 28 Z" fill="' + C.cabelo +
    '" stroke="' + C.contorno + '" stroke-width="' + TRACO + '" stroke-linejoin="round"/>' +
    // cabelo: topo e nuca, deixando a testa livre
    '<path d="M -54 6 Q -64 -34 -40 -52 Q -22 -70 4 -64 Q 30 -60 42 -38 Q 24 -50 2 -48 Q -24 -46 -38 -30 Q -50 -16 -48 8 Z" fill="' + C.cabelo +
    '" stroke="' + C.contorno + '" stroke-width="' + TRACO + '" stroke-linejoin="round"/>' +
    '<path d="M -26 -56 l -6 -22 l 19 11 Z M 2 -65 l 5 -21 l 12 17 Z M -46 -37 l -19 -13 l 19 -4 Z" fill="' + C.cabelo +
    '" stroke="' + C.contorno + '" stroke-width="6" stroke-linejoin="round"/>' +
    '<path d="M -48 8 Q -63 43 -36 55 Q -18 61 -8 50 Q -28 42 -32 24 Q -36 8 -48 8 Z" fill="' + C.cabelo +
    '" stroke="' + C.contorno + '" stroke-width="' + TRACO + '" stroke-linejoin="round"/>' +
    // arco superciliar pesado: o traco que mais diz "cavernico"
    '<path d="M 6 -22 Q 24 -32 43 -19" fill="none" stroke="' + C.cabelo + '" stroke-width="13" stroke-linecap="round"/>' +
    '<ellipse cx="22" cy="1" rx="10" ry="12" fill="' + C.branco + '" stroke="' + C.contorno + '" stroke-width="5"/>' +
    '<circle cx="26" cy="3" r="5" fill="' + C.contorno + '"/>' +
    '<path d="M 26 32 Q 36 38 46 31" fill="none" stroke="' + C.contorno + '" stroke-width="6" stroke-linecap="round"/>' +
    '</g>';
}

/* ---- animacoes -----------------------------------------------------------
   Uma volta completa de corrida em 8 quadros. So a PERNA da frente e descrita;
   a de tras usa o mesmo ciclo meia volta adiante — e o que garante que os dois
   lados andem igual sem eu ter que manter duas tabelas em sincronia.        */

const CORRIDA = {
  coxa:      [-30, -12,   8,  30,  38,   5, -35, -42],
  canela:    [ 10,  25,  18,   8,  45,  80,  65,  30],
  pe:        [ 10,   0,  -5, -25, -15,   0,   5,  10],
  // O braco que segura o dente balanca pouco e nunca vai para tras: quem corre
  // com uma arma na mao a carrega firme. Na primeira versao ele fazia o balanco
  // completo e o dente sumia atras do corpo em metade dos quadros.
  braco:      [-18, -24, -30, -34, -32, -28, -24, -20],
  antebraco:  [-84, -88, -92, -96, -94, -90, -86, -82],
  // O braco de tras faz o balanco largo, que e o que da leitura de corrida.
  bracoTras:     [ 40,  28,   8, -12, -24, -14,   8,  26],
  antebracoTras: [-40, -46, -52, -56, -52, -48, -44, -40],
  // Sobe e desce duas vezes por volta: desce quando o pe planta, sobe no voo.
  altura:    [  2,   6,   3,  -4,   2,   6,   3,  -4],
  tronco:    [ -8,  -9,  -8,  -6,  -8,  -9,  -8,  -6],
};

const PULO = {
  coxa: [-46, -40, -30], canela: [70, 58, 40], pe: [12, 8, 0],
  braco: [-26, -34, -28], antebraco: [-112, -104, -98],
  bracoTras: [-20, -34, -22], antebracoTras: [-30, -26, -22],
  altura: [-6, -8, -6], tronco: [-12, -10, -8],
};

/* ---- montagem de um quadro ----------------------------------------------- */

function quadroEmPe(a, i, defasagem) {
  const g = (v, k) => v[k % v.length];
  const j = (i + defasagem) % a.coxa.length;   // perna de tras, meia volta adiante

  const pernaCompleta = (cor, couro, idx) =>
    '<g transform="rotate(' + g(a.coxa, idx) + ')">' + perna(cor, couro) +
      '<g transform="translate(0 ' + M.coxa + ') rotate(' + g(a.canela, idx) + ')">' + canela(cor) +
        '<g transform="translate(0 ' + M.canela + ') rotate(' + g(a.pe, idx) + ')">' + pe(cor) + '</g>' +
      '</g>' +
    '</g>';

  const bracoCompleto = (cor, idx, comDente) =>
    '<g transform="translate(0 ' + M.bracoY + ') rotate(' + g(comDente ? a.braco : a.bracoTras, idx) + ')">' + braco(cor) +
      '<g transform="translate(0 ' + M.braco + ') rotate(' + g(comDente ? a.antebraco : a.antebracoTras, idx) + ')">' +
        antebraco(cor) + (comDente ? dente() : '') +
      '</g>' +
    '</g>';

  const giroTronco = 'rotate(' + g(a.tronco, i) + ')';
  return '<g transform="translate(' + M.quadrilX + ' ' + (M.quadrilY + g(a.altura, i)) + ')">' +
    pernaCompleta(COR.peleFundo, false, j) +
    '<g transform="' + giroTronco + '">' + bracoCompleto(COR.peleFundo, j, false) + torso() + cabeca() + '</g>' +
    pernaCompleta(COR.pele, true, i) +
    '<g transform="' + giroTronco + '">' + bracoCompleto(COR.pele, i, true) + '</g>' +
  '</g>';
}

// Caindo de costas: o corpo tomba para tras, as pernas sobem e o dente escapa
// da mao. Com rotate(-42) o "para cima" local vai para cima e para a esquerda,
// que e exatamente o tombo para tras.
function quadroQueda() {
  const pernaTras =
    '<g transform="rotate(-64)">' + perna(COR.peleFundo, false) +
      '<g transform="translate(0 ' + M.coxa + ') rotate(58)">' + canela(COR.peleFundo) +
        '<g transform="translate(0 ' + M.canela + ') rotate(-20)">' + pe(COR.peleFundo) + '</g>' +
      '</g>' +
    '</g>';
  const bracoTrasQ =
    '<g transform="translate(0 ' + M.bracoY + ') rotate(96)">' + braco(COR.peleFundo) +
      '<g transform="translate(0 ' + M.braco + ') rotate(30)">' + antebraco(COR.peleFundo) + '</g>' +
    '</g>';
  const bracoFrenteQ =
    '<g transform="translate(0 ' + M.bracoY + ') rotate(-108)">' + braco(COR.pele) +
      '<g transform="translate(0 ' + M.braco + ') rotate(-24)">' + antebraco(COR.pele) + dente() + '</g>' +
    '</g>';
  const pernaFrenteQ =
    '<g transform="rotate(-88)">' + perna(COR.pele, true) +
      '<g transform="translate(0 ' + M.coxa + ') rotate(74)">' + canela(COR.pele) +
        '<g transform="translate(0 ' + M.canela + ') rotate(-24)">' + pe(COR.pele) + '</g>' +
      '</g>' +
    '</g>';
  const cabecaTombada =
    '<g transform="translate(0 ' + M.cabecaY + ') rotate(24) translate(0 ' + (-M.cabecaY) + ')">' + cabeca() + '</g>';

  return '<g transform="translate(' + (M.quadrilX - 10) + ' ' + (M.quadrilY + 74) + ') rotate(-42)">' +
    pernaTras + bracoTrasQ + torso() + cabecaTombada + pernaFrenteQ + bracoFrenteQ +
  '</g>';
}

// Deslizando: o corpo inteiro deita e escorrega, com o dente esticado a frente.
//
// O sinal do giro do corpo importa e nao e obvio. O "para cima" local do boneco
// e (0,-1); com rotate(+74) ele vai para (0.96, -0.28), ou seja, a cabeca aponta
// para a DIREITA e os pes ficam para tras — que e o que se quer. Com rotate(-74)
// acontece o contrario e o cavernico desliza de costas, de cabeca para tras.
const GIRO_DESLIZE = 86;

function quadroDeslize() {
  const membroTras =
    '<g transform="rotate(16)">' + perna(COR.peleFundo, false) +
      '<g transform="translate(0 ' + M.coxa + ') rotate(38)">' + canela(COR.peleFundo) +
        '<g transform="translate(0 ' + M.canela + ') rotate(-30)">' + pe(COR.peleFundo) + '</g>' +
      '</g>' +
    '</g>';
  const bracoTras =
    '<g transform="translate(0 ' + M.bracoY + ') rotate(64)">' + braco(COR.peleFundo) +
      '<g transform="translate(0 ' + M.braco + ') rotate(-46)">' + antebraco(COR.peleFundo) + '</g>' +
    '</g>';
  const bracoFrente =
    '<g transform="translate(0 ' + M.bracoY + ') rotate(-92)">' + braco(COR.pele) +
      '<g transform="translate(0 ' + M.braco + ') rotate(-14)">' + antebraco(COR.pele) + dente() + '</g>' +
    '</g>';
  const pernaFrente =
    '<g transform="rotate(-8)">' + perna(COR.pele, true) +
      '<g transform="translate(0 ' + M.coxa + ') rotate(52)">' + canela(COR.pele) +
        '<g transform="translate(0 ' + M.canela + ') rotate(-34)">' + pe(COR.pele) + '</g>' +
      '</g>' +
    '</g>';
  // A cabeca desgira parte do corpo, para o rosto continuar olhando em frente
  // em vez de encarar o chao.
  const cabecaEmpinada =
    '<g transform="translate(0 ' + M.cabecaY + ') rotate(' + (-GIRO_DESLIZE + 26) + ') translate(0 ' + (-M.cabecaY) + ')">' +
    cabeca() + '</g>';

  return '<g transform="translate(' + (M.quadrilX - 52) + ' ' + (M.quadrilY + 108) + ') rotate(' + GIRO_DESLIZE + ')">' +
    membroTras + bracoTras + torso() + cabecaEmpinada + pernaFrente + bracoFrente +
  '</g>';
}

function svg(conteudo) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="580" viewBox="0 0 440 580">' + conteudo + '</svg>';
}

/* ---- caixa util e exportacao --------------------------------------------- */

// Uniao dos quadros: recortar cada um sozinho faria o personagem tremer.
async function caixaUtil(buffers) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const b of buffers) {
    const { data, info } = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: c } = info;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * c + 3] > 8) {
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

const ALTURA_ARQUIVO = 220;   // mesma referencia usada para o dino
const ALTURA_JOGO = 132;

async function principal() {
  const render = (conteudo) => sharp(Buffer.from(svg(conteudo))).png().toBuffer();

  const quadrosCorrida = [];
  for (let i = 0; i < CORRIDA.coxa.length; i++) quadrosCorrida.push(await render(quadroEmPe(CORRIDA, i, 4)));
  const quadrosPulo = [];
  for (let i = 0; i < PULO.coxa.length; i++) quadrosPulo.push(await render(quadroEmPe(PULO, i, 0)));
  const quadrosQueda = [await render(quadroQueda())];
  const quadrosDeslize = [await render(quadroDeslize())];

  // A escala sai da corrida, como no dino: e ela que define o tamanho normal.
  const caixaCorrida = await caixaUtil(quadrosCorrida);
  const escala = ALTURA_ARQUIVO / caixaCorrida.height;
  const ancora = {
    x: caixaCorrida.left + caixaCorrida.width / 2,
    y: caixaCorrida.top + caixaCorrida.height,
  };

  const defs = {
    correr: { quadros: quadrosCorrida, fps: 14 },
    pular: { quadros: quadrosPulo, fps: 10 },
    deslizar: { quadros: quadrosDeslize, fps: 1, alinharChao: true },
    morrer: { quadros: quadrosQueda, fps: 6, alinharChao: true },
  };

  const meta = {};
  for (const nome in defs) {
    const { quadros, fps, alinharChao } = defs[nome];
    const cx = await caixaUtil(quadros);
    const lq = Math.round(cx.width * escala);
    const aq = Math.round(cx.height * escala);

    const partes = [];
    for (let i = 0; i < quadros.length; i++) {
      partes.push({
        input: await sharp(quadros[i]).extract(cx).resize(lq, aq).png().toBuffer(),
        left: i * lq, top: 0,
      });
    }
    const arquivo = 'homem-' + nome + '.png';
    await sharp({ create: { width: lq * quadros.length, height: aq, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(partes).png({ palette: true, quality: 92, effort: 10 })
      .toFile(path.join(SAIDA, arquivo));

    meta[nome] = {
      arquivo, n: quadros.length, lq, aq, fps,
      dx: Math.round((cx.left - ancora.x) * escala),
      dy: alinharChao ? -aq : Math.round((cx.top - ancora.y) * escala),
    };
    console.log('  ' + arquivo.padEnd(24) + (fs.statSync(path.join(SAIDA, arquivo)).size / 1024).toFixed(0) + ' KB');
  }
  meta.escala = ALTURA_JOGO / ALTURA_ARQUIVO;

  fs.writeFileSync(
    path.join(RAIZ, 'js', 'assets-homem.js'),
    '/* GERADO POR ferramentas/desenhar-cavernico.js — nao edite a mao. */\n\n' +
    'const HEROI = ' + JSON.stringify(meta, null, 2) + ';\n'
  );
  console.log('\njs/assets-homem.js escrito');
}

principal();
