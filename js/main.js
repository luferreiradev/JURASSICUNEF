/* =========================================================================
   JURASSIC UNEF — telas, controles e laco principal
   ========================================================================= */

(function () {
  const CHAVE_RECORDE = 'jurassic_unef_recorde';
  const PASSO = 1 / 60;              // passo fixo da simulacao
  const ESPERA_FIM = 0.9;            // deixa a animacao de morte rodar antes da tela
  const TEMPO_TOAST = 5200;

  const $ = (id) => document.getElementById(id);

  const canvas = $('tela');
  const ctx = canvas.getContext('2d');
  const palco = $('palco');

  const telas = {
    carregando: $('carregando'),
    menu: $('menu'),
    fim: $('fim'),
    sobre: $('sobre'),
  };

  let estado = 'carregando';         // carregando | menu | jogo | fim | sobre
  let recorde = parseInt(localStorage.getItem(CHAVE_RECORDE) || '0', 10) || 0;
  let liberaFimEm = 0;               // instante a partir do qual pode reiniciar
  let timerToast = null;

  /* ---- Escala ------------------------------------------------------------
     O mundo do jogo tem sempre 960x540. Aqui so decidimos de que tamanho ele
     aparece na tela e quantos pixels reais o canvas usa (para ficar nitido em
     telas retina). O jogo em si nunca precisa saber disso.

     A interface tem escala propria (--ui). Se ela seguisse a do canvas, um
     celular em pe (canvas de ~230px de altura) mostraria as curiosidades com
     6px de fonte. O piso de 0.85 garante texto legivel; o teto de 1.7 evita
     que num monitor grande a interface fique gigante.                       */

  const UI_MIN = 0.85;
  const UI_MAX = 1.7;

  function redimensionar() {
    const escala = Math.min(window.innerWidth / Jogo.MUNDO_L, window.innerHeight / Jogo.MUNDO_A);
    const larg = Math.round(Jogo.MUNDO_L * escala);
    const alt = Math.round(Jogo.MUNDO_A * escala);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    palco.style.width = larg + 'px';
    palco.style.height = alt + 'px';

    canvas.style.width = larg + 'px';
    canvas.style.height = alt + 'px';
    canvas.width = Math.round(larg * dpr);
    canvas.height = Math.round(alt * dpr);
    ctx.setTransform(canvas.width / Jogo.MUNDO_L, 0, 0, canvas.height / Jogo.MUNDO_A, 0, 0);

    const ui = Math.min(UI_MAX, Math.max(UI_MIN, escala));
    document.documentElement.style.setProperty('--ui', ui);

    const retrato = window.innerHeight > window.innerWidth;
    $('girar').classList.toggle('oculto', !retrato);
  }

  /* ---- Navegacao entre telas ---------------------------------------------- */

  function irPara(novo) {
    estado = novo;
    for (const nome in telas) telas[nome].classList.toggle('oculto', nome !== novo);
    $('hud').classList.toggle('oculto', novo !== 'jogo');
    if (novo !== 'jogo') esconderToast();
  }

  function comecarPartida() {
    Som.destravar();
    esconderToast();
    Jogo.novaPartida();
    $('pontos').textContent = '0';
    $('ovos').textContent = '0';
    $('recorde').textContent = recorde;
    irPara('jogo');
  }

  function irParaMenu() {
    Jogo.modoDemo();
    irPara('menu');
  }

  /* ---- Curiosidades -------------------------------------------------------- */

  function mostrarToast(fato) {
    const el = $('toast');
    $('toastTitulo').textContent = fato.titulo;
    $('toastTexto').textContent = fato.texto;
    el.classList.remove('oculto', 'saindo');
    // reinicia a animacao de entrada mesmo se ja estava visivel
    void el.offsetWidth;
    clearTimeout(timerToast);
    timerToast = setTimeout(() => {
      el.classList.add('saindo');
      timerToast = setTimeout(() => el.classList.add('oculto'), 400);
    }, TEMPO_TOAST);
  }

  function esconderToast() {
    clearTimeout(timerToast);
    $('toast').classList.add('oculto');
  }

  /* ---- Eventos do jogo ------------------------------------------------------ */

  Jogo.on('aoColetar', (fato) => {
    $('ovos').textContent = Jogo.ovos;
    mostrarToast(fato);
  });

  Jogo.on('aoMarco', () => {
    const el = $('pontos');
    el.classList.remove('marco');
    void el.offsetWidth;
    el.classList.add('marco');
  });

  function podeReiniciar() { return performance.now() >= liberaFimEm; }

  Jogo.on('aoMorrer', (pontos, ovos) => {
    // A tela de fim espera a animacao de morte terminar. Isso e ritmo de
    // interface, nao simulacao, entao mora num timer e nao no laco de render:
    // se a aba estiver em segundo plano o rAF para, mas o timer nao.
    liberaFimEm = performance.now() + ESPERA_FIM * 1000;
    setTimeout(() => { if (Jogo.modo === 'fim' && estado === 'jogo') irPara('fim'); }, ESPERA_FIM * 1000);
    const novoRecorde = pontos > recorde;
    if (novoRecorde) {
      recorde = pontos;
      try { localStorage.setItem(CHAVE_RECORDE, String(recorde)); } catch (e) { /* modo anonimo */ }
    }
    const fato = Curiosidades.sortear();
    $('fimPontos').textContent = pontos;
    $('fimRecorde').textContent = recorde;
    $('fimOvos').textContent = ovos;
    $('fimTitulo').textContent = fato.titulo;
    $('fimTexto').textContent = fato.texto;
    document.querySelector('#fim .titulo-fim').textContent = novoRecorde ? 'NOVO RECORDE!' : 'FIM DE JOGO';
  });

  /* ---- Controles ------------------------------------------------------------ */

  function acaoPrincipal() {
    Som.destravar();
    if (estado === 'menu') comecarPartida();
    else if (estado === 'jogo') Jogo.pular();
    else if (estado === 'fim' && podeReiniciar()) comecarPartida();
  }

  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      acaoPrincipal();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      Jogo.deslizar(true);
    } else if (e.code === 'Escape' && estado === 'sobre') {
      irParaMenu();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') Jogo.soltarPulo();
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') Jogo.deslizar(false);
  });

  // Toque / mouse: o terco de baixo da JANELA desliza, o resto pula. Medir na
  // janela e nao no canvas importa em retrato, onde o canvas e so uma faixa no
  // meio e o polegar cai fora dele.
  document.body.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;   // deixa os botoes funcionarem
    e.preventDefault();
    const rel = e.clientY / window.innerHeight;
    if (estado === 'jogo' && rel > 0.66) Jogo.deslizar(true);
    else acaoPrincipal();
  });

  function soltarTudo() {
    Jogo.soltarPulo();
    Jogo.deslizar(false);
  }
  document.body.addEventListener('pointerup', soltarTudo);
  document.body.addEventListener('pointercancel', soltarTudo);
  // Sem isso o navegador mobile abre o menu de "copiar imagem" num toque longo.
  document.body.addEventListener('contextmenu', (e) => e.preventDefault());

  $('btJogar').addEventListener('click', comecarPartida);
  $('btDeNovo').addEventListener('click', () => { if (podeReiniciar()) comecarPartida(); });
  $('btSobre').addEventListener('click', () => irPara('sobre'));
  $('btSobre2').addEventListener('click', () => irPara('sobre'));
  $('btVoltar').addEventListener('click', irParaMenu);

  $('btSom').addEventListener('click', (e) => {
    e.stopPropagation();
    const mudo = Som.alternarMudo();
    e.currentTarget.textContent = mudo ? '🔇' : '🔊';
  });

  window.addEventListener('resize', redimensionar);
  window.addEventListener('orientationchange', () => setTimeout(redimensionar, 120));

  /* ---- Laco principal --------------------------------------------------------
     Passo fixo: por mais que o navegador entregue quadros a 60, 90 ou 144 Hz,
     a fisica sempre avanca de 1/60s em 1/60s. Sem isso o jogo ficaria mais
     dificil em telas rapidas.                                                */

  let ultimo = 0;
  let acumulado = 0;

  function quadro(agora) {
    requestAnimationFrame(quadro);
    if (!ultimo) ultimo = agora;
    let dt = (agora - ultimo) / 1000;
    ultimo = agora;
    if (dt > 0.25) dt = 0.25;        // voltou de segundo plano: nao teleporta

    acumulado += dt;
    let voltas = 0;
    while (acumulado >= PASSO && voltas < 6) {
      Jogo.atualizar(PASSO);
      acumulado -= PASSO;
      voltas++;
    }
    if (acumulado > PASSO * 6) acumulado = 0;

    if (estado === 'jogo') {
      const p = Jogo.pontos;
      if ($('pontos').textContent !== String(p)) $('pontos').textContent = p;
    }

    Jogo.desenhar();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    ultimo = 0;                      // recomeca a contagem de tempo
    acumulado = 0;
  });

  /* ---- Partida ------------------------------------------------------------- */

  redimensionar();
  Jogo.iniciar(ctx);
  Jogo.modoDemo();
  $('btSom').textContent = Som.estaMudo() ? '🔇' : '🔊';
  $('recorde').textContent = recorde;

  Assets.carregar((p) => { $('progresso').style.width = Math.round(p * 100) + '%'; })
    .then(() => {
      requestAnimationFrame(quadro);
      // Um respiro curto para a barra chegar visualmente aos 100%.
      setTimeout(irParaMenu, 260);
    });
})();
