# JURASSIC UNEF

Jogo interativo em HTML5 sobre **a Era Primitiva**, feito como trabalho acadêmico.
O visitante escaneia um QR Code, o jogo abre direto no navegador do celular e,
a cada ovo de dinossauro coletado, aparece uma curiosidade real sobre a pré-história.

**Jogar:** https://luferreiradev.github.io/JURASSICUNEF/

O QR Code pronto para o cartaz está em [`qrcode.png`](qrcode.png) (1024×1024).

---

## Como jogar

| Ação | Celular | Computador |
|---|---|---|
| Pular | toque na parte de cima da tela | `Espaço`, `↑` ou `W` |
| Pular mais alto | segure o toque | segure a tecla |
| Deslizar (passar por baixo da saliência) | segure o terço de baixo da tela | `↓` ou `S` |

Pegue os **ovos** para somar pontos e desbloquear curiosidades. A velocidade
aumenta com a distância e o cenário passa por um ciclo de dia e noite.

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
js/assets-dados.js      GERADO — tamanhos e offsets dos sprites
js/assets.js            carregamento das imagens
js/curiosidades.js      os fatos sobre a Era Primitiva
js/audio.js             efeitos sonoros gerados por Web Audio (sem arquivos)
js/game.js              motor: física, obstáculos, colisão, cenário
js/main.js              telas, controles e laço principal
assets/                 GERADO — sprites e tiles já recortados
ferramentas/            scripts de apoio (não vão para o navegador)
```

O mundo do jogo tem sempre **960×540**; o canvas é escalado por fora e a
interface tem escala própria, para o texto continuar legível no celular em pé.

## Testar

```bash
node ferramentas/teste-jogabilidade.js
```

Carrega o motor fora do navegador e deixa um robô jogar 12 partidas de 3 minutos.
Serve para provar o que screenshot não prova: que **nenhum obstáculo gerado é
impossível** de passar, mesmo na velocidade máxima. Foi ele que pegou uma poça
de piche larga demais para o pulo.

## Assets

A arte vem de dois pacotes gratuitos do [GameArt2D](https://www.gameart2d.com/freebies.html),
em **licença CC0 (domínio público)** — uso livre, inclusive comercial, sem crédito obrigatório:

- [Free Dino Sprites](https://www.gameart2d.com/free-dino-sprites.html) — o personagem
- [Free Desert Platformer Tileset](https://www.gameart2d.com/free-desert-platformer-tileset.html) — cenário, chão e obstáculos

Os PNGs originais somam ~10 MB. O script `ferramentas/preparar-assets.js` recorta
a área transparente, redimensiona e junta os quadros em spritesheets, deixando a
pasta `assets/` em **~360 KB** — o que importa para quem escaneia o QR Code no 4G.
Para regerar (só se trocar a arte):

```bash
npm i sharp
node ferramentas/preparar-assets.js <pasta>/dino/png <pasta>/desert/png
```

O ovo colecionável e a poça de piche não existem nos pacotes: são desenhados
direto no canvas, em `js/game.js`.

## Créditos

Projeto acadêmico — UNEF.
Integrantes: _(preencher aqui e também em `index.html`, na tela “sobre o projeto”)_
