/* =========================================================================
   JURASSIC UNEF — o chefe: Carnotauro
   Vem do pacote `pacote-carnotauro-boss` v1.0.0, guardado inteiro em
   ferramentas/pacote-carnotauro-boss/ (folhas, referencia e o controlador
   original do autor). Aqui ficam so os numeros que o jogo precisa.

   Tres folhas de 8 quadros, celula de 192x128, bicho olhando para a ESQUERDA
   — ele corre contra o jogador, entao o arquivo ja vem na direcao certa e o
   desenho e um drawImage direto, sem espelhar.

   Duas medidas saem da propria arte, e nao de chute:

   pe = 121. O bicho nao encosta na base da celula: sobram 7px vazios embaixo.
   E o pe, nao a borda da celula, que precisa pousar em CHAO_Y.

   escala por folha. As folhas de corrida e mordida foram desenhadas no mesmo
   tamanho (o bicho ocupa ~92x75 da celula), mas a de morte veio ~1,55x maior.
   Sem escala propria o carnotauro CRESCERIA no instante em que leva a
   tacapada. Dividir a escala da morte por 1,55 mantem o mesmo bicho no chao.

   A arte ja traz a sombra de contato desenhada embaixo do corpo — por isso o
   jogo nao desenha elipse nenhuma sob ele, ao contrario do heroi.          */

const CHEFE = {
  lq: 192,        // largura da celula na folha
  aq: 128,        // altura da celula
  pe: 121,        // linha do pe dentro da celula

  // Tamanho do bicho no mundo de 960x540, ja com a escala aplicada: 93x75 da
  // folha a 2,5. Fica ~1,5x a altura do heroi (124px), a mesma proporcao de
  // chefe que o dino antigo tinha.
  l: 233,
  a: 188,

  correr: { arquivo: 'boss-carnotauro-run.png',    n: 8, fps: 10, escala: 2.5 },
  atacar: { arquivo: 'boss-carnotauro-attack.png', n: 8, fps: 12, escala: 2.5 },
  morrer: { arquivo: 'boss-carnotauro-death.png',  n: 8, fps: 9,  escala: 1.61 },

  // A mordida comeca quando a frente do bicho chega a esta distancia do heroi.
  // O pacote pede que ele NAO pare de avancar para morder: aqui quem avanca e
  // o cenario, entao a mordida e so a troca de folha — o chefe continua vindo.
  distanciaMordida: 190,
};
