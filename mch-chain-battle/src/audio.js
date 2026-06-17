import { CONFIG } from './config.js';

class AudioManager {
  constructor() {
    this.enabled = CONFIG.audio.enabled;
    this.muted = CONFIG.audio.muted;
    this.bgmVolume = CONFIG.audio.bgmVolume;
    this.seVolume = CONFIG.audio.seVolume;
    this.bgm = null;
  }

  async init() {
    if (!this.enabled) return;
    this.bgm = new Audio(CONFIG.audio.files.bgm);
    this.bgm.loop = true;
    this.applyBgmVolume();
  }

  applyBgmVolume() {
    if (!this.bgm) return;
    this.bgm.volume = this.muted ? 0 : this.bgmVolume;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.applyBgmVolume();
  }

  setBgmVolume(volume) {
    this.bgmVolume = Math.max(0, Math.min(1, Number(volume)));
    this.applyBgmVolume();
  }

  setSeVolume(volume) {
    this.seVolume = Math.max(0, Math.min(1, Number(volume)));
  }

  async playBgm() {
    if (!this.enabled || !this.bgm) return;
    this.applyBgmVolume();
    try {
      await this.bgm.play();
    } catch (_error) {
      // Browser may block autoplay. It will work after user interaction.
    }
  }

  stopBgm() {
    if (!this.bgm) return;
    this.bgm.pause();
    this.bgm.currentTime = 0;
  }

  playSe(name) {
    if (!this.enabled || this.muted) return;
    const file = CONFIG.audio.files[name];
    if (!file) return;
    const audio = new Audio(file);
    audio.volume = this.seVolume;
    audio.play().catch(() => {});
  }
}

export const audio = new AudioManager();
