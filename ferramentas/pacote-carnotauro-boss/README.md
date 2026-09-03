# Pacote independente — Boss Carnotauro

Este pacote contém o desenvolvimento completo do Carnotauro criado para o jogo do Homem das Cavernas. Ele foi separado para ser integrado em outro projeto HTML/Canvas.

## Conteúdo

- `carnotauro-boss.js`: controlador reutilizável do boss.
- `assets/boss-carnotauro-run.png`: corrida, 8 quadros.
- `assets/boss-carnotauro-attack.png`: mordida em movimento, 8 quadros.
- `assets/boss-carnotauro-death.png`: impacto, queda e morte, 8 quadros.
- `reference/design-original.png`: referência visual original.
- `tools/prepare_boss_sheets.py`: tratamento das folhas, transparência e contornos.
- `PROMPT-PARA-CODEX.md`: instrução pronta para aplicar o pacote em outro jogo.

## Regras do personagem

- Boss terrestre; nunca pula.
- Corre da direita para a esquerda.
- Ataca abrindo a boca sem parar completamente de avançar.
- Possui 3 pontos de vida.
- Cada ataque do jogador causa no máximo 1 ponto de dano.
- No terceiro golpe, executa a animação de morte e permanece caído.
- O método `reset()` restaura o boss.

## Integração rápida

No JavaScript principal:

```js
import { CarnotauroBoss } from './carnotauro-boss.js';

const boss = new CarnotauroBoss({
  x: canvas.width + 100,
  groundY: 300,
  assetBase: './assets',
  health: 3,
  onBite: () => damagePlayer(),
  onHit: () => shakeScreen(6),
  onDeath: () => console.log('Boss derrotado')
});

// Dentro do loop:
boss.update(deltaSeconds, player);
boss.draw(ctx);

// Somente durante a janela ativa do bastão:
boss.receivePlayerAttack(playerAttackBox, playerAttackId);
```

`playerAttackId` deve mudar uma vez a cada novo golpe. Isso impede que vários quadros do mesmo ataque retirem todas as vidas de uma vez.

## Especificação das folhas

- Dimensão: `1536 × 128 px`.
- Grade: 8 colunas e 1 linha.
- Cada quadro: `192 × 128 px`.
- Renderização: `imageSmoothingEnabled = false`.
- Fundo: transparente.
- Direção: personagem olhando para a esquerda.

Se o jogo não usar módulos JavaScript, remova `export` da primeira linha e carregue o arquivo com uma tag `<script>` antes do código principal.
