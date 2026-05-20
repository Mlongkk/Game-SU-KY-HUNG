/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioService {
  private ambient: HTMLAudioElement | null = null;
  private sfx: { [key: string]: HTMLAudioElement } = {};
  private isMuted: boolean = false;

  private ambientVolume: number = 0.3;
  private sfxVolume: number = 0.5;

  private SOUNDS = {
    ambient: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', // Epic mysterious background
    click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    puzzleSolve: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    levelComplete: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    itemCollect: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    wrong: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3', // New distinct wrong buzzer
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const savedAmbientVolume = localStorage.getItem('skh_ambient_volume');
      const savedSfxVolume = localStorage.getItem('skh_sfx_volume');
      if (savedAmbientVolume !== null) {
        this.ambientVolume = parseFloat(savedAmbientVolume);
      }
      if (savedSfxVolume !== null) {
        this.sfxVolume = parseFloat(savedSfxVolume);
      }
      this.init();
    }
  }

  private init() {
    this.ambient = new Audio(this.SOUNDS.ambient);
    this.ambient.loop = true;
    this.ambient.volume = this.ambientVolume;
    this.ambient.preload = "auto";

    // Monitor loading errors
    this.ambient.onerror = (e) => console.error('Ambient audio load error:', e);

    Object.entries(this.SOUNDS).forEach(([key, url]) => {
      if (key !== 'ambient') {
        const audio = new Audio(url);
        audio.preload = "auto";
        audio.volume = this.sfxVolume;
        audio.onerror = (e) => console.error(`SFX ${key} load error:`, e);
        this.sfx[key] = audio;
      }
    });
  }

  setAmbientVolume(level: number) {
    this.ambientVolume = Math.max(0, Math.min(1, level));
    localStorage.setItem('skh_ambient_volume', this.ambientVolume.toString());
    
    if (this.ambient) {
      this.ambient.volume = this.ambientVolume;
    }
  }

  setSfxVolume(level: number) {
    this.sfxVolume = Math.max(0, Math.min(1, level));
    localStorage.setItem('skh_sfx_volume', this.sfxVolume.toString());
    
    Object.values(this.sfx).forEach(audio => {
      audio.volume = this.sfxVolume;
    });
  }

  getAmbientVolume() {
    return this.ambientVolume;
  }

  getSfxVolume() {
    return this.sfxVolume;
  }

  speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis || this.isMuted) return;
    
    // Stop any current speaking
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9; // Slightly slower for "epic" feel
    utterance.pitch = 1.0;
    utterance.volume = this.sfxVolume;
    
    window.speechSynthesis.speak(utterance);
  }

  playAmbient() {
    if (!this.ambient || this.isMuted) return;
    this.ambient.play().catch(err => {
      console.warn('Ambient play blocked by browser. This is expected if the user has not interacted with the page yet.', err);
    });
  }

  // Force unlock all audio objects for mobile browsers
  unlockAudio() {
    if (this.ambient) {
      this.ambient.play().then(() => {
        if (this.isMuted) {
          this.ambient?.pause();
        }
      }).catch(err => console.warn('Unlock ambient failed:', err));
    }

    Object.values(this.sfx).forEach(sound => {
      sound.play().then(() => {
        sound.pause();
        sound.currentTime = 0;
      }).catch(() => {});
    });
  }

  stopAmbient() {
    if (this.ambient) {
      this.ambient.pause();
    }
  }

  playSFX(key: keyof typeof this.SOUNDS) {
    if (this.isMuted || key === 'ambient') return;
    const sound = this.sfx[key];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(err => {
        console.warn(`SFX ${key} play failed:`, err);
      });
    } else {
      console.warn(`SFX ${key} not found`);
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ambient) {
      if (muted) {
        this.ambient.pause();
      } else {
        // When unmuted, try to play. This is often a user gesture.
        this.ambient.play().catch(err => console.warn('Unmute play failed:', err));
      }
    }
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }
}

export const audioService = new AudioService();
