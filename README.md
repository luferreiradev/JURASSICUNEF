# JURASSIC UNEF

Jogo interativo em HTML5 sobre **a Era Primitiva**, feito como trabalho acadêmico.
O visitante escaneia um QR Code, o jogo abre direto no navegador do celular e,
a cada ovo de dinossauro coletado, aparece uma curiosidade real sobre a pré-história.

Você é um **homem das cavernas** correndo com um tacape por
uma paisagem vulcânica, desviando de pedras, cactos, poças de piche e de um
**carnotauro** que vem correndo de frente.

**Jogar:** https://luferreiradev.github.io/JURASSICUNEF/?v=2

O QR Code pronto para o cartaz está em [`qrcode.png`](qrcode.png) (1024×1024).

---

## Como jogar

| Ação | Celular | Computador |
|---|---|---|
| Pular | toque na tela | `↑` ou `W` |
| Pular mais alto | segure o toque | segure a tecla de pulo |
| Deslizar (passar por baixo da saliência) | arraste o dedo para baixo | `↓` ou `S` |
| Bater com o tacape | botão **BATER** | `Espaço` ou `X` |

Pegue os **ovos** para somar pontos e desbloquear curiosidades. A velocidade
aumenta com a distância e o cenário passa por um ciclo de dia e noite.
O tacape quebra obstáculos sólidos e derruba o carnotauro — que cai e fica
caído no chão até sair de quadro —, mas não elimina a poça de piche nem a
saliência: esses continuam exigindo pulo e deslize.

Os obstáculos vão sendo apresentados aos poucos conforme você avança: pedra e
cacto desde o começo, saliência de rocha (que exige deslizar) a partir dos
3.200 px, o **chefe** aos 3.000 e a poça de piche aos 4.600.

## Rodar na sua máquina

Não tem build, nem dependências, nem `npm install`. É só servir a pasta:

```bash
npx serve .
# ou, com Python:  python -m http.server 8000
```

Abrir `index.html` direto pelo arquivo (`file://`) também funciona na maioria
dos navegadores, mas usar um servidor evita surpresas com o carregamento das imagens.

## Publicar (GitHub Pages, grátis)

```bash
gh repo create JURASSICUNEF --public --source=. --remote=origin --push
```

Depois, em **Settings → Pages**, escolher a branch `master` e a pasta `/ (root)`.
O endereço fica `https://<usuário>.github.io/JURASSICUNEF/`.

O QR Code já está gerado em `qrcode.png`. Se o endereço mudar, abrir `qr.html`
no navegador para gerar outro.
Imprimir com pelo menos 4 cm de lado e margem branca em volta.

## Estrutura

```
index.html              página do jogo
qr.html                 gerador do QR Code (uso interno, não faz parte do jogo)
qrcode.png              o QR Code já gerado, pronto para o cartaz
css/style.css           interface: menu, placar, curiosidades
js/assets-dados.js      GERADO — o cenário
js/assets-homem.js      GERADO — metadados das folhas do homem das cavernas
js/assets-chefe.js      metadados das folhas do carnotauro
js/assets.js            carregamento das imagens
js/curiosidades.js      os fatos sobre a Era Primitiva
js/audio.js             efeitos sonoros gerados por Web Audio (sem arquivos)
js/cenario-vulcanico.js vulcão, lava, meteoros, fumaça e cinzas animados
js/game.js              motor: física, obstáculos, colisão, cenário
js/main.js              telas, controles e laço principal
assets/                 GERADO — sprites e tiles já recortados
ferramentas/            scripts de apoio (não vão para o navegador)
  preparar-assets.js      recorta o cenário e repinta no estilo vulcânico
  pacote-carnotauro-boss/ o pacote do chefe como veio do autor
  importar-preset-html.js tira as folhas do personagem de dentro do preset HTML
  gerar-qrcode.js          regenera o QR Code público em 1024×1024
  teste-jogabilidade.js   robô que joga sozinho para provar que dá para passar
```

O mundo do jogo tem sempre **960×540**; o canvas é escalado por fora e a
interface tem escala própria, para o texto continuar legível no celular em pé.

## Testar

```bash
node ferramentas/teste-jogabilidade.js
```

Carrega o motor fora do navegador e deixa um robô jogar 20 partidas de 3 minutos,
nos dois modos de controle (teclado e toque). Serve para provar o que screenshot
não prova: que **nenhum obstáculo gerado é impossível** de passar, mesmo na
velocidade máxima.

Ele já pegou duas coisas que passariam batido:

- uma poça de piche larga demais para o pulo na velocidade em que ela começava a
  aparecer;
