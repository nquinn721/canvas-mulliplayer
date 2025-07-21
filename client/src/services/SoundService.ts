export class SoundService {
  private audioContext: AudioContext | null = null;
  private masterVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.3;
  private isMuted: boolean = false;
  private selectedMusicTrack: number = 1; // Default to track 1
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

      const savedMusicTrack = localStorage.getItem("soundService_musicTrack");
      if (savedMusicTrack !== null) {
        this.selectedMusicTrack = Math.max(
          1,
          Math.min(4, parseInt(savedMusicTrack))
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
      localStorage.setItem(
        "soundService_musicTrack",
        this.selectedMusicTrack.toString()
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
      boost: "/sounds/boost.mp3", // Boost thruster sound
      levelup: "/sounds/level-up.mp3", // Level up sound
      background: "/sounds/background-music-1.mp3",
      background2: "/sounds/background-music-2.mp3",
      background3: "/sounds/background-music-3.mp3",
      background4: "/sounds/background-music-4.mp3",
      death: "/sounds/death.mp3",
      flash: "/sounds/flash.mp3",
      kill: "/sounds/kill.mp3",
    };

    const loadPromises = Object.entries(soundFiles).map(
      async ([name, path]) => {
        try {
          console.log(`Loading sound: ${name} from ${path}`);
          const response = await fetch(path);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          console.log(
            `Fetch successful for ${name}, size: ${response.headers.get("content-length")} bytes`
          );
          const arrayBuffer = await response.arrayBuffer();
          console.log(
            `ArrayBuffer created for ${name}, size: ${arrayBuffer.byteLength} bytes`
          );

          const audioBuffer =
            await this.audioContext!.decodeAudioData(arrayBuffer);
          console.log(`Successfully decoded ${name}`);
          this.soundBuffers.set(name, audioBuffer);
          this.loadedSounds.add(name);
        } catch (error) {
          console.warn(`Failed to load sound: ${name}`, error);
        }
      }
    );

    await Promise.all(loadPromises);

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
      boost: "boost", // Use dedicated boost sound
      roll: "move", // Use move sound for roll
      movement: "move", // Use move sound for regular movement (at half volume)
      damage: "hit",
      death: "death", // Use dedicated death sound
      hit: "hit",
      flash: "flash", // Use dedicated flash sound
      kill: "kill", // Use dedicated kill sound
      levelup: "levelup", // Use dedicated level-up sound
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
      boost: "boost", // Use dedicated boost sound
      jet: "boost", // Also map jet to boost sound
      movement: "move", // Use move sound for regular movement
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

      // Special handling for boost sound - only play first 25%
      if (soundName === "boost" || soundName === "jet") {
        const duration25Percent = soundBuffer.duration * 0.25;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = duration25Percent;
      } else {
        // Normal looping for other sounds
        source.loop = true;
      }

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

    // Get the selected background music track
    const trackKey =
      this.selectedMusicTrack === 1
        ? "background"
        : `background${this.selectedMusicTrack}`;
    const backgroundBuffer = this.soundBuffers.get(trackKey);
    if (!backgroundBuffer) {
      console.warn(
        `Background music track ${this.selectedMusicTrack} not loaded`
      );
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

  // Handle death - stop music and play death sound
  playDeathSound(): void {
    // Stop background music
    this.stopBackgroundMusic();

    // Play death sound
    this.playSound("death", 1.0);
  }

  // Handle respawn or return to home - restart background music
  handleRevive(): void {
    if (!this.isMuted) {
      // Small delay to let death sound finish
      setTimeout(() => {
        this.startBackgroundMusic();
      }, 500);
    }
  }

  // Music track selection
  setMusicTrack(trackNumber: number): void {
    console.log(`Setting music track to ${trackNumber}`);
    this.selectedMusicTrack = Math.max(1, Math.min(4, trackNumber));
    this.saveVolumeSettings();

    // Always stop current music first if playing
    const wasPlaying = this.isBackgroundMusicPlaying();
    console.log(`Was playing: ${wasPlaying}, isMuted: ${this.isMuted}`);
    if (wasPlaying) {
      this.stopBackgroundMusic();
    }

    // Always start the new track (unless muted)
    if (!this.isMuted) {
      // Small delay to ensure the previous track is fully stopped
      setTimeout(() => {
        console.log(
          `Starting background music for track ${this.selectedMusicTrack}`
        );
        this.startBackgroundMusic();
      }, 50);
    }
  }
  getMusicTrack(): number {
    return this.selectedMusicTrack;
  }

  // Play flash sound with quicker timing
  playFlashSound(): void {
    this.playSound("flash", 0.8); // Slightly quieter and quicker
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
    this.stopBackgroundMusic();
    this.stopAllContinuousSounds();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Create and export a singleton instance
export const soundService = new SoundService();
