# JURASSIC UNEF

Jogo interativo em HTML5 sobre **a Era Primitiva**, feito como trabalho acadêmico.
O visitante escaneia um QR Code, o jogo abre direto no navegador do celular e,
a cada ovo de dinossauro coletado, aparece uma curiosidade real sobre a pré-história.

Você é um **homem das cavernas** correndo com um dente de dinossauro na mão por
uma paisagem vulcânica, desviando de pedras, cactos, poças de piche e de um
**dinossauro predador** que vem de frente.

**Jogar:** https://luferreiradev.github.io/JURASSICUNEF/

O QR Code pronto para o cartaz está em [`qrcode.png`](qrcode.png) (1024×1024).

---

## Como jogar

| Ação | Celular | Computador |
|---|---|---|
| Pular | toque na parte de cima da tela | `Espaço`, `↑` ou `W` |
| Pular mais alto | segure o toque | segure a tecla |
| Deslizar (passar por baixo da saliência) | arraste o dedo para baixo | `↓` ou `S` |

Pegue os **ovos** para somar pontos e desbloquear curiosidades. A velocidade
aumenta com a distância e o cenário passa por um ciclo de dia e noite.

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
js/assets-dados.js      GERADO — o chefe e o cenário
js/assets-homem.js      GERADO — as animações do homem das cavernas
js/assets.js            carregamento das imagens
js/curiosidades.js      os fatos sobre a Era Primitiva
js/audio.js             efeitos sonoros gerados por Web Audio (sem arquivos)
js/game.js              motor: física, obstáculos, colisão, cenário
js/main.js              telas, controles e laço principal
assets/                 GERADO — sprites e tiles já recortados
ferramentas/            scripts de apoio (não vão para o navegador)
  preparar-assets.js      recorta o cenário, repinta no estilo vulcânico e monta o chefe
  desenhar-cavernico.js   desenha e anima o personagem principal
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

Dois pacotes gratuitos do [GameArt2D](https://www.gameart2d.com/freebies.html), em
**licença CC0 (domínio público)** — uso livre, inclusive comercial, sem crédito obrigatório:

- [Free Desert Platformer Tileset](https://www.gameart2d.com/free-desert-platformer-tileset.html) — cenário, chão e obstáculos
- [Free Dino Sprites](https://www.gameart2d.com/free-dino-sprites.html) — vira o **chefe**

O cenário não é usado como veio: `preparar-assets.js` **repinta cada pixel pela
luminosidade**, seguindo uma rampa de cores, o que troca a atmosfera inteira para
vulcânica sem redesenhar nada. Obstáculos levam uma rampa mais clara que o chão —
sem isso viram vultos escuros sobre chão escuro e não dá tempo de reagir.

O chefe é o mesmo dino espelhado e repintado como predador: corpo vermelho-escuro
e olho âmbar. O olho é o que mais muda a leitura — azul claro é simpático.

### O que foi desenhado aqui

Nenhum pacote gratuito tem um homem das cavernas, então ele é desenhado por
código em `ferramentas/desenhar-cavernico.js`. Não são oito figuras: é **um boneco
articulado** (cabeça, torso, coxa, canela, pé, braço, antebraço) montado em SVG e
animado por ângulos de junta — que é como animação 2D de jogo é feita de verdade.
Desenhar quadro a quadro à mão produziria oito bonecos ligeiramente diferentes e a
animação tremeria.

O ovo colecionável e a poça de piche também são desenhados no canvas, em `js/game.js`.

### Tamanho

Os PNGs originais somam ~10 MB; a pasta `assets/` fica em **~270 KB** — o que
importa para quem escaneia o QR Code no 4G. Para regerar:

```bash
npm i sharp
node ferramentas/preparar-assets.js <pasta>/dino/png <pasta>/desert/png
node ferramentas/desenhar-cavernico.js
```

## Créditos

Projeto acadêmico — UNEF.
Integrantes: _(preencher aqui e também em `index.html`, na tela “sobre o projeto”)_
