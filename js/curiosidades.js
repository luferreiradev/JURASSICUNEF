/* =========================================================================
   JURASSIC UNEF — curiosidades sobre a Era Primitiva
   Aparecem em toast ao coletar um item e na tela de fim de partida.
   Textos curtos de proposito: precisam ser lidos sem parar o jogo.
   ========================================================================= */

const CURIOSIDADES = [
  {
    titulo: 'O domínio do fogo',
    texto: 'Há cerca de 400 mil anos o ser humano aprendeu a controlar o fogo. Ele aqueceu, afastou predadores e permitiu cozinhar — o que tornou os alimentos mais fáceis de digerir.',
  },
  {
    titulo: 'Pedra lascada',
    texto: 'O Paleolítico é chamado de "Idade da Pedra Lascada": as ferramentas eram feitas batendo uma pedra na outra até formar um gume cortante.',
  },
  {
    titulo: 'Pinturas rupestres',
    texto: 'Nas cavernas de Lascaux, na França, há pinturas de mais de 17 mil anos feitas com carvão e óxido de ferro. São um dos registros mais antigos de arte da humanidade.',
  },
  {
    titulo: 'Nômades',
    texto: 'Os grupos primitivos não tinham moradia fixa: seguiam os rebanhos de animais e a maturação dos frutos, montando acampamentos temporários.',
  },
  {
    titulo: 'Caça e coleta',
    texto: 'A sobrevivência dependia de caçar, pescar e coletar raízes, sementes e frutos. Tudo era dividido entre o grupo — não existia propriedade individual.',
  },
  {
    titulo: 'Megafauna',
    texto: 'Mamutes, tigres-dente-de-sabre e preguiças-gigantes conviveram com os primeiros humanos. A maioria foi extinta no fim da última Era do Gelo.',
  },
  {
    titulo: 'Revolução Neolítica',
    texto: 'Há cerca de 10 mil anos surgiram a agricultura e a criação de animais. Com comida garantida no mesmo lugar, nasceram as primeiras aldeias fixas.',
  },
  {
    titulo: 'A roda',
    texto: 'A roda só apareceu por volta de 3500 a.C., na Mesopotâmia — muito depois do fogo e da agricultura. Primeiro serviu para moldar cerâmica, e só depois para transporte.',
  },
  {
    titulo: 'Dinossauros e humanos',
    texto: 'Ao contrário do que os desenhos mostram, humanos e dinossauros nunca se encontraram: 65 milhões de anos separam a extinção dos dinossauros do surgimento do gênero Homo.',
  },
  {
    titulo: 'Homo sapiens',
    texto: 'Nossa espécie surgiu na África há cerca de 300 mil anos e conviveu com outras espécies humanas, como os neandertais, por milhares de anos.',
  },
  {
    titulo: 'Ossos como ferramenta',
    texto: 'Ossos, chifres e presas viravam agulhas, anzóis e pontas de lança. Nada do animal caçado era desperdiçado.',
  },
  {
    titulo: 'A linguagem',
    texto: 'A fala complexa foi decisiva: permitiu combinar estratégias de caça e transmitir conhecimento de uma geração para outra sem precisar da escrita.',
  },
  {
    titulo: 'Idade dos Metais',
    texto: 'Depois da pedra polida, o ser humano aprendeu a fundir cobre, bronze e ferro. Ferramentas mais resistentes mudaram a agricultura e a guerra.',
  },
  {
    titulo: 'Sepultamentos',
    texto: 'Túmulos com flores, ferramentas e pigmentos mostram que grupos primitivos já tinham rituais e algum tipo de crença sobre a morte.',
  },
];

// Sorteia sem repetir enquanto ainda houver curiosidades nao mostradas.
const Curiosidades = (function () {
  let baralho = [];

  function embaralhar() {
    baralho = CURIOSIDADES.slice();
    for (let i = baralho.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
    }
  }

  return {
    sortear() {
      if (baralho.length === 0) embaralhar();
      return baralho.pop();
    },
    total: CURIOSIDADES.length,
  };
})();
