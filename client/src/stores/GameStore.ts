import { Camera, GameState, KeyState, Projectile } from "@shared";
import { makeAutoObservable } from "mobx";
import { Socket } from "socket.io-client";
import { soundService } from "../services/SoundService";
import { ParticleSystem } from "../utils/ParticleSystem";

export class GameStore {
  // Game state
  gameState: GameState = {
    players: {},
    aiEnemies: {},
    projectiles: [],
    meteors: [],
    stars: [],
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
    q: false,
    e: false,
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

  // Socket reference
  socket: Socket | null = null;

  // World constants
  readonly WORLD_WIDTH = 5000;
  readonly WORLD_HEIGHT = 5000;

  // Canvas dimensions (dynamic, updates with window resize)
  CANVAS_WIDTH = window.innerWidth;
  CANVAS_HEIGHT = window.innerHeight - 50; // Account for header

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

  // Update canvas dimensions when window resizes
  updateCanvasDimensions(width: number, height: number) {
    this.CANVAS_WIDTH = width;
    this.CANVAS_HEIGHT = height;
    // Update camera dimensions as well
    this.camera.viewportWidth = width;
    this.camera.viewportHeight = height;
  }

  setPlayerId(id: string) {
    this.playerId = id;
    this.updateCameraPosition();
  }

  setGameState(gameState: GameState) {
    // Check for level-up before updating state
    const currentPlayer = this.gameState.players[this.playerId];
    const newPlayer = gameState.players[this.playerId];
    
    if (currentPlayer && newPlayer && currentPlayer.level < newPlayer.level) {
      // Player leveled up! Play level-up sound
      soundService.playSound("levelup", 0.8);
      console.log(`Level up! You are now level ${newPlayer.level}`);
    }
    
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

  // Clear all key states (useful for respawn to prevent stuck movement)
  clearAllKeys() {
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      q: false,
      e: false,
      shift: false,
      ArrowUp: false,
      ArrowLeft: false,
      ArrowDown: false,
      ArrowRight: false,
    };
  }

  setMousePosition(x: number, y: number) {
    this.mousePosition.x = x;
    this.mousePosition.y = y;
    this.updatePlayerAngle();
  }

  setMouseDown(isDown: boolean) {
    this.isMouseDown = isDown;
  }

  // Camera management
  updateCameraPosition() {
    if (this.playerId && this.gameState.players[this.playerId]) {
      const player = this.gameState.players[this.playerId];

      // Set the follow target with boost state for adaptive smoothing
      this.camera.setFollowTarget({
        x: player.x,
        y: player.y,
        isBoostActive: player.isBoostActive,
      });

      // Use smooth camera following for better experience
      this.camera.update(true);
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

    // Always send input state to ensure server has the latest state
    this.socket.emit("input", this.keys);
  }

  // Shooting
  shoot(): boolean {
    if (
      !this.socket ||
      !this.playerId ||
      !this.gameState.players[this.playerId]
    ) {
      return false;
    }

    const currentTime = Date.now();
    if (currentTime - this.lastLaserTime < this.laserFireRate) {
      return false; // Still on fire rate cooldown
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

    // Play laser sound
    soundService.playSound("laser", 0.2);

    return true; // Successfully fired
  }

  // Update continuous shooting
  updateShooting() {
    if (this.isMouseDown) {
      this.shoot();
    }
  }

  // Missile ability
  shootMissile(): boolean {
    if (
      !this.socket ||
      !this.playerId ||
      !this.gameState.players[this.playerId]
    ) {
      return false;
    }

    const currentTime = Date.now();
    if (currentTime - this.lastMissileTime < this.missileColdown) {
      return false; // Still on cooldown
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
    return true; // Successfully fired missile
  }

  // Flash ability
  useFlash(): boolean {
    if (
      !this.socket ||
      !this.playerId ||
      !this.gameState.players[this.playerId]
    ) {
      return false;
    }

    const player = this.gameState.players[this.playerId];
    const currentTime = Date.now();

    // Check if flash is available (manually check cooldown since player is serialized data)
    const flashCooldown = player.flashCooldown || 5000; // Default 5 second cooldown
    const lastFlashTime = player.lastFlashTime || 0;
    const cooldownRemaining = flashCooldown - (currentTime - lastFlashTime);

    if (currentTime - lastFlashTime < flashCooldown) {
      return false; // Still on cooldown
    }

    const worldMouse = this.camera.screenToWorld(
      this.mousePosition.x,
      this.mousePosition.y
    );

    // Send flash request to server
    this.socket.emit("flash", {
      mouseX: worldMouse.x,
      mouseY: worldMouse.y,
    });

    // Play flash sound
    soundService.playFlashSound();

    return true; // Successfully initiated flash
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
    const humanPlayers = Object.keys(this.gameState.players).length;
    const aiEnemies = this.gameState.aiEnemies
      ? Object.keys(this.gameState.aiEnemies).length
      : 0;
    return humanPlayers + aiEnemies;
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

  // Flash cooldown properties
  get flashCooldownRemaining() {
    const player = this.gameState.players[this.playerId];
    if (!player) return 0;

    const currentTime = Date.now();
    const flashCooldown = player.flashCooldown || 5000;
    const lastFlashTime = player.lastFlashTime || 0;
    const remaining = flashCooldown - (currentTime - lastFlashTime);

    return Math.max(0, remaining);
  }

  get flashCooldownPercent() {
    const player = this.gameState.players[this.playerId];
    if (!player) return 1;

    const flashCooldown = player.flashCooldown || 5000;
    return 1 - this.flashCooldownRemaining / flashCooldown;
  }

  get isFlashReady() {
    return this.flashCooldownRemaining === 0;
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

  createWindEffect(
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
    angle: number
  ) {
    this.particleSystem.createWindEffect(x, y, velocityX, velocityY, angle);
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
      (p: any) => p.id === data.projectileId
    );
    if (projectile) {
      projectileType = projectile.type;
    }

    // Create explosion effect
    this.createExplosion(data.x, data.y, projectileType);

    // Remove the projectile
    this.removeProjectile(data.projectileId);
  }

  // Meteor handling methods
  handleMeteorHit(data: {
    x: number;
    y: number;
    meteorId: string;
    targetId?: string;
    wallHit?: boolean;
    damage?: number;
  }) {
    // Create large explosion effect for meteor impact
    this.createExplosion(data.x, data.y, "missile");

    // Add additional explosion effects for meteor impact
    this.particleSystem.createExplosion(data.x, data.y, "missile");
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
      aiEnemies: {},
      projectiles: [],
      meteors: [],
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
