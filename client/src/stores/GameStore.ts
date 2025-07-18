import { makeAutoObservable } from "mobx";
import { Socket } from "socket.io-client";
import { Camera, GameState, KeyState, Projectile } from "../../../shared";
import { soundService } from "../services/SoundService";
import { ParticleSystem } from "../utils/ParticleSystem";

export class GameStore {
  // Game state
  gameState: GameState = {
    players: {},
    projectiles: [],
    walls: [],
    powerUps: {},
  };

  // Client-specific state
  playerId: string = "";
  camera: Camera;
  stats = { ping: 0, fps: 0 };
  isConnected = false;

  // Missile ability state
  lastMissileTime: number = 0;
  missileColdown: number = 3000; // 3 seconds in milliseconds

  // Input state
  keys: KeyState = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
  };

  // Client-side projectile instances for smooth rendering
  projectileInstances = new Map<string, Projectile>();

  // Particle system for effects
  particleSystem = new ParticleSystem();

  // Mouse state
  mousePosition = { x: 0, y: 0 };
  isMouseDown = false;
  lastLaserTime = 0;
  laserFireRate = 300; // Increased from 150ms to 300ms for slower shooting
  showLaserTooltip = false;

  // Socket reference
  socket: Socket | null = null;

  // World constants
  readonly WORLD_WIDTH = 5000;
  readonly WORLD_HEIGHT = 5000;
  readonly CANVAS_WIDTH = 1200;
  readonly CANVAS_HEIGHT = 800;

  constructor() {
    makeAutoObservable(this);
    this.camera = new Camera(
      0,
      0,
      this.CANVAS_WIDTH,
      this.CANVAS_HEIGHT,
      this.WORLD_WIDTH,
      this.WORLD_HEIGHT
    );
  }

  // Actions for updating state
  setSocket(socket: Socket) {
    this.socket = socket;
  }

  setPlayerId(id: string) {
    this.playerId = id;
    this.updateCameraPosition();
  }

  setGameState(gameState: GameState) {
    this.gameState = gameState;
    this.updateCameraPosition();
  }

  setConnected(connected: boolean) {
    this.isConnected = connected;
  }

  updateStats(stats: { ping?: number; fps?: number }) {
    if (stats.ping !== undefined) this.stats.ping = stats.ping;
    if (stats.fps !== undefined) this.stats.fps = stats.fps;
  }

  // Input management
  setKeyState(key: keyof KeyState, pressed: boolean) {
    this.keys[key] = pressed;
  }

  setMousePosition(x: number, y: number) {
    this.mousePosition.x = x;
    this.mousePosition.y = y;
    this.updatePlayerAngle();
    this.updateLaserTooltip();
  }

  setMouseDown(isDown: boolean) {
    this.isMouseDown = isDown;
  }

  // Check if mouse is hovering over laser upgrade icon
  updateLaserTooltip() {
    const iconSize = 50;
    const margin = 20;
    const spacing = 70;
    const x = this.CANVAS_WIDTH - iconSize - margin - spacing;
    const y = this.CANVAS_HEIGHT - iconSize - margin;

    const mouseX = this.mousePosition.x;
    const mouseY = this.mousePosition.y;

    this.showLaserTooltip =
      mouseX >= x &&
      mouseX <= x + iconSize &&
      mouseY >= y &&
      mouseY <= y + iconSize;
  }

  // Camera management
  updateCameraPosition() {
    if (this.playerId && this.gameState.players[this.playerId]) {
      const player = this.gameState.players[this.playerId];
      this.camera.setPosition(player.x, player.y, true);
    }
  }

  // Player angle update based on mouse position
  updatePlayerAngle() {
    if (
      !this.socket ||
      !this.playerId ||
      !this.gameState.players[this.playerId]
    ) {
      return;
    }

    const player = this.gameState.players[this.playerId];
    const worldMouse = this.camera.screenToWorld(
      this.mousePosition.x,
      this.mousePosition.y
    );
    const angle = Math.atan2(worldMouse.y - player.y, worldMouse.x - player.x);

    this.socket.emit("updateAngle", { angle });
  }

  // Input handling
  sendInput() {
    if (!this.socket || !this.playerId) return;

    const inputChanged = Object.values(this.keys).some((value) => value);
    if (inputChanged) {
      this.socket.emit("input", this.keys);
    }
  }

  // Shooting
  shoot() {
    if (
      !this.socket ||
      !this.playerId ||
      !this.gameState.players[this.playerId]
    ) {
      return;
    }

    const currentTime = Date.now();
    if (currentTime - this.lastLaserTime < this.laserFireRate) {
      return; // Still on fire rate cooldown
    }

    const player = this.gameState.players[this.playerId];
    const worldMouse = this.camera.screenToWorld(
      this.mousePosition.x,
      this.mousePosition.y
    );
    const angle = Math.atan2(worldMouse.y - player.y, worldMouse.x - player.x);

    // Always shoot laser with mouse
    this.socket.emit("shoot", {
      x: player.x,
      y: player.y,
      angle,
      weapon: "laser",
    });

    this.lastLaserTime = currentTime;
  }

  // Update continuous shooting
  updateShooting() {
    if (this.isMouseDown) {
      const currentTime = Date.now();
      // Check laser cooldown before shooting
      if (currentTime - this.lastLaserTime >= this.laserFireRate) {
        this.shoot();
        this.lastLaserTime = currentTime;
        soundService.playSound("laser", 0.2); // Reduced volume for continuous shooting
      }
    }
  }

  // Missile ability
  shootMissile() {
    if (
      !this.socket ||
      !this.playerId ||
      !this.gameState.players[this.playerId]
    ) {
      return;
    }

    const currentTime = Date.now();
    if (currentTime - this.lastMissileTime < this.missileColdown) {
      return; // Still on cooldown
    }

    const player = this.gameState.players[this.playerId];
    const worldMouse = this.camera.screenToWorld(
      this.mousePosition.x,
      this.mousePosition.y
    );
    const angle = Math.atan2(worldMouse.y - player.y, worldMouse.x - player.x);

    // Shoot missile
    this.socket.emit("shoot", {
      x: player.x,
      y: player.y,
      angle,
      weapon: "missile",
    });

    // Update cooldown
    this.lastMissileTime = currentTime;
  }

  // Projectile management
  updateProjectiles(deltaTime: number) {
    this.projectileInstances.forEach((projectile, id) => {
      projectile.update(deltaTime);
      if (projectile.isExpired()) {
        this.projectileInstances.delete(id);
      }
    });
  }

  removeProjectile(id: string) {
    this.projectileInstances.delete(id);
  }

  // Computed values
  get currentPlayer() {
    return this.playerId ? this.gameState.players[this.playerId] : null;
  }

  get playerCount() {
    return Object.keys(this.gameState.players).length;
  }

  get isInputActive() {
    return Object.values(this.keys).some((value) => value);
  }

  get worldMousePosition() {
    return this.camera.screenToWorld(
      this.mousePosition.x,
      this.mousePosition.y
    );
  }

  // Missile cooldown properties
  get missileCooldowRemaining() {
    const currentTime = Date.now();
    const remaining =
      this.missileColdown - (currentTime - this.lastMissileTime);
    return Math.max(0, remaining);
  }

  get missileCooldownPercent() {
    return 1 - this.missileCooldowRemaining / this.missileColdown;
  }

  get isMissileReady() {
    return this.missileCooldowRemaining === 0;
  }

  // Helper methods
  isPlayerInView(player: any) {
    return this.camera.isInView(player);
  }

  isWallInView(wall: any) {
    return this.camera.isInView(wall);
  }

  isProjectileInView(projectile: any) {
    return this.camera.isInView(projectile);
  }

  isPowerUpInView(powerUp: any) {
    return this.camera.isInView(powerUp);
  }

  // Particle system methods
  updateParticles(deltaTime: number) {
    this.particleSystem.update(deltaTime);
  }

  createExplosion(x: number, y: number, type: "laser" | "missile" = "laser") {
    this.particleSystem.createExplosion(x, y, type);
  }

  handleProjectileHit(data: {
    x: number;
    y: number;
    projectileId: string;
    targetId?: string;
    wallHit?: boolean;
  }) {
    // Determine projectile type from the projectile data before it's removed
    let projectileType: "laser" | "missile" = "laser";
    const projectile = this.gameState.projectiles.find(
      (p) => p.id === data.projectileId
    );
    if (projectile) {
      projectileType = projectile.type;
    }

    // Create explosion effect
    this.createExplosion(data.x, data.y, projectileType);

    // Remove the projectile
    this.removeProjectile(data.projectileId);
  }

  // Cleanup
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setConnected(false);
    this.projectileInstances.clear();
    this.particleSystem.clear();
  }

  reset() {
    this.gameState = {
      players: {},
      projectiles: [],
      walls: [],
      powerUps: {},
    };
    this.playerId = "";
    this.projectileInstances.clear();
    this.particleSystem.clear();
    this.setConnected(false);
    this.camera.setPosition(0, 0);
  }
}
