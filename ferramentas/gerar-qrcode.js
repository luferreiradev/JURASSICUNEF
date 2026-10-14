/*
 * Gera o QR Code final usando o mesmo qrcode.js de qr.html, via Edge/Chrome
 * headless. Nao requer dependencias npm.
 *
 * Uso:
 *   node ferramentas/gerar-qrcode.js [URL] [arquivo.png]
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const raiz = path.join(__dirname, '..');
const endereco = process.argv[2] || 'https://luferreiradev.github.io/JURASSICUNEF/?v=7';
const saida = path.resolve(process.argv[3] || path.join(raiz, 'qrcode.png'));
const pagina = path.join(raiz, 'qr.html');
const porta = 9334;

try { new URL(endereco); } catch (_) {
  console.error(`URL invalida: ${endereco}`);
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

async function localizarPagina() {
  for (let tentativa = 0; tentativa < 100; tentativa++) {
    try {
      const resposta = await fetch(`http://127.0.0.1:${porta}/json/list`);
      const paginas = await resposta.json();
      const alvo = paginas.find((p) => p.type === 'page');
      if (alvo) return alvo.webSocketDebuggerUrl;
    } catch (_) { /* navegador inicializando */ }
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
    const chamada = pendentes.get(msg.id);
    pendentes.delete(msg.id);
    if (msg.error) chamada.reject(new Error(msg.error.message));
    else chamada.resolve(msg.result);
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
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'jurassic-qr-'));
  const urlPagina = 'file:///' + pagina.replace(/\\/g, '/');
  const processo = spawn(navegador, [
    '--headless=new',
    `--remote-debugging-port=${porta}`,
    `--user-data-dir=${perfil}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    urlPagina,
  ], { windowsHide: true, stdio: 'ignore' });

  let cdp;
  try {
    cdp = await conectar(await localizarPagina());
    const resultado = await cdp.enviar('Runtime.evaluate', {
      expression: `new Promise((resolve, reject) => {
        const limite = Date.now() + 15000;
        const gerar = async () => {
          if (typeof QRCode === 'undefined') {
            if (Date.now() < limite) return setTimeout(gerar, 100);
            return reject(new Error('qrcode.js nao carregou'));
          }
          const campo = document.getElementById('endereco');
          campo.value = ${JSON.stringify(endereco)};
          document.getElementById('tamanho').value = '1024';
          document.getElementById('btGerar').click();
          const canvas = document.querySelector('#moldura canvas');
          if (!canvas) return reject(new Error('Canvas do QR nao foi criado'));
          let decodificado = null;
          if ('BarcodeDetector' in window) {
            try {
              const leitor = new BarcodeDetector({ formats: ['qr_code'] });
              const codigos = await leitor.detect(canvas);
              decodificado = codigos[0] ? codigos[0].rawValue : '';
            } catch (_) { /* API opcional do navegador */ }
          }
          resolve({ data: canvas.toDataURL('image/png'), legenda: document.getElementById('legenda').textContent, decodificado });
        };
        if (document.readyState === 'complete') gerar();
        else addEventListener('load', gerar, { once: true });
      })`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (!resultado.result || !resultado.result.value) throw new Error('O navegador nao retornou o QR Code.');
    const valor = resultado.result.value;
    if (valor.decodificado !== null && valor.decodificado !== endereco) {
      throw new Error(`Validacao do QR falhou: ${valor.decodificado || 'conteudo vazio'}`);
    }
    const base64 = valor.data.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(saida, Buffer.from(base64, 'base64'));
    console.log(valor.legenda);
    console.log(valor.decodificado === endereco ? 'Leitura automatica: OK' : 'Leitura automatica: API indisponivel');
    console.log(`${saida} - ${fs.statSync(saida).size} bytes`);
  } finally {
    if (cdp) cdp.fechar();
    processo.kill();
    await esperar(250);
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (_) { /* limpeza eventual */ }
  }
}

principal().catch((erro) => {
  console.error(erro.stack || erro.message);
  process.exitCode = 1;
});
