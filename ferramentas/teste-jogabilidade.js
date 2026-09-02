/* =========================================================================
   JURASSIC UNEF — teste automatico de jogabilidade
   ---------------------------------------------------------------------------
   Carrega js/game.js fora do navegador (com dublês para audio, imagens e
   curiosidades) e deixa um robo jogar varias partidas longas.

   O que isso prova, e que olhar screenshot nao prova:
     - todo obstaculo continua passavel conforme a velocidade sobe ate o teto;
     - o espaco entre obstaculos nunca fica menor que um pulo completo;
     - a saliencia da tempo de deslizar pelos DOIS caminhos de entrada:
       a seta do teclado (deslize direto) e o toque do celular, onde o dedo
       primeiro dispara um pulo e so depois o arrasto vira mergulho.

   O segundo caso e o que mais importa: no celular nao da para deslizar sem
   antes pular, entao o robo precisa passar pelo mesmo caminho torto que o
   jogador passa.

   Rodar:  node ferramentas/teste-jogabilidade.js
   ========================================================================= */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

/* ---- Carrega os modulos do jogo -----------------------------------------
   Os arquivos declaram `const X = ...` no topo, entao envolvemos cada um
   numa funcao e devolvemos o que interessa.                               */

const { CHEFE, CENARIO } = new Function(ler('js/assets-dados.js') + '\n; return { CHEFE, CENARIO };')();
const { HEROI } = new Function(ler('js/assets-homem.js') + '\n; return { HEROI };')();

const Som = { destravar() {}, pulo() {}, ataque() {}, impacto() {}, coleta() {}, dano() {}, marco() {} };
const Curiosidades = { sortear: () => ({ titulo: '', texto: '' }) };
const Assets = { img: () => null };
const CenarioVulcanico = { atualizar() {}, impacto() {}, desenharFundo() {}, desenharFrente() {} };

const Jogo = new Function(
  'HEROI', 'CHEFE', 'CENARIO', 'Som', 'Curiosidades', 'Assets', 'CenarioVulcanico',
  ler('js/game.js') + '\n; return Jogo;'
)(HEROI, CHEFE, CENARIO, Som, Curiosidades, Assets, CenarioVulcanico);

/* ---- O robo --------------------------------------------------------------
   Joga so com o que um jogador ve: posicao e largura do que vem pela frente.
   Nao trapaceia lendo o futuro do gerador de obstaculos.                   */

const PASSO = 1 / 60;
const JOGADOR_X = 150;
const FRENTE = JOGADOR_X + 34;      // ponta da caixa de colisao do dino

// O pulo dura ~0,76s e o apice fica na metade. Saltar ~0,30s antes poe o dino
// no alto exatamente na hora de passar pelo obstaculo.
const ANTECEDENCIA_PULO = 0.30;

// Teclado: a seta desliza na hora.
const ANTECEDENCIA_DESLIZE_TECLADO = 0.16;

// Toque: o dedo encosta (pula), e so ~0,12s depois o arrasto e reconhecido e
// vira mergulho. Somando a queda, sao ~0,19s ate o dino estar deitado no chao,
// entao o gesto precisa comecar bem mais cedo.
const ANTECEDENCIA_DESLIZE_TOQUE = 0.34;
const ATRASO_DO_ARRASTE = 7;        // passos de 1/60s entre o toque e o arrasto

function proximoObstaculo(d) {
  let melhor = null;
  for (const o of d.obstaculos) {
    if (o.x + o.l < JOGADOR_X - 30) continue;      // ja passou
    if (!melhor || o.x < melhor.x) melhor = o;
  }
  return melhor;
}

