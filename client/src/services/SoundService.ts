export class SoundService {
  private audioContext: AudioContext | null = null;
  private masterVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.3;
  private isMuted: boolean = false;
  private backgroundMusicSource: AudioBufferSourceNode | null = null;
  private backgroundMusicGain: GainNode | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private loadedSounds: Set<string> = new Set();

  // Continuous sounds (like jet engines)
  private continuousSounds: Map<
    string,
    { source: AudioBufferSourceNode; gain: GainNode }
  > = new Map();

  constructor() {
    // Hot reload protection - cleanup previous instance
    if ((window as any).__soundService) {
      console.log("🎵 Cleaning up previous sound service instance");
      const previousService = (window as any).__soundService;
      previousService.cleanup();
    }

    this.initializeAudioContext();
    this.loadMuteState(); // Load mute state from localStorage
    this.loadVolumeSettings(); // Load volume settings from localStorage
    this.loadSoundFiles();

    // Register this instance globally for hot reload cleanup
    (window as any).__soundService = this;
  }

  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn("Web Audio API not supported, sounds will be disabled");
    }
  }

  // Load mute state from localStorage
  private loadMuteState(): void {
    try {
      const savedMuteState = localStorage.getItem("soundService_muted");
      if (savedMuteState !== null) {
        this.isMuted = JSON.parse(savedMuteState);
      }
    } catch (error) {
      console.warn("Failed to load mute state from localStorage:", error);
    }
  }

  // Save mute state to localStorage
  private saveMuteState(): void {
    try {
      localStorage.setItem("soundService_muted", JSON.stringify(this.isMuted));
    } catch (error) {
      console.warn("Failed to save mute state to localStorage:", error);
    }
  }

  // Load volume settings from localStorage
  private loadVolumeSettings(): void {
    try {
      const savedMasterVolume = localStorage.getItem(
        "soundService_masterVolume"
      );
      if (savedMasterVolume !== null) {
        this.masterVolume = Math.max(
          0,
          Math.min(1, parseFloat(savedMasterVolume))
        );
      }

      const savedSfxVolume = localStorage.getItem("soundService_sfxVolume");
      if (savedSfxVolume !== null) {
        this.sfxVolume = Math.max(0, Math.min(1, parseFloat(savedSfxVolume)));
      }

      const savedMusicVolume = localStorage.getItem("soundService_musicVolume");
      if (savedMusicVolume !== null) {
        this.musicVolume = Math.max(
          0,
          Math.min(1, parseFloat(savedMusicVolume))
        );
      }
    } catch (error) {
      console.warn("Failed to load volume settings from localStorage:", error);
    }
  }

  // Save volume settings to localStorage
  private saveVolumeSettings(): void {
    try {
      localStorage.setItem(
        "soundService_masterVolume",
        this.masterVolume.toString()
      );
      localStorage.setItem("soundService_sfxVolume", this.sfxVolume.toString());
      localStorage.setItem(
        "soundService_musicVolume",
        this.musicVolume.toString()
      );
    } catch (error) {
      console.warn("Failed to save volume settings to localStorage:", error);
    }
  }

  // Load all sound files
  private async loadSoundFiles(): Promise<void> {
    if (!this.audioContext) return;

    const soundFiles = {
      laser: "/sounds/laser-shot.mp3",
      missile: "/sounds/rocket-fire.mp3", // Use rocket firing sound for missiles
      explosion: "/sounds/missle-explosion.mp3",
      powerup: "/sounds/power-up.mp3",
      hit: "/sounds/laser-hit.mp3",
      move: "/sounds/player-move.mp3",
      background: "/sounds/background-music.mp3",
    };

    const loadPromises = Object.entries(soundFiles).map(
      async ([name, path]) => {
        try {
          const response = await fetch(path);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer =
            await this.audioContext!.decodeAudioData(arrayBuffer);
          this.soundBuffers.set(name, audioBuffer);
          this.loadedSounds.add(name);
        } catch (error) {
          console.warn(`Failed to load sound: ${name}`, error);
        }
      }
    );

    await Promise.all(loadPromises);
    console.log(`Loaded ${this.loadedSounds.size} sound files`);

    // Start background music if not muted
    if (!this.isMuted) {
      setTimeout(() => this.startBackgroundMusic(), 100);
    }
  }

  // Play different sound effects
  playSound(soundName: string, volumeMultiplier: number = 1): void {
    if (this.isMuted || !this.audioContext) return;

    // Map sound names to our loaded sounds
    const soundMap: { [key: string]: string } = {
      laser: "laser",
      missile: "missile",
      explosion: "explosion",
      powerup: "powerup",
      boost: "move", // Use move sound for boost
      roll: "move", // Use move sound for roll
      damage: "hit",
      death: "explosion",
      hit: "hit",
    };

    const mappedSoundName = soundMap[soundName] || soundName;
    const soundBuffer = this.soundBuffers.get(mappedSoundName);

    if (!soundBuffer) {
      console.warn(
        `Sound not found: ${soundName} (mapped to: ${mappedSoundName})`
      );
      return;
    }

    try {
      // Resume audio context if needed
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      // Create audio nodes
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      // Set up audio chain
      source.buffer = soundBuffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Set volume
      const volume = this.masterVolume * this.sfxVolume * volumeMultiplier;
      gainNode.gain.value = Math.min(1, volume);

      // Play the sound
      source.start(0);
    } catch (error) {
      console.warn(`Failed to play sound: ${soundName}`, error);
    }
  }

  // Start a continuous looping sound (like jet engines)
  startContinuousSound(soundName: string, volumeMultiplier: number = 1): void {
    if (this.isMuted || !this.audioContext) return;

    // Stop existing continuous sound with same name
    this.stopContinuousSound(soundName);

    const soundMap: { [key: string]: string } = {
      boost: "move",
      jet: "move",
    };

    const mappedSoundName = soundMap[soundName] || soundName;
    const soundBuffer = this.soundBuffers.get(mappedSoundName);

    if (!soundBuffer) {
      console.warn(
        `Continuous sound not found: ${soundName} (mapped to: ${mappedSoundName})`
      );
      return;
    }

    try {
      // Resume audio context if needed
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      // Create audio nodes
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      // Set up audio chain
      source.buffer = soundBuffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Set volume
      const volume = this.masterVolume * this.sfxVolume * volumeMultiplier;
      gainNode.gain.value = Math.min(1, volume);

      // Loop the sound
      source.loop = true;

      // Store reference for later control
      this.continuousSounds.set(soundName, { source, gain: gainNode });

      // Start playing
      source.start(0);
    } catch (error) {
      console.warn(`Failed to start continuous sound: ${soundName}`, error);
    }
  }

  // Stop a continuous sound
  stopContinuousSound(soundName: string): void {
    const soundData = this.continuousSounds.get(soundName);
    if (soundData) {
      try {
        soundData.source.stop();
      } catch (error) {
        // Ignore errors when stopping
      }
      this.continuousSounds.delete(soundName);
    }
  }

  // Check if a continuous sound is playing
  isContinuousSoundPlaying(soundName: string): boolean {
    return this.continuousSounds.has(soundName);
  }

  // Volume controls
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.saveVolumeSettings();
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveVolumeSettings();
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusicGain) {
      this.backgroundMusicGain.gain.value =
        this.masterVolume * this.musicVolume;
    }
    this.saveVolumeSettings();
  }

  // Background music controls
  startBackgroundMusic(): void {
    if (!this.audioContext || this.isMuted) return;

    // Use loaded background music instead of generated buffer
    const backgroundBuffer = this.soundBuffers.get("background");
    if (!backgroundBuffer) {
      console.warn("Background music not loaded");
      return;
    }

    try {
      // Stop existing music if playing
      this.stopBackgroundMusic();

      console.log("🎵 Starting background music");

      // Resume audio context if needed
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      // Create new source and gain nodes
      this.backgroundMusicSource = this.audioContext.createBufferSource();
      this.backgroundMusicGain = this.audioContext.createGain();

      // Set up the audio chain
      this.backgroundMusicSource.buffer = backgroundBuffer;
      this.backgroundMusicSource.connect(this.backgroundMusicGain);
      this.backgroundMusicGain.connect(this.audioContext.destination);

      // Set volume and loop
      this.backgroundMusicGain.gain.value =
        this.masterVolume * this.musicVolume;
      this.backgroundMusicSource.loop = true;

      // Start playing
      this.backgroundMusicSource.start(0);
    } catch (error) {
      console.warn("Failed to start background music:", error);
    }
  }

  stopBackgroundMusic(): void {
    if (this.backgroundMusicSource) {
      console.log("🎵 Stopping background music");
      try {
        this.backgroundMusicSource.stop();
      } catch (error) {
        // Ignore errors when stopping
      }
      this.backgroundMusicSource = null;
    }
    this.backgroundMusicGain = null;
  }

  // Check if background music is currently playing
  isBackgroundMusicPlaying(): boolean {
    return this.backgroundMusicSource !== null;
  }

  // Mute/unmute
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.saveMuteState(); // Save to localStorage
    if (this.isMuted) {
      this.stopBackgroundMusic();
      this.stopAllContinuousSounds();
    } else {
      // Start background music when unmuting
      setTimeout(() => this.startBackgroundMusic(), 100);
    }
    return this.isMuted;
  }

  setMuted(muted: boolean): void {
    const wasPlaying = this.isBackgroundMusicPlaying();

    this.isMuted = muted;
    this.saveMuteState(); // Save to localStorage

    if (muted) {
      this.stopBackgroundMusic();
      this.stopAllContinuousSounds();
    } else if (wasPlaying) {
      // Only restart music if it was previously playing
      setTimeout(() => this.startBackgroundMusic(), 100);
    }
  }

  // Method to manually start music (for explicit user actions)
  forceStartBackgroundMusic(): void {
    if (!this.isMuted) {
      this.startBackgroundMusic();
    }
  }

  // Stop all continuous sounds
  private stopAllContinuousSounds(): void {
    for (const [soundName] of this.continuousSounds) {
      this.stopContinuousSound(soundName);
    }
  }

  // Getters
  getMasterVolume(): number {
    return this.masterVolume;
  }

  getSFXVolume(): number {
    return this.sfxVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  isSoundMuted(): boolean {
    return this.isMuted;
  }

  // Cleanup method for hot reload protection
  cleanup(): void {
    console.log("🎵 Stopping background music");
    this.stopBackgroundMusic();

    console.log("🎵 Stopping continuous sounds");
    this.stopAllContinuousSounds();

    if (this.audioContext) {
      console.log("🎵 Closing audio context");
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Create and export a singleton instance
export const soundService = new SoundService();
