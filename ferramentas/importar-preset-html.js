/*
 * Importa o sprite sheet e os metadados exportados pelo preset HTML entregue
 * pelo artista. Usa o Chrome/Edge em modo headless, sem dependencias npm.
 *
 * Uso:
 *   node ferramentas/importar-preset-html.js caminho/para/preset.html
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const raiz = path.join(__dirname, '..');
const entrada = path.resolve(process.argv[2] || '');
const saida = path.join(raiz, 'assets');
const porta = 9333;

if (!entrada || !fs.existsSync(entrada)) {
  console.error('Informe o caminho de um preset HTML existente.');
  process.exit(1);
}

const navegadores = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const navegador = navegadores.find(fs.existsSync);
if (!navegador) {
  console.error('Chrome ou Edge nao encontrado.');
  process.exit(1);
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function endpoint() {
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    try {
      const resposta = await fetch(`http://127.0.0.1:${porta}/json/list`);
      const paginas = await resposta.json();
      const pagina = paginas.find((p) => p.type === 'page');
      if (pagina) return pagina.webSocketDebuggerUrl;
    } catch (_) { /* navegador ainda inicializando */ }
    await esperar(100);
  }
  throw new Error('O navegador nao abriu a porta de depuracao.');
}

async function conectar(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  const pendentes = new Map();
  ws.addEventListener('message', (evento) => {
    const msg = JSON.parse(evento.data);
    if (!msg.id || !pendentes.has(msg.id)) return;
    const { resolve, reject } = pendentes.get(msg.id);
    pendentes.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  });

  return {
    enviar(method, params = {}) {
      const atual = ++id;
      ws.send(JSON.stringify({ id: atual, method, params }));
      return new Promise((resolve, reject) => pendentes.set(atual, { resolve, reject }));
    },
    fechar() { ws.close(); },
  };
}

async function principal() {
  fs.mkdirSync(saida, { recursive: true });
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'jurassic-preset-'));
  const urlArquivo = 'file:///' + entrada.replace(/\\/g, '/');
  const processo = spawn(navegador, [
    '--headless=new',
    `--remote-debugging-port=${porta}`,
    `--user-data-dir=${perfil}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    urlArquivo,
  ], { windowsHide: true, stdio: 'ignore' });

  let cdp;
  try {
    cdp = await conectar(await endpoint());
    await cdp.enviar('Page.enable');
    await cdp.enviar('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: saida,
      eventsEnabled: true,
    });

    await cdp.enviar('Runtime.evaluate', {
      expression: `new Promise((resolve) => {
        const pronto = () => {
          const escala = document.getElementById('rngScale');
          escala.value = '2';
          escala.dispatchEvent(new Event('input'));
          document.getElementById('dlSheet').click();
          setTimeout(() => document.getElementById('dlJson').click(), 250);
          setTimeout(resolve, 700);
        };
        if (document.readyState === 'complete') pronto();
        else addEventListener('load', pronto, { once: true });
      })`,
      awaitPromise: true,
    });

    const esperados = ['homem-das-cavernas.png', 'homem-das-cavernas.json'];
    for (let tentativa = 0; tentativa < 80; tentativa++) {
      const completos = esperados.every((nome) => {
        const p = path.join(saida, nome);
        return fs.existsSync(p) && fs.statSync(p).size > 100;
      });
      if (completos) break;
      await esperar(100);
    }
    for (const nome of esperados) {
      const p = path.join(saida, nome);
      if (!fs.existsSync(p)) throw new Error(`Download ausente: ${nome}`);
      console.log(`${nome}: ${fs.statSync(p).size} bytes`);
    }
  } finally {
    if (cdp) cdp.fechar();
    processo.kill();
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (_) { /* limpeza eventual do navegador */ }
  }
}

principal().catch((erro) => {
  console.error(erro.stack || erro.message);
  process.exitCode = 1;
});
