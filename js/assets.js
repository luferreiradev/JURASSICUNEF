/* =========================================================================
   JURASSIC UNEF — carregamento das imagens
   Le a lista de arquivos direto dos metadados gerados (js/assets-dados.js),
   entao nao existe lista duplicada para esquecer de atualizar.
   ========================================================================= */

const Assets = (function () {
  const imagens = {};
  let prontas = 0;
  let total = 0;

  function arquivos() {
    const lista = [];
    for (const nome in DINO) if (nome !== 'escala') lista.push(DINO[nome].arquivo);
    for (const nome in CENARIO) if (nome !== 'escala') lista.push(CENARIO[nome].arquivo);
    return lista;
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
