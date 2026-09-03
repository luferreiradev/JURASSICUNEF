# Prompt pronto para o Codex

Integre o pacote `pacote-carnotauro-boss` ao meu jogo HTML/Canvas existente.

Requisitos obrigatórios:

1. Leia primeiro `README.md` e preserve todas as mecânicas atuais do jogo.
2. Use `carnotauro-boss.js` como controlador e mantenha os três PNGs dentro de `assets`.
3. Faça o boss entrar pela direita e correr no chão em direção ao jogador, sem pular.
4. Ao alcançar a distância configurada, execute a mordida sem interromper totalmente o avanço.
5. Conecte a hitbox ativa do bastão a `receivePlayerAttack(attackBox, attackToken)`.
6. Gere um `attackToken` novo para cada ataque do jogador, garantindo somente um dano por golpe.
7. O Carnotauro deve ter 3 vidas. Nos dois primeiros golpes, mostre impacto e pequeno recuo. No terceiro, reproduza os 8 quadros de morte e mantenha o último quadro no chão.
8. Conecte `onBite`, `onHit` e `onDeath` aos efeitos já existentes no jogo, como dano, tremor e partículas.
9. Preserve a proporção do sprite, a transparência, os chifres e a cauda. Use `ctx.imageSmoothingEnabled = false`.
10. Não crie sombras circulares, halos, bordas brancas, pixels claros ou recortes no personagem.
11. Adapte apenas coordenadas, escala, velocidade e nomes de funções necessários ao projeto existente.
12. Ao finalizar, valide o JavaScript, teste corrida, mordida, três golpes, morte, permanência do corpo e reinicialização.

Não redesenhe o personagem e não substitua as folhas de sprites fornecidas.
