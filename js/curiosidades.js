/* =========================================================================
   JURASSIC UNEF — curiosidades sobre a Era Primitiva
   Aparecem em toast ao coletar um item e na galeria de curiosidades.
   Textos curtos de proposito: precisam ser lidos sem parar o jogo.
   ========================================================================= */

const CURIOSIDADES = [
  {
    titulo: 'Não existia português, inglês ou espanhol... nem corretor automático!',
    texto: 'Gestos e sons ainda não tinham uma gramática fixa como as línguas atuais.',
  },
  {
    titulo: 'Mão na parede não é decoração moderna',
    texto: 'A Cueva de las Manos, na Argentina, possui contornos de mãos e cenas de caça.',
  },
  {
    titulo: 'Já pensou que registrar uma mensagem mudou tudo?',
    texto: 'Preservar informações fora do corpo abriu caminho para registros mais complexos e, depois, para a escrita.',
  },
  {
    titulo: 'Pintura rupestre é escrita? Calma lá!',
    texto: 'Nem toda imagem rupestre pode ser considerada escrita.',
  },
  {
    titulo: 'O que aparecia nas pinturas? Não era só animal!',
    texto: 'Havia animais, figuras humanas, mãos, cenas de caça e formas geométricas.',
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
    todos() {
      return CURIOSIDADES.slice();
    },
    total: CURIOSIDADES.length,
  };
})();
