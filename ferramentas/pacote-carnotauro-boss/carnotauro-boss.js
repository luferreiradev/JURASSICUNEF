export class CarnotauroBoss {
  static CELL_W = 192;
  static CELL_H = 128;
  static FRAMES = 8;

  constructor(options = {}) {
    this.x = options.x ?? 700;
    this.groundY = options.groundY ?? 300;
    this.width = options.width ?? 176;
    this.height = options.height ?? 117;
    this.maxHealth = options.health ?? 3;
    this.runSpeed = options.runSpeed ?? 52;
    this.attackDistance = options.attackDistance ?? 135;
    this.attackCooldown = options.attackCooldown ?? 1.15;
    this.onBite = options.onBite ?? (() => {});
    this.onHit = options.onHit ?? (() => {});
    this.onDeath = options.onDeath ?? (() => {});
    this.assetBase = options.assetBase ?? './assets';

    this.sheets = {
      run: this.#load(`${this.assetBase}/boss-carnotauro-run.png`),
      attack: this.#load(`${this.assetBase}/boss-carnotauro-attack.png`),
      death: this.#load(`${this.assetBase}/boss-carnotauro-death.png`)
    };
    this.fps = { run: 10, attack: 12, death: 9 };
    this.reset(this.x);
  }

  #load(src) {
    const image = new Image();
    image.src = src;
    return image;
  }

  reset(x = 700) {
    this.x = x;
    this.health = this.maxHealth;
    this.state = 'run';
    this.phase = 0;
    this.cooldown = 0;
    this.biteApplied = false;
    this.dead = false;
    this.hitFlash = 0;
    this.attackToken = null;
  }

  get hitbox() {
    return {
      x: this.x - this.width * 0.43,
      y: this.groundY - this.height * 0.88,
      width: this.width * 0.78,
      height: this.height * 0.88
    };
  }

  update(dt, player) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (this.state === 'death') {
      const duration = CarnotauroBoss.FRAMES / this.fps.death;
      const wasDead = this.dead;
      this.phase = Math.min(1, this.phase + dt / duration);
      this.dead = this.phase >= 1;
      if (this.dead && !wasDead) this.onDeath(this);
      return;
    }

    const distance = this.x - player.x;
    if (this.state === 'run') {
      this.phase = (this.phase + dt * this.fps.run / CarnotauroBoss.FRAMES) % 1;
      if (distance > this.attackDistance) this.x -= this.runSpeed * dt;
      if (distance <= this.attackDistance && this.cooldown <= 0) {
        this.state = 'attack';
        this.phase = 0;
        this.biteApplied = false;
      }
    } else if (this.state === 'attack') {
      const duration = CarnotauroBoss.FRAMES / this.fps.attack;
      this.phase += dt / duration;
      this.x -= 6 * dt; // a mordida não interrompe a perseguição
      if (!this.biteApplied && this.phase >= 0.54) {
        this.biteApplied = true;
        this.onBite(this, player);
      }
      if (this.phase >= 1) {
        this.state = 'run';
        this.phase = 0;
        this.cooldown = this.attackCooldown;
      }
    }
  }

  /**
   * Chame durante a janela ativa do ataque do jogador.
   * attackToken deve ser único para cada golpe, evitando dano duplicado.
   */
  receivePlayerAttack(attackBox, attackToken) {
    if (this.state === 'death' || this.attackToken === attackToken) return false;
    if (!CarnotauroBoss.intersects(this.hitbox, attackBox)) return false;

    this.attackToken = attackToken;
    this.health = Math.max(0, this.health - 1);
    this.hitFlash = 0.18;
    this.x += 12;
    this.onHit(this);

    if (this.health === 0) {
      this.state = 'death';
      this.phase = 0;
      this.cooldown = 0;
      this.biteApplied = true;
    }
    return true;
  }

  draw(ctx) {
    const sheet = this.sheets[this.state];
    if (!sheet?.complete || !sheet.naturalWidth) return;
    const frame = this.state === 'run'
      ? Math.floor(this.phase * CarnotauroBoss.FRAMES) % CarnotauroBoss.FRAMES
      : Math.min(CarnotauroBoss.FRAMES - 1,
          Math.floor(this.phase * CarnotauroBoss.FRAMES));
    const dx = Math.round(this.x - this.width / 2);
    const dy = Math.round(this.groundY - this.height);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (this.hitFlash > 0) ctx.globalAlpha = 0.65;
    ctx.drawImage(sheet,
      frame * CarnotauroBoss.CELL_W, 0,
      CarnotauroBoss.CELL_W, CarnotauroBoss.CELL_H,
      dx, dy, this.width, this.height);
    ctx.restore();
    this.drawHealthBar(ctx, dy - 11);
  }

  drawHealthBar(ctx, y) {
    const width = 72;
    const x = Math.round(this.x - width / 2);
    ctx.save();
    ctx.fillStyle = '#24131b';
    ctx.fillRect(x - 1, y - 1, width + 2, 6);
    ctx.fillStyle = '#ff4f3c';
    ctx.fillRect(x, y, Math.round(width * this.health / this.maxHealth), 4);
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff0b0';
    ctx.fillText(this.dead ? 'DERROTADO' : (this.state === 'death' ? 'CAINDO' : 'BOSS'), this.x, y - 3);
    ctx.restore();
  }

  static intersects(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
      a.y < b.y + b.height && a.y + a.height > b.y;
  }
}
