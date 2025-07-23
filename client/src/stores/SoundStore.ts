import { makeAutoObservable } from "mobx";
import { makePersistable } from "mobx-persist-store";

export class SoundStore {
  // Sound settings
  isMuted: boolean = false;
  masterVolume: number = 0.5;
  sfxVolume: number = 0.7;
  musicVolume: number = 0.3;
  selectedMusicTrack: number = 1;

  constructor() {
    makeAutoObservable(this);

    makePersistable(this, {
      name: "SoundStore",
      properties: [
        "isMuted",
        "masterVolume",
        "sfxVolume",
        "musicVolume",
        "selectedMusicTrack",
      ],
      storage: window.localStorage,
    });
  }

  // Actions
  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
  }

  setSelectedMusicTrack(track: number) {
    this.selectedMusicTrack = track;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
  }
}
