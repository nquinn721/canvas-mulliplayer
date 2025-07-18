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
  private continuousSounds: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();

  constructor() {
    this.initializeAudioContext();
    this.loadSoundFiles();
  }

  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn("Web Audio API not supported, sounds will be disabled");
    }
  }

  // Load all sound files
  private async loadSoundFiles(): Promise<void> {
    if (!this.audioContext) return;

    const soundFiles = {
      'laser': '/src/sounds/laser-shot.mp3',
      'missile': '/src/sounds/missle-explosion.mp3', // Note: using explosion for missile sound
      'explosion': '/src/sounds/missle-explosion.mp3',
      'powerup': '/src/sounds/power-up.mp3',
      'hit': '/src/sounds/laser-hit.mp3',
      'move': '/src/sounds/player-move.mp3',
      'background': '/src/sounds/background-music.mp3'
    };

    const loadPromises = Object.entries(soundFiles).map(async ([name, path]) => {
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.soundBuffers.set(name, audioBuffer);
        this.loadedSounds.add(name);
      } catch (error) {
        console.warn(`Failed to load sound: ${name}`, error);
      }
    });

    await Promise.all(loadPromises);
    console.log(`Loaded ${this.loadedSounds.size} sound files`);
  }

  // Play different sound effects
  playSound(soundName: string, volumeMultiplier: number = 1): void {
    if (this.isMuted || !this.audioContext) return;

    // Map sound names to our loaded sounds
    const soundMap: { [key: string]: string } = {
      'laser': 'laser',
      'missile': 'missile', 
      'explosion': 'explosion',
      'powerup': 'powerup',
      'boost': 'move', // Use move sound for boost
      'roll': 'move', // Use move sound for roll  
      'damage': 'hit',
      'death': 'explosion',
      'hit': 'hit'
    };

    const mappedSoundName = soundMap[soundName] || soundName;
    const soundBuffer = this.soundBuffers.get(mappedSoundName);

    if (!soundBuffer) {
      console.warn(`Sound not found: ${soundName} (mapped to: ${mappedSoundName})`);
      return;
    }

    try {
      // Resume audio context if needed
      if (this.audioContext.state === 'suspended') {
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
      'boost': 'move',
      'jet': 'move'
    };

    const mappedSoundName = soundMap[soundName] || soundName;
    const soundBuffer = this.soundBuffers.get(mappedSoundName);

    if (!soundBuffer) {
      console.warn(`Continuous sound not found: ${soundName} (mapped to: ${mappedSoundName})`);
      return;
    }

    try {
      // Resume audio context if needed
      if (this.audioContext.state === 'suspended') {
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
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusicGain) {
      this.backgroundMusicGain.gain.value =
        this.masterVolume * this.musicVolume;
    }
  }

  // Background music controls
  startBackgroundMusic(): void {
    if (!this.audioContext || this.isMuted) return;

    // Use loaded background music instead of generated buffer
    const backgroundBuffer = this.soundBuffers.get('background');
    if (!backgroundBuffer) {
      console.warn('Background music not loaded');
      return;
    }

    try {
      // Stop existing music if playing
      this.stopBackgroundMusic();

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
      try {
        this.backgroundMusicSource.stop();
      } catch (error) {
        // Ignore errors when stopping
      }
      this.backgroundMusicSource = null;
    }
    this.backgroundMusicGain = null;
  }

  // Mute/unmute
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
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
    this.isMuted = muted;
    if (muted) {
      this.stopBackgroundMusic();
      this.stopAllContinuousSounds();
    } else {
      setTimeout(() => this.startBackgroundMusic(), 100);
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
}

// Create a singleton instance
export const soundService = new SoundService();
