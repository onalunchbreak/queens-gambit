// Sound manager — synthesizes chess move sounds with the Web Audio API.
// "Crisp slide of wood on wood" followed by a "solid thunk" on placement.
// No external audio assets required.

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;

  private ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  resume() {
    this.ensure();
  }

  setEnabled(v: boolean) {
    this.enabled = v;
  }

  // Filtered noise sweep = wood sliding on wood.
  private playSlide(ctx: AudioContext, start: number, duration: number) {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // fading noise
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.6;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(900, start);
    bandpass.frequency.linearRampToValueAtTime(1600, start + duration);
    bandpass.Q.value = 0.8;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.18, start + 0.02);
    g.gain.linearRampToValueAtTime(0.0001, start + duration);

    src.connect(bandpass);
    bandpass.connect(g);
    g.connect(this.master!);
    src.start(start);
    src.stop(start + duration);
  }

  // Low sine + click = the solid "thunk" of placement.
  private playThunk(ctx: AudioContext, start: number) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, start);
    osc.frequency.exponentialRampToValueAtTime(70, start + 0.12);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.5, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);

    osc.connect(g);
    g.connect(this.master!);
    osc.start(start);
    osc.stop(start + 0.2);

    // wood "click" overlay — short high noise burst
    const dur = 0.03;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2200;
    const cg = ctx.createGain();
    cg.gain.value = 0.25;
    src.connect(hp);
    hp.connect(cg);
    cg.connect(this.master!);
    src.start(start);
    src.stop(start + dur);
  }

  // A soft "tink" for capture (two pieces meeting).
  private playCaptureAccent(ctx: AudioContext, start: number) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(420, start);
    osc.frequency.exponentialRampToValueAtTime(180, start + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.3, start + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(start);
    osc.stop(start + 0.12);
  }

  move(isCapture: boolean) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    this.playSlide(ctx, now, 0.16);
    const thunkAt = now + 0.14;
    if (isCapture) this.playCaptureAccent(ctx, thunkAt + 0.005);
    this.playThunk(ctx, thunkAt);
  }

  // Gentle bell-like tone for game end.
  gameEnd() {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C E G
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = ctx.createGain();
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(g);
      g.connect(this.master!);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }
}

export const soundManager = new SoundManager();
