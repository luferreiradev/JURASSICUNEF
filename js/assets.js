/* =========================================================================
   JURASSIC UNEF — carregamento das imagens
   Le a lista de arquivos direto dos metadados gerados (js/assets-dados.js e
   js/assets-homem.js), entao nao existe lista duplicada para esquecer de
   atualizar quando uma animacao nova aparece.
   ========================================================================= */

const Assets = (function () {
  const imagens = {};
  let prontas = 0;
  let total = 0;

  function arquivos() {
    const lista = [CHEFE.arquivo];
    // Os metadados tambem trazem numeros soltos (escala, janela do golpe):
    // so entra na fila quem realmente aponta para um arquivo.
    for (const nome in HEROI) if (HEROI[nome] && HEROI[nome].arquivo) lista.push(HEROI[nome].arquivo);
    for (const nome in CENARIO) if (CENARIO[nome] && CENARIO[nome].arquivo) lista.push(CENARIO[nome].arquivo);
    // Varios estados dividem a mesma folha (parado, deslizar e morrer saem da
    // folha do deslize). Evita baixar a mesma imagem uma vez para cada estado.
    return [...new Set(lista)];
  }

  function carregar(aoProgresso) {
    const lista = arquivos();
    total = lista.length;
    prontas = 0;
    return Promise.all(lista.map((arq) => new Promise((resolver) => {
      const img = new Image();
      // Mesmo se uma imagem falhar seguimos em frente: melhor o jogo abrir
      // com um buraco visual do que travar na tela de carregamento.
      img.onload = img.onerror = () => {
        prontas++;
        if (aoProgresso) aoProgresso(prontas / total);
        resolver();
      };
      img.src = 'assets/' + arq;
      imagens[arq] = img;
    })));
  }

  return {
    carregar,
    img(arquivo) { return imagens[arquivo]; },
    get progresso() { return total ? prontas / total : 0; },
  };
})();