- o chefe com caixa de colisão grande demais — e, ao contrário do que parece,
  um obstáculo largo é mais difícil **devagar** do que rápido, porque o tempo
  atravessando a caixa é largura/velocidade.

## Assets

### O que veio pronto

O [Free Desert Platformer Tileset](https://www.gameart2d.com/free-desert-platformer-tileset.html)
do [GameArt2D](https://www.gameart2d.com/freebies.html), em **licença CC0
(domínio público)** — uso livre, inclusive comercial, sem crédito obrigatório —
dá o cenário, o chão e os obstáculos.

O cenário não é usado como veio: `preparar-assets.js` **repinta cada pixel pela
luminosidade**, seguindo uma rampa de cores, o que troca a atmosfera inteira para
vulcânica sem redesenhar nada. Obstáculos levam uma rampa mais clara que o chão —
sem isso viram vultos escuros sobre chão escuro e não dá tempo de reagir.

### O chefe: carnotauro

Vem do pacote `pacote-carnotauro-boss` v1.0.0, guardado inteiro em
[`ferramentas/pacote-carnotauro-boss/`](ferramentas/pacote-carnotauro-boss)
(folhas originais, referência de design, o script de preparo do autor e o
controlador `carnotauro-boss.js`). As folhas que o jogo carrega são cópias
byte a byte em `assets/`; nenhum pixel foi redesenhado.

São três folhas de 8 quadros, célula de 192×128, o bicho já olhando para a
esquerda: **corrida** (10 fps), **mordida** (12) e **morte** (9). O jogo usa as
três — ele corre, abre a boca quando alcança o herói e, ao levar a tacapada,
cai e fica caído no chão até sair de quadro.

Duas coisas foram medidas na arte em vez de chutadas:

- **linha do pé = 121.** Sobram 7px vazios embaixo da célula; é o pé, não a
  borda, que precisa pousar em `CHAO_Y`.
- **escala por folha.** Corrida e mordida foram desenhadas no mesmo tamanho, mas
  a folha de morte veio ~1,55× maior. Sem escala própria o carnotauro
  *cresceria* no instante da tacapada.

O controlador que veio no pacote foi escrito para um jogo de arena: ele move o
boss por conta própria, desenha barra de vida e dá 3 pontos de vida ao bicho.
Aqui o chefe é um dos obstáculos do runner — quem move o mundo é o cenário, e o
tacape derruba de primeira, como derrubava o dino antigo. As **regras do jogo
ficaram como estavam**; o que foi substituído é o dinossauro.

### O que foi desenhado aqui

O personagem vem do preset `homem-das-cavernas-v2.html` (build
`barbaro-bastao-360`): um bárbaro pixel-art de capa e tacape, entregue em três
folhas prontas — `homem-correr.png` (8 quadros), `homem-deslizar.png` (4) e
`homem-atacar.png` (8, o giro de 360°). Elas ficam em `assets/`, junto com
`homem-das-cavernas.json`, que guarda o que foi medido em cada uma.

O preset não desenha parado, pulo nem morte, então esses três reaproveitam
quadros — como o próprio preset faz ao usar o último quadro do deslize para o
bárbaro em pé:

| estado | de onde sai |
|---|---|
| parado | último quadro do deslize (ele já está de pé nele) |
| pular | os dois quadros da corrida em que os pés estão no ar |
| morrer | o quadro deitado do deslize, o corpo esticado no chão |

Duas coisas o importador mede em vez de chutar: a **linha do pé** de cada folha
(o artista deixa alguns pixels vazios embaixo da célula, e é o pé — não a borda —
que precisa encostar no chão) e a **escala**, que sai da altura de 124 px em que
a física e as caixas de colisão foram calibradas. Assim um preset novo troca o
desenho sem rebalancear o jogo por acidente.

O ovo colecionável e a poça de piche também são desenhados no canvas, em `js/game.js`.

### Tamanho

Os PNGs originais somam ~10 MB; a pasta `assets/` fica em **~510 KB** — o que
importa para quem escaneia o QR Code no 4G. Para regerar:

```bash
npm i sharp
node ferramentas/preparar-assets.js <pasta>/desert/png
node ferramentas/importar-preset-html.js caminho/para/homem-das-cavernas-v2.html
```

O `sharp` é só para o cenário e o chefe. O importador do personagem não precisa
de nada instalado, nem de navegador: as folhas vêm embutidas no próprio preset.

## Créditos

Projeto acadêmico — UNEF.
Integrantes: _(preencher aqui e também em `index.html`, na tela “sobre o projeto”)_
