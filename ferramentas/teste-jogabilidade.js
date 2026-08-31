/* =========================================================================
   JURASSIC UNEF — teste automatico de jogabilidade
   ---------------------------------------------------------------------------
   Carrega js/game.js fora do navegador (com dublês para audio, imagens e
   curiosidades) e deixa um robo jogar varias partidas longas.

   O que isso prova, e que olhar screenshot nao prova:
     - todo obstaculo continua passavel conforme a velocidade sobe ate o teto;
     - o espaco entre obstaculos nunca fica menor que um pulo completo;
     - a saliencia sempre da tempo de agachar e voltar a correr.

   Rodar:  node ferramentas/teste-jogabilidade.js
   ========================================================================= */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

/* ---- Carrega os modulos do jogo -----------------------------------------
   Os arquivos declaram `const X = ...` no topo, entao envolvemos cada um
   numa funcao e devolvemos o que interessa.                               */

const { DINO, CENARIO } = new Function(ler('js/assets-dados.js') + '\n; return { DINO, CENARIO };')();

const Som = { destravar() {}, pulo() {}, coleta() {}, dano() {}, marco() {} };
const Curiosidades = { sortear: () => ({ titulo: '', texto: '' }) };
const Assets = { img: () => null };

const Jogo = new Function(
  'DINO', 'CENARIO', 'Som', 'Curiosidades', 'Assets',
  ler('js/game.js') + '\n; return Jogo;'
)(DINO, CENARIO, Som, Curiosidades, Assets);

/* ---- O robo --------------------------------------------------------------
   Joga so com o que um jogador ve: posicao e largura do que vem pela frente.
   Nao trapaceia lendo o futuro do gerador de obstaculos.                   */

const PASSO = 1 / 60;
const JOGADOR_X = 150;
const FRENTE = JOGADOR_X + 34;      // ponta da caixa de colisao do dino

// Antecedencia do pulo, em segundos. O pulo dura ~0,68s e o apice fica na
// metade; saltar ~0,26s antes poe o dino no alto bem na hora do obstaculo.
const ANTECEDENCIA_PULO = 0.26;
const ANTECEDENCIA_DESLIZE = 0.16;

function proximoObstaculo(d) {
  let melhor = null;
  for (const o of d.obstaculos) {
    if (o.x + o.l < JOGADOR_X - 30) continue;      // ja passou
    if (!melhor || o.x < melhor.x) melhor = o;
  }
  return melhor;
}

function jogarPartida(segundos, semente) {
  // Torna o teste reproduzivel: sem isso duas execucoes divergem e um erro
  // raro aparece hoje e some amanha.
  let s = semente;
  Math.random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  Jogo.novaPartida();
  let deslizando = false;
  let passos = Math.round(segundos / PASSO);
  let pulos = 0;
  let deslizes = 0;

  for (let i = 0; i < passos; i++) {
    const d = Jogo.depuracao;
    const o = proximoObstaculo(d);

    if (o) {
      const distancia = o.x - FRENTE;
      const tempo = distancia / d.velocidade;

      if (o.tipo.saliencia) {
        if (!deslizando && tempo <= ANTECEDENCIA_DESLIZE && distancia > -40) {
          Jogo.deslizar(true); deslizando = true; deslizes++;
        }
      } else if (d.noChao && tempo <= ANTECEDENCIA_PULO && tempo > 0) {
        if (deslizando) { Jogo.deslizar(false); deslizando = false; }
        Jogo.pular(); pulos++;
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
        distancia: Math.round(dd.distancia),
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
    distancia: Math.round(d.distancia),
    pulos, deslizes,
  };
}

/* ---- Execucao ------------------------------------------------------------ */

const DURACAO = 180;          // 3 minutos de jogo por partida
const PARTIDAS = 12;

console.log('JURASSIC UNEF — teste de jogabilidade');
console.log(`${PARTIDAS} partidas de ${DURACAO}s, robo jogando com pulo e deslize\n`);

let falhas = 0;
const originalRandom = Math.random;

for (let p = 0; p < PARTIDAS; p++) {
  const r = jogarPartida(DURACAO, 1000 + p * 7919);
  Math.random = originalRandom;
  const marca = r.ok ? 'ok  ' : 'FALHA';
  console.log(
    `  ${marca} partida ${String(p + 1).padStart(2)}  ` +
    `${String(r.segundos).padStart(5)}s  ` +
    `${String(r.pontos).padStart(5)} pts  ` +
    `vel ${String(r.velocidade).padStart(3)}  ` +
    `${String(r.pulos).padStart(3)} pulos  ${String(r.deslizes).padStart(2)} deslizes` +
    (r.ok ? '' : `  <- morreu em "${r.obstaculo}"`)
  );
  if (!r.ok) falhas++;
}

console.log('');
if (falhas === 0) {
  console.log(`TUDO CERTO: o robo sobreviveu ${PARTIDAS} partidas inteiras.`);
  console.log('Nenhum obstaculo impossivel foi gerado ate a velocidade maxima.');
} else {
  console.log(`${falhas} de ${PARTIDAS} partidas terminaram em morte.`);
  console.log('Isso indica espacamento curto demais ou obstaculo alto demais.');
  process.exitCode = 1;
}
