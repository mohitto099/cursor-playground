/**
 * AudioManager - procedural audio using Web Audio API
 */

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.enabled = false;
    this.masterVolume = 0.5;
    this.muted = false;
    this.sounds = new Map();
    this.initPromise = null;
  }

  async init() {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.masterVolume;
      this.enabled = true;
      console.log('AudioManager initialized');
    } catch (e) {
      console.warn('Web Audio API not available:', e);
      this.enabled = false;
    }
  }

  async ensureAudioContext() {
    if (!this.audioContext) {
      await this.init();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.masterVolume;
    }
  }

  getVolume() {
    return this.muted ? 0 : this.masterVolume;
  }

  isEnabled() {
    return this.enabled && this.audioContext !== null;
  }

  // Create a simple tone
  createTone(frequency, duration, type = 'sine', volume = 1) {
    if (!this.isEnabled()) return null;

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume * this.masterVolume;

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = ctx.currentTime;
    oscillator.start(now);
    oscillator.stop(now + duration);

    return { oscillator, gainNode, stop: () => oscillator.stop() };
  }

  // Play a chime sound
  playChime(frequency = 880, duration = 0.3) {
    return this.createTone(frequency, duration, 'sine', 0.3);
  }

  // Play a click/pop sound
  playClick(frequency = 200, duration = 0.05) {
    return this.createTone(frequency, duration, 'square', 0.2);
  }

  // Play a burst sound (for fireworks/explosions)
  playBurst(baseFreq = 440, count = 5) {
    if (!this.isEnabled()) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = baseFreq * (1 + i * 0.3);
      gain.gain.value = 0.15 * (1 - i / count);

      osc.connect(gain);
      gain.connect(this.masterGain);

      const startTime = now + i * 0.03;
      osc.start(startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.stop(startTime + 0.3);
    }
  }

  // Play ambient tone
  playAmbient(frequency = 220, duration = 2) {
    if (!this.isEnabled()) return null;

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    gain.gain.value = 0.05;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    const now = ctx.currentTime;
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.stop(now + duration);

    return { osc, gain, filter };
  }

  // Play particle trail sound (very subtle)
  playParticleSound(speed = 1) {
    if (!this.isEnabled() || Math.random() > 0.1) return; // Only 10% of particles

    const freq = 400 + speed * 200;
    this.createTone(freq, 0.05, 'sine', 0.05);
  }

  // Play grab sound
  playGrab() {
    this.createTone(300, 0.1, 'sine', 0.2);
  }

  // Play throw sound
  playThrow(speed = 1) {
    const freq = 150 + speed * 100;
    this.createTone(freq, 0.2, 'triangle', 0.15);
  }

  // Play magnet sound
  playMagnet(strength = 1) {
    const freq = 200 + strength * 300;
    this.createTone(freq, 0.15, 'sine', 0.1 * strength);
  }

  // Play gravity sound
  playGravity() {
    this.createTone(100, 0.5, 'sawtooth', 0.05);
  }

  // Cleanup
  dispose() {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
      this.enabled = false;
    }
  }
}

// Singleton instance
export const audioManager = new AudioManager();