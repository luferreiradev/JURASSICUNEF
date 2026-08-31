/* =========================================================================
   JURASSIC UNEF — motor do jogo
   Mundo virtual fixo de 960x540 (o canvas e escalado por fora, em main.js).
   Passo fixo de 1/60s para o jogo correr igual em tela de 60Hz e de 144Hz.
   ========================================================================= */

const Jogo = (function () {

  /* ---- Mundo ------------------------------------------------------------ */
  const MUNDO_L = 960;
  const MUNDO_A = 540;
  const CHAO_Y = 450;          // linha do chao (topo dos tiles)
  const TILE = 90;             // tile de 128px do tileset reduzido para 90
  const JOGADOR_X = 150;       // o dino corre sempre nesta coluna

  const GRAV = 2400;           // px/s^2
  const V_PULO = -910;         // apice de ~172px, ~0,76s no ar
  const CORTE_PULO = 0.42;     // soltar cedo corta a subida (pulo variavel)
  const COYOTE = 0.09;         // tolerancia depois de sair da borda

  const VEL_INI = 420;
  const VEL_MAX = 980;
  const ACEL = 16;             // px/s ganhos por segundo

  // Os 8 quadros de corrida formam UMA passada completa (as duas pernas).
  // Amarrar a cadencia direto na velocidade fazia as pernas baterem 6x por
  // segundo no fim do jogo, virando borrao. Aqui ela vai de uma passada por
  // segundo na largada a duas na velocidade maxima.
  const CADENCIA_MIN = 9;      // quadros por segundo em VEL_INI
  const CADENCIA_MAX = 17;     // quadros por segundo em VEL_MAX

  const ED = DINO.escala;      // escala das spritesheets do dino
  const EC = CENARIO.escala;   // escala do tileset do deserto

  /* ---- Obstaculos -------------------------------------------------------
     distMin: distancia percorrida antes do tipo comecar a aparecer. O jogo
     abre so com pedra e cacto pequeno e vai apresentando ameacas aos poucos.
     recorte: fracao da imagem descontada da area de colisao — a arte tem
     espinhos e pontas que nao devem matar quem so raspou nelas.            */
  const TIPOS = [
    { id: 'pedra',       arte: 'pedra',       distMin: 0,    peso: 3, recorte: [0.10, 0.14] },
    { id: 'cactoGalho',  arte: 'cacto-galho', distMin: 0,    peso: 2, recorte: [0.20, 0.08] },
    { id: 'bloco',       arte: 'bloco',       distMin: 700,  peso: 2, recorte: [0.10, 0.08] },
    { id: 'cactoAlto',   arte: 'cacto-alto',  distMin: 1300, peso: 3, recorte: [0.22, 0.06] },
    { id: 'caveira',     arte: 'caveira',     distMin: 2200, peso: 2, recorte: [0.08, 0.12] },
    { id: 'saliencia',   saliencia: true,     distMin: 3200, peso: 2 },  // passa agachado
    { id: 'piche',       piche: true,         distMin: 4600, peso: 2 },  // passa pulando
  ];

  const ALTURA_VAO = 66;       // folga por baixo da saliencia
  // Nomes repetidos servem de peso: 'capim' aparece 3x mais que 'arvore'.
  const DECOR = [
    'arvore', 'arbusto', 'arbusto', 'galhos', 'galhos', 'capim', 'capim', 'capim',
    'capim-seco', 'capim-seco', 'capim-seco', 'cacto-bola', 'cacto-bola', 'placa',
  ];

  /* ---- Ciclo dia/noite ---------------------------------------------------
     Um filtro de cor multiplicado sobre a cena inteira. Como a arte do fundo
     e sempre diurna, e o tom que conta a passagem do tempo.                */
  // As transicoes sao curtas de proposito: o meio do caminho entre dia e
  // noite deixa a arte cinzenta, entao o ciclo passa rapido por ali e demora
  // nos extremos, que sao os bonitos.
  const AMBIENTE = [
    { t: 0.00, cor: [255, 255, 255], forca: 0.00, noite: 0.00 },  // dia claro
    { t: 0.42, cor: [255, 255, 255], forca: 0.00, noite: 0.00 },  // ainda dia
    { t: 0.52, cor: [255, 125,  55], forca: 0.46, noite: 0.15 },  // por do sol
    { t: 0.63, cor: [ 62,  74, 158], forca: 0.66, noite: 0.95 },  // noite
    { t: 0.86, cor: [ 78,  88, 172], forca: 0.60, noite: 1.00 },  // madrugada
    { t: 0.94, cor: [255, 165, 110], forca: 0.34, noite: 0.25 },  // amanhecer
    { t: 1.00, cor: [255, 255, 255], forca: 0.00, noite: 0.00 },
  ];
  const CICLO = 11000;   // distancia (px) de um dia completo

  /* ---- Estado ----------------------------------------------------------- */
  let ctx = null;
  const est = {
    modo: 'demo',              // 'demo' | 'jogo' | 'fim'
    distancia: 0,
    velocidade: VEL_INI,
    pontos: 0,
    ovos: 0,
    proxMarco: 250,

    py: CHAO_Y,                // y dos pes do dino
    vy: 0,
    noChao: true,
    deslizando: false,
    segurandoPulo: false,
    coyote: 0,
    animT: 0,
    tempoMorte: 0,

    obstaculos: [],
    itens: [],
    poeira: [],
    ateProxObstaculo: 900,
    ateProxItem: 700,
    t: 0,
  };

  const eventos = { aoColetar: null, aoMorrer: null, aoMarco: null };

  /* ---- Utilidades -------------------------------------------------------- */

  // Pseudo-aleatorio estavel: o mesmo indice devolve sempre o mesmo valor,
  // entao a decoracao do cenario nao "pisca" quando entra e sai da tela.
  function hash(i) {
    const s = Math.sin(i * 127.1) * 43758.5453;
    return s - Math.floor(s);
  }

  function sortearPorPeso(lista) {
    let total = 0;
    for (const x of lista) total += x.peso;
    let r = Math.random() * total;
    for (const x of lista) { r -= x.peso; if (r <= 0) return x; }
    return lista[lista.length - 1];
  }

  function medida(nome) {
    const c = CENARIO[nome];
    return { img: c.arquivo, l: c.l * EC, a: c.a * EC };
  }

  function bateu(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ---- Ciclo de vida ---------------------------------------------------- */

  function iniciar(contexto) {
    ctx = contexto;
  }

  function zerar(modo) {
    est.modo = modo;
    est.distancia = 0;
    est.velocidade = VEL_INI;
    est.pontos = 0;
    est.ovos = 0;
    est.proxMarco = 250;
    est.py = CHAO_Y;
    est.vy = 0;
    est.noChao = true;
    est.deslizando = false;
    est.segurandoPulo = false;
    est.coyote = 0;
    est.tempoMorte = 0;
    est.obstaculos.length = 0;
    est.itens.length = 0;
    est.poeira.length = 0;
    est.ateProxObstaculo = 900;   // um respiro antes do primeiro obstaculo
    est.ateProxItem = 700;
  }

  function modoDemo() { zerar('demo'); }
  function novaPartida() { zerar('jogo'); }

  /* ---- Controles -------------------------------------------------------- */

  function pular() {
    if (est.modo !== 'jogo') return;
    if (!est.noChao && est.coyote <= 0) return;
    est.deslizando = false;
    est.vy = V_PULO;
    est.noChao = false;
    est.coyote = 0;
    est.segurandoPulo = true;
    for (let i = 0; i < 8; i++) criarPoeira(JOGADOR_X, CHAO_Y);
    Som.pulo();
  }

  function soltarPulo() {
    if (est.segurandoPulo && est.vy < 0) est.vy *= CORTE_PULO;
    est.segurandoPulo = false;
  }

  function deslizar(ativo) {
    if (est.modo !== 'jogo') return;
    // O arrasto para baixo so e reconhecido uns 0,12s depois do toque, que ja
    // disparou um pulo. Um mergulho forte devolve o dino ao chao em menos de
    // 0,1s, a tempo de ele ainda passar deitado embaixo da saliencia.
    if (ativo && !est.noChao) est.vy = Math.max(est.vy + 900, 1400);
    est.deslizando = ativo;
  }

  /* ---- Geracao ----------------------------------------------------------- */

  function criarObstaculo() {
    const tipo = sortearPorPeso(TIPOS.filter((t) => est.distancia >= t.distMin));
    let o;

    if (tipo.saliencia) {
      const tiles = 2 + Math.floor(Math.random() * 2);      // 2 ou 3 tiles
      const l = TILE * tiles;
      const a = medida('saliencia-m').a;
      o = { tipo, tiles, x: MUNDO_L + 20, y: CHAO_Y - ALTURA_VAO - a, l, a };
      o.hit = { dx: 8, dy: 6, l: l - 16, a: a - 6 };
    } else if (tipo.piche) {
      // A poca e a unica coisa cuja largura a gente escolhe, entao ela precisa
      // caber num pulo. Saltando 0,30s antes da borda, ainda restam 0,46s de ar,
      // que cobrem 0,46*velocidade; tirando o corpo do dino sobra bem mais que
      // isto aqui. Ficamos bem abaixo do limite para dar margem a quem e humano.
      const l = est.velocidade * (0.20 + Math.random() * 0.07);
      o = { tipo, x: MUNDO_L + 20, y: CHAO_Y - 6, l, a: 40 };
      o.hit = { dx: 14, dy: 2, l: l - 28, a: 36 };
    } else {
      const m = medida(tipo.arte);
      o = { tipo, arte: m, x: MUNDO_L + 20, y: CHAO_Y - m.a, l: m.l, a: m.a };
      const [fx, fy] = tipo.recorte;
      o.hit = { dx: m.l * fx, dy: m.a * fy, l: m.l * (1 - fx * 2), a: m.a * (1 - fy) };
    }

    est.obstaculos.push(o);

    // O espaco ate o proximo e medido em TEMPO, nao em pixels: assim continua
    // passavel conforme a velocidade sobe. 0,95s > 0,76s de um pulo completo.
    const respiro = tipo.saliencia ? 0.35 : 0;   // sair do deslize custa tempo
    est.ateProxObstaculo = est.velocidade * (0.95 + respiro + Math.random() * 0.55) + o.l;
  }

  function criarItem() {
    const alto = Math.random() < 0.55;
    const item = {
      x: MUNDO_L + 30,
      y: CHAO_Y - (alto ? 175 : 95),
      l: 34, a: 44,
      fase: Math.random() * 6,
    };
    // Nao nasce em cima de um obstaculo: seria impossivel de pegar.
    const conflito = est.obstaculos.some((o) => item.x < o.x + o.l + 120 && item.x + item.l + 120 > o.x);
    if (!conflito) est.itens.push(item);
    est.ateProxItem = est.velocidade * (1.8 + Math.random() * 2.4);
  }

  function criarPoeira(x, y) {
    est.poeira.push({
      x: x + (Math.random() - 0.5) * 26,
      y: y - Math.random() * 6,
      vx: -60 - Math.random() * 140,
      vy: -30 - Math.random() * 90,
      r: 3 + Math.random() * 5,
      vida: 0.35 + Math.random() * 0.3,
      vidaMax: 0.65,
    });
  }

  /* ---- Colisao ----------------------------------------------------------- */

  function caixaJogador() {
    // Caixa menor que o desenho de proposito: a cauda e o focinho do dino nao
    // matam. Runner que mata por raspao passa sensacao de injustica.
    if (est.deslizando && est.noChao) {
      return { x: JOGADOR_X - 24, y: est.py - 50, w: 104, h: 50 };
    }
    return { x: JOGADOR_X - 32, y: est.py - 112, w: 68, h: 112 };
  }

  /* ---- Atualizacao -------------------------------------------------------- */

  function atualizar(dt) {
    est.t += dt;

    if (est.modo === 'fim') {
      est.tempoMorte += dt;
      atualizarPoeira(dt);
      return;
    }

    if (est.modo === 'demo') {
      // Cenario correndo atras do menu, sem obstaculos.
      est.distancia += VEL_INI * 0.6 * dt;
      est.animT += dt;
      atualizarPoeira(dt);
      return;
    }

    /* --- jogando --- */
    est.velocidade = Math.min(VEL_MAX, est.velocidade + ACEL * dt);
    const avanco = est.velocidade * dt;
    est.distancia += avanco;
    est.animT += dt;

    // Fisica vertical
    if (!est.noChao) {
      est.vy += GRAV * dt;
      est.py += est.vy * dt;
      if (est.py >= CHAO_Y) {
        est.py = CHAO_Y;
        est.vy = 0;
        est.noChao = true;
        est.segurandoPulo = false;
        for (let i = 0; i < 10; i++) criarPoeira(JOGADOR_X + 10, CHAO_Y);
      }
    } else {
      est.coyote = COYOTE;
    }
    if (est.coyote > 0) est.coyote -= dt;

    // Poeira dos passos / do deslize
    if (est.noChao && Math.random() < dt * (est.deslizando ? 55 : 22)) {
      criarPoeira(JOGADOR_X + (est.deslizando ? 40 : 0), CHAO_Y);
    }
    atualizarPoeira(dt);

    // Nascimento de obstaculos e itens
    est.ateProxObstaculo -= avanco;
    if (est.ateProxObstaculo <= 0) criarObstaculo();
    est.ateProxItem -= avanco;
    if (est.ateProxItem <= 0) criarItem();

    const eu = caixaJogador();

    for (let i = est.obstaculos.length - 1; i >= 0; i--) {
      const o = est.obstaculos[i];
      o.x -= avanco;
      if (o.x + o.l < -60) { est.obstaculos.splice(i, 1); continue; }
      const alvo = { x: o.x + o.hit.dx, y: o.y + o.hit.dy, w: o.hit.l, h: o.hit.a };
      if (bateu(eu, alvo)) { morrer(); return; }
    }

    for (let i = est.itens.length - 1; i >= 0; i--) {
      const it = est.itens[i];
      it.x -= avanco;
      if (it.x + it.l < -40) { est.itens.splice(i, 1); continue; }
      if (bateu(eu, { x: it.x, y: it.y, w: it.l, h: it.a })) {
        est.itens.splice(i, 1);
        est.ovos++;
        Som.coleta();
        if (eventos.aoColetar) eventos.aoColetar(Curiosidades.sortear());
      }
    }

    est.pontos = Math.floor(est.distancia / 40) + est.ovos * 20;
    if (est.pontos >= est.proxMarco) {
      est.proxMarco += 250;
      Som.marco();
      if (eventos.aoMarco) eventos.aoMarco(est.pontos);
    }
  }

  function atualizarPoeira(dt) {
    for (let i = est.poeira.length - 1; i >= 0; i--) {
      const p = est.poeira[i];
      p.vida -= dt;
      if (p.vida <= 0) { est.poeira.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 190 * dt;
    }
  }

  function morrer() {
    est.modo = 'fim';
    est.tempoMorte = 0;
    est.deslizando = false;
    for (let i = 0; i < 22; i++) criarPoeira(JOGADOR_X + 10, CHAO_Y);
    Som.dano();
    if (eventos.aoMorrer) eventos.aoMorrer(est.pontos, est.ovos);
  }

  /* ---- Ambiente (dia/noite) ---------------------------------------------- */

  function ambiente() {
    const t = (est.distancia % CICLO) / CICLO;
    for (let i = 0; i < AMBIENTE.length - 1; i++) {
      const a = AMBIENTE[i], b = AMBIENTE[i + 1];
      if (t >= a.t && t <= b.t) {
        const k = (t - a.t) / (b.t - a.t);
        return {
          cor: [
            a.cor[0] + (b.cor[0] - a.cor[0]) * k,
            a.cor[1] + (b.cor[1] - a.cor[1]) * k,
            a.cor[2] + (b.cor[2] - a.cor[2]) * k,
          ],
          forca: a.forca + (b.forca - a.forca) * k,
          noite: a.noite + (b.noite - a.noite) * k,
        };
      }
    }
    return AMBIENTE[0];
  }

  /* ---- Desenho ------------------------------------------------------------ */

  function desenharFundo() {
    const f = CENARIO.fundo;
    const img = Assets.img(f.arquivo);
    if (!img) return;
    const off = (est.distancia * 0.14) % f.l;
    for (let x = -off; x < MUNDO_L; x += f.l) {
      ctx.drawImage(img, Math.floor(x), 0, f.l, f.a);
    }
  }

  function desenharDecoracao() {
    const off = est.distancia * 0.55;
    const passo = 300;
    const i0 = Math.floor(off / passo) - 1;
    for (let i = i0; i <= i0 + Math.ceil(MUNDO_L / passo) + 2; i++) {
      const m = medida(DECOR[Math.floor(hash(i * 3.7) * DECOR.length)]);
      const img = Assets.img(m.img);
      if (!img) continue;
      const x = i * passo - off + hash(i * 5.3) * 180;
      // Objetos do fundo ficam um pouco menores, reforcando a profundidade.
      const k = 0.72 + hash(i * 9.1) * 0.2;
      ctx.drawImage(img, x, CHAO_Y + 6 - m.a * k, m.l * k, m.a * k);
    }
  }

  function desenharChao() {
    // Um unico tile repetido: a crista de areia do tile 2 so encaixa com ela
    // mesma. Misturar variantes abria degraus visiveis a cada 90px.
    const img = Assets.img(CENARIO['chao-topo'].arquivo);
    if (!img) return;
    const off = est.distancia % TILE;
    for (let n = 0; n <= Math.ceil(MUNDO_L / TILE) + 1; n++) {
      // +1 de largura cobre a fresta que o arredondamento deixaria entre tiles.
      ctx.drawImage(img, Math.floor(n * TILE - off), CHAO_Y, TILE + 1, TILE);
    }
  }

  function desenharPiche(o) {
    const x = o.x, l = o.l;
    ctx.save();
    // Poca de piche: escurece o chao e borbulha. Referencia aos pocos de
    // piche onde muitos fosseis foram encontrados.
    ctx.fillStyle = '#241a12';
    ctx.beginPath();
    ctx.ellipse(x + l / 2, CHAO_Y + 16, l / 2, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e0a08';
    ctx.beginPath();
    ctx.ellipse(x + l / 2, CHAO_Y + 14, l / 2 - 9, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const fx = x + 26 + ((i * 47) % Math.max(1, l - 52));
      const s = (Math.sin(est.t * 2.4 + i * 1.9) + 1) / 2;
      ctx.fillStyle = 'rgba(90,72,52,' + (0.25 + s * 0.5).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(fx, CHAO_Y + 12 - s * 5, 3 + s * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function desenharSaliencia(o) {
    const e = Assets.img(CENARIO['saliencia-e'].arquivo);
    const m = Assets.img(CENARIO['saliencia-m'].arquivo);
    const d = Assets.img(CENARIO['saliencia-d'].arquivo);
    for (let i = 0; i < o.tiles; i++) {
      const img = i === 0 ? e : (i === o.tiles - 1 ? d : m);
      if (img) ctx.drawImage(img, Math.floor(o.x + i * TILE), o.y, TILE, o.a);
    }
  }

  // Ovo de dinossauro desenhado a mao no canvas: o pacote gratuito nao tem
  // item colecionavel, e um ovo combina melhor com o tema do que uma caixa.
  function desenharOvo(x, y) {
    ctx.save();
    ctx.translate(x + 17, y + 22);
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 21, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f7ead0';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3b2a1a';
    ctx.stroke();
    ctx.fillStyle = '#c9a26b';
    const manchas = [[-5, 5, 4.5, 3.4, 0.4], [6, -4, 3.6, 2.8, -0.3], [1, 12, 3.2, 2.2, 0.2], [-7, -6, 2.6, 2.0, 0.1]];
    for (const [mx, my, rx, ry, rot] of manchas) {
      ctx.beginPath();
      ctx.ellipse(mx, my, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(-5, -10, 3.4, 5.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function desenharDino() {
    let anim, quadro;
    if (est.modo === 'fim') {
      anim = DINO.morrer;
      quadro = Math.min(anim.n - 1, Math.floor(est.tempoMorte * anim.fps));
    } else if (est.deslizando && est.noChao) {
      anim = DINO.deslizar;
      quadro = 0;
    } else if (!est.noChao) {
      anim = DINO.pular;
      // O pulo nao fica em loop: mapeia a altura atual para o quadro certo,
      // entao a pose acompanha a subida e a descida.
      const prog = Math.min(1, Math.max(0, (CHAO_Y - est.py) / 140));
      const subindo = est.vy < 0;
      quadro = subindo
        ? Math.min(anim.n - 1, Math.round(prog * (anim.n - 1)))
        : Math.min(anim.n - 1, Math.round((anim.n - 1) * (0.55 + (1 - prog) * 0.45)));
    } else {
      anim = DINO.correr;
      const k = (est.velocidade - VEL_INI) / (VEL_MAX - VEL_INI);
      const fps = CADENCIA_MIN + (CADENCIA_MAX - CADENCIA_MIN) * k;
      quadro = Math.floor(est.animT * fps) % anim.n;
    }

    const img = Assets.img(anim.arquivo);
    if (!img) return;

    // Sombra: encolhe conforme o dino sobe, dando nocao de altura.
    const altura = CHAO_Y - est.py;
    const k = Math.max(0.3, 1 - altura / 260);
    ctx.save();
    ctx.globalAlpha = 0.13 * k;
    ctx.fillStyle = '#5a3d1c';
    ctx.beginPath();
    ctx.ellipse(JOGADOR_X + 6, CHAO_Y + 5, 52 * k, 7 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(
      img,
      quadro * anim.lq, 0, anim.lq, anim.aq,
      JOGADOR_X + anim.dx * ED, est.py + anim.dy * ED,
      anim.lq * ED, anim.aq * ED
    );
  }

  function desenharPoeira() {
    for (const p of est.poeira) {
      ctx.globalAlpha = Math.min(1, p.vida / p.vidaMax) * 0.5;
      ctx.fillStyle = '#d8b483';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function desenharEstrelas(forca) {
    if (forca <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = forca;
    ctx.fillStyle = '#fffbe8';
    for (let i = 0; i < 60; i++) {
      const x = hash(i * 2.1) * MUNDO_L;
      const y = hash(i * 5.7) * 300;
      const cintila = 0.6 + Math.sin(est.t * 2 + i) * 0.4;
      ctx.globalAlpha = forca * cintila;
      const r = 1 + hash(i * 8.3) * 1.6;
      ctx.fillRect(x, y, r, r);
    }
    ctx.restore();
  }

  function desenhar() {
    const amb = ambiente();

    desenharFundo();
    desenharEstrelas(amb.noite * 0.9);
    desenharDecoracao();
    desenharChao();

    // Piche fica no chao, entao vai antes de tudo que anda por cima.
    for (const o of est.obstaculos) if (o.tipo.piche) desenharPiche(o);

    desenharPoeira();

    for (const o of est.obstaculos) {
      if (o.tipo.piche) continue;
      if (o.tipo.saliencia) { desenharSaliencia(o); continue; }
      const img = Assets.img(o.arte.img);
      if (img) ctx.drawImage(img, o.x, o.y, o.l, o.a);
    }

    for (const it of est.itens) {
      const flutua = Math.sin(est.t * 3 + it.fase) * 6;
      desenharOvo(it.x, it.y + flutua);
    }

    desenharDino();

    // Filtro de cor do horario. Multiply preserva as formas e so muda o tom.
    if (amb.forca > 0.01) {
      const [r, g, b] = amb.cor;
      const f = amb.forca;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(' +
        Math.round(255 - (255 - r) * f) + ',' +
        Math.round(255 - (255 - g) * f) + ',' +
        Math.round(255 - (255 - b) * f) + ')';
      ctx.fillRect(0, 0, MUNDO_L, MUNDO_A);
      ctx.restore();
    }
  }

  /* ---- API ---------------------------------------------------------------- */

  return {
    MUNDO_L, MUNDO_A,
    iniciar, modoDemo, novaPartida, atualizar, desenhar,
    pular, soltarPulo, deslizar,
    get pontos() { return est.pontos; },
    get ovos() { return est.ovos; },
    get modo() { return est.modo; },
    // Espelho somente-leitura do estado interno. Serve para
    // ferramentas/teste-jogabilidade.js simular partidas fora do navegador;
    // o jogo em si nunca le daqui.
    get depuracao() {
      return {
        py: est.py, noChao: est.noChao, deslizando: est.deslizando,
        velocidade: est.velocidade, distancia: est.distancia,
        obstaculos: est.obstaculos, itens: est.itens,
      };
    },
    on(nome, fn) { eventos[nome] = fn; },
  };
})();
