/* =========================================================================
   JURASSIC UNEF — efeitos sonoros gerados pela Web Audio API
   Nenhum arquivo .mp3/.wav: os sons sao osciladores criados na hora.
   Navegadores mobile so liberam audio depois de um toque do usuario,
   por isso o contexto so e criado em Som.destravar().
   ========================================================================= */

const Som = (function () {
  const CHAVE = 'jurassic_unef_mudo';
  let ctx = null;
  let mudo = localStorage.getItem(CHAVE) === '1';

  function destravar() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  // Um bipe: frequencia inicial -> final, em `dur` segundos.
  function bipe(f1, f2, dur, tipo, vol) {
    if (mudo || !ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(f1, t);
    if (f2 !== f1) osc.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    ganho.gain.setValueAtTime(vol, t);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(ganho).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    destravar,
    pulo()    { bipe(320, 620, 0.12, 'square', 0.12); },
    coleta()  { bipe(660, 1180, 0.16, 'sine', 0.16); },
    dano()    { bipe(180, 45, 0.45, 'sawtooth', 0.20); },
    marco()   { bipe(880, 880, 0.07, 'square', 0.10); setTimeout(() => bipe(1320, 1320, 0.09, 'square', 0.10), 90); },
    estaMudo() { return mudo; },
    alternarMudo() {
      mudo = !mudo;
      localStorage.setItem(CHAVE, mudo ? '1' : '0');
      if (!mudo) { destravar(); bipe(880, 880, 0.06, 'square', 0.10); }
      return mudo;
    },
  };
})();