function jogarPartida(segundos, semente, modo) {
  // Torna o teste reproduzivel: sem isso duas execucoes divergem e um erro
  // raro aparece hoje e some amanha.
  let s = semente;
  Math.random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const porToque = modo === 'toque';
  const antecedenciaDeslize = porToque ? ANTECEDENCIA_DESLIZE_TOQUE : ANTECEDENCIA_DESLIZE_TECLADO;

  Jogo.novaPartida();
  let deslizando = false;
  let arrastePendente = 0;          // > 0 = dedo encostado, arrasto a caminho
  let pulos = 0;
  let deslizes = 0;

  const passos = Math.round(segundos / PASSO);

  for (let i = 0; i < passos; i++) {
    const d = Jogo.depuracao;
    const o = proximoObstaculo(d);

    // O arrasto chega alguns quadros depois do toque, como no celular.
    if (arrastePendente > 0 && --arrastePendente === 0) {
      Jogo.deslizar(true);
      deslizando = true;
      deslizes++;
    }

    if (o) {
      const distancia = o.x - FRENTE;
      const tempo = distancia / d.velocidade;

      if (o.tipo.saliencia) {
        if (!deslizando && !arrastePendente && tempo <= antecedenciaDeslize && distancia > -40) {
          if (porToque) {
            Jogo.pular();             // o dedo encostando ja dispara o pulo
            pulos++;
            arrastePendente = ATRASO_DO_ARRASTE;
          } else {
            Jogo.deslizar(true);
            deslizando = true;
            deslizes++;
          }
        }
      } else if (d.noChao && tempo <= ANTECEDENCIA_PULO && tempo > 0) {
        if (deslizando) { Jogo.deslizar(false); deslizando = false; }
        Jogo.pular();
        pulos++;
      }

      // Sai do deslize assim que a saliencia acabou de passar.
      if (deslizando && !(o.tipo.saliencia && o.x + o.l > JOGADOR_X - 20)) {
        Jogo.deslizar(false); deslizando = false;
      }
    } else if (deslizando) {
      Jogo.deslizar(false); deslizando = false;
    }

    Jogo.atualizar(PASSO);

    if (Jogo.modo === 'fim') {
      const dd = Jogo.depuracao;
      const culpado = proximoObstaculo(dd);
      return {
        ok: false,
        segundos: (i * PASSO).toFixed(1),
        pontos: Jogo.pontos,
        velocidade: Math.round(dd.velocidade),
        obstaculo: culpado ? culpado.tipo.id : '?',
        pulos, deslizes,
      };
    }
  }

  const d = Jogo.depuracao;
  return {
    ok: true,
    segundos: segundos.toFixed(1),
    pontos: Jogo.pontos,
    velocidade: Math.round(d.velocidade),
    pulos, deslizes,
  };
}

/* ---- Execucao ------------------------------------------------------------ */

const DURACAO = 180;          // 3 minutos de jogo por partida
const PARTIDAS = 10;
const MODOS = [
  ['teclado', 'seta para baixo desliza na hora'],
  ['toque', 'dedo encosta (pula) e so depois arrasta'],
];

console.log('JURASSIC UNEF — teste de jogabilidade');
console.log(`${PARTIDAS} partidas de ${DURACAO}s em cada modo de controle\n`);

let falhas = 0;
const originalRandom = Math.random;

for (const [modo, descricao] of MODOS) {
  console.log(`[${modo}] ${descricao}`);
  for (let p = 0; p < PARTIDAS; p++) {
    const r = jogarPartida(DURACAO, 1000 + p * 7919, modo);
    Math.random = originalRandom;
    console.log(
      `  ${r.ok ? 'ok  ' : 'FALHA'} partida ${String(p + 1).padStart(2)}  ` +
      `${String(r.segundos).padStart(5)}s  ` +
      `${String(r.pontos).padStart(5)} pts  ` +
      `vel ${String(r.velocidade).padStart(3)}  ` +
      `${String(r.pulos).padStart(3)} pulos  ${String(r.deslizes).padStart(2)} deslizes` +
      (r.ok ? '' : `  <- morreu em "${r.obstaculo}"`)
    );
    if (!r.ok) falhas++;
  }
  console.log('');
}

// A nova animacao de ataque precisa ter efeito de jogo: durante a janela do
// tacape, um obstaculo comum a frente deve ser removido sem matar o jogador.
Jogo.novaPartida();
Jogo.depuracao.obstaculos.push({
  tipo: { id: 'alvo-teste' },
  x: JOGADOR_X + 250, y: 390, l: 40, a: 60,
  hit: { dx: 0, dy: 0, l: 40, a: 60 },
});
Jogo.atacar();
for (let i = 0; i < 36 && Jogo.modo === 'jogo'; i++) Jogo.atualizar(PASSO);
const ataqueOk = Jogo.modo === 'jogo' && Jogo.depuracao.obstaculos.length === 0;
console.log(`[ataque] ${ataqueOk ? 'ok   tacape destruiu o obstaculo' : 'FALHA no alcance/janela do tacape'}\n`);
if (!ataqueOk) falhas++;

if (falhas === 0) {
  console.log(`TUDO CERTO: o robo sobreviveu ${PARTIDAS * MODOS.length} partidas inteiras,`);
  console.log('nos dois modos de controle, ate a velocidade maxima.');
} else {
  console.log(`${falhas} de ${PARTIDAS * MODOS.length} partidas terminaram em morte.`);
  console.log('Isso indica espacamento curto demais, obstaculo alto demais,');
  console.log('ou tempo insuficiente para o gesto de deslize.');
  process.exitCode = 1;
}
