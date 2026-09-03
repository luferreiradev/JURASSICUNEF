/* GERADO POR ferramentas/importar-preset-html.js — nao edite a mao.
   Preset: homem-das-cavernas-v2.html (build 20260902-barbaro-bastao-360-v16-attack-edge-match).

   O preset novo nao monta mais o boneco por ossos: ele entrega tres folhas
   prontas — correr, deslizar e atacar. Os outros estados reaproveitam quadros:
     parado   ultimo quadro do deslize: o barbaro de pe, como no preset
     correr   passada completa; o jogo ainda acelera a cadencia com a velocidade
     deslizar quadro 0 desce, 1 segura deitado, 2 levanta, 3 ja esta de pe
     atacar   giro de 360 graus com o tacape, mais rapido que no preset
     pular    os dois quadros da corrida em que ele esta no ar
     morrer   o corpo esticado no chao

   dx centra a celula na coluna do jogador (e o alinhamento do proprio preset).
   dy usa a linha do PE medida na folha, e nao a borda da celula: assim o
   barbaro pisa exatamente em CHAO_Y, com o tacape e a capa livres para sair da
   silhueta sem levantar o personagem do chao.
   A escala nasce da altura calibrada do heroi (124px no mundo de 960x540). */

const HEROI = {
  parado:   { arquivo: 'homem-deslizar.png', quadros: [3], n: 1, lq: 128, aq: 96, fps: 1, dx: -64, dy: -93 },
  correr:   { arquivo: 'homem-correr.png', coluna: 0, n: 8, lq: 96, aq: 96, fps: 12, dx: -48, dy: -93 },
  deslizar: { arquivo: 'homem-deslizar.png', coluna: 0, n: 4, lq: 128, aq: 96, fps: 9, dx: -64, dy: -93 },
  atacar:   { arquivo: 'homem-atacar.png', coluna: 0, n: 8, lq: 160, aq: 128, fps: 16, dx: -80, dy: -124 },
  pular:    { arquivo: 'homem-correr.png', quadros: [3, 7], n: 2, lq: 96, aq: 96, fps: 6, dx: -48, dy: -93 },
  morrer:   { arquivo: 'homem-deslizar.png', quadros: [1], n: 1, lq: 128, aq: 96, fps: 1, dx: -64, dy: -93 },
  // Janela em que o tacape varre a frente do corpo: quadros 2 a 7 do ataque.
  golpeDe: 0.250,
  golpeAte: 0.875,
  escala: 1.39,
};
