import { Camera, GameState, KeyState, Projectile } from "@shared";
import { SCORING_CONFIG, ScoringUtils } from "@shared/config/ScoringConfig";
import { makeAutoObservable, runInAction } from "mobx";
import { Socket } from "socket.io-client";
import { calculateLevelFromExperience } from "../../../shared/config/ExperienceConfig";
import { debugLogger } from "../services/DebugLogger";
import { ExperienceService } from "../services/ExperienceService";
import { LatencyCompensationService } from "../services/LatencyCompensationService";
import { soundService } from "../services/SoundService";
import { ParticleSystem } from "../utils/ParticleSystem";

export class GameStore {
  // Game state
  gameState: GameState = {
    players: {},
    aiEnemies: {},
    swarmEnemies: {},
    projectiles: [],
    meteors: [],
    walls: [],
    powerUps: {},
  };

  // Client-specific state
  playerId: string = "";
  camera: Camera;
  stats = { ping: 0, fps: 0 };
  isConnected = false;

  // Game session stats
  gameStats = {
    score: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    gameStartTime: 0,
    lastKillTime: 0,
    currentKillStreak: 0,
    maxKillStreak: 0,
    damageDealt: 0,
    damageTaken: 0,
    powerUpsCollected: 0,
    enemiesDestroyed: 0,
    meteorsDestroyed: 0,
    headshots: 0,
    // Time-based tracking
    killTimes: [] as number[],
    lastHitTime: 0,
    hitStreak: 0,
    consecutiveHits: 0,
    comboStartTime: 0,
    comboActionCount: 0,
    currentHitMultiplier: 1.0,
    // Survival scoring
    lastSurvivalScoreTime: 0,
    survivalBonusMultiplier: 1.0,
    totalSurvivalScore: 0,
  };

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

  // Latency compensation service
  latencyCompensation: LatencyCompensationService | null = null;

  // Experience service for managing XP/levels
  experienceService: ExperienceService | null = null;

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

  // Initialize experience service with auth store
  initializeExperienceService(authStore: any) {
    this.experienceService = new ExperienceService(authStore);
  }

  // Test method to simulate gaining experience (for testing)
  testGainExperience(amount: number = 50) {
    if (this.experienceService) {
      console.log(`Gaining ${amount} XP...`);
      this.experienceService.addExperience(amount);
    }
  }

  // Test method to validate level calculations across systems
  testLevelCalculations() {
    if (this.experienceService) {
      const data = this.experienceService.getCurrentExperienceData();
      console.log("=== Level Calculation Test ===");
      console.log(`Current Experience: ${data.experience}`);
      console.log(`Calculated Level: ${data.level}`);
      console.log(`XP for Current Level: ${data.experienceToNextLevel}`);
      console.log(
        `XP Required for Next Level: ${data.experienceRequiredForNextLevel}`
      );
      console.log(`Progress: ${data.progressPercent.toFixed(1)}%`);

      // Test a few level calculations
      console.log("\n=== Level Progression Examples ===");
      for (let xp of [0, 100, 250, 475, 812, 1368, 2202, 3453, 5329, 8143]) {
        const level = calculateLevelFromExperience(xp);
        console.log(`${xp} XP = Level ${level}`);
      }
    }
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
    const previousId = this.playerId;

    // Only update and log if the ID actually changed
    if (previousId === id) {
      return; // No change, exit early
    }

    this.playerId = id;

    // Initialize latency compensation for this player
    if (id && !this.latencyCompensation) {
      this.latencyCompensation = new LatencyCompensationService(id);
    } else if (
      this.latencyCompensation &&
      this.latencyCompensation["playerId"] !== id
    ) {
      // Player ID changed, create new service
      this.latencyCompensation = new LatencyCompensationService(id);
    }

    // Debug logging only for actual player ID changes
    debugLogger.logStateIssue(
      "Player ID changed",
      {
        previousId,
        newId: id,
        timestamp: Date.now(),
        hasPlayers: Object.keys(this.gameState.players).length > 0,
        playerExists: !!this.gameState.players[id],
      },
      "LOW" // Reduced severity since this is normal during connection
    );

    this.updateCameraPosition();
  }

  setGameState(gameState: GameState) {
    // Check for level-up before updating state
    const currentPlayer = this.gameState.players[this.playerId];
    const newPlayer = gameState.players[this.playerId];

    if (currentPlayer && newPlayer && currentPlayer.level < newPlayer.level) {
      // Player leveled up! Play level-up sound
      soundService.playSound("levelup", 0.8);
      this.triggerLevelUpEffect();
    }

    // Check for destroyed entities for effects
    this.detectDestroyedEntities(this.gameState, gameState);

    // Check for player spawn/respawn (first appearance or coming back to life)
    if (this.playerId && newPlayer) {
      const wasAlive = currentPlayer && currentPlayer.health > 0;
      const isNowAlive = newPlayer.health > 0;

      // Player died - track the death
      if (wasAlive && !isNowAlive) {
        this.addDeath();
      }

      // Player spawned for the first time or respawned after death
      if (!wasAlive && isNowAlive) {
        // Create spawn indicator effect
        this.createSpawnIndicator(newPlayer.x, newPlayer.y);
      }
    }

    // Store game state for latency compensation
    if (this.latencyCompensation) {
      this.latencyCompensation.recordGameState(gameState);

      // Initialize predicted state if needed
      if (newPlayer && !this.latencyCompensation.getPredictedPlayerState()) {
        this.latencyCompensation.initializePredictedState(newPlayer);
      }
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

  // Game stats management
  initializeGameSession() {
    this.gameStats = {
      score: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      gameStartTime: Date.now(),
      lastKillTime: 0,
      currentKillStreak: 0,
      maxKillStreak: 0,
      damageDealt: 0,
      damageTaken: 0,
      powerUpsCollected: 0,
      enemiesDestroyed: 0,
      meteorsDestroyed: 0,
      headshots: 0,
      // Time-based tracking
      killTimes: [],
      lastHitTime: 0,
      hitStreak: 0,
      consecutiveHits: 0,
      comboStartTime: 0,
      comboActionCount: 0,
      currentHitMultiplier: 1.0,
      // Survival scoring
      lastSurvivalScoreTime: Date.now(),
      survivalBonusMultiplier: 1.0,
      totalSurvivalScore: 0,
    };
  }

  addKill(isHeadshot: boolean = false, isPlayerKill: boolean = true) {
    const currentTime = Date.now();
    this.gameStats.kills++;
    this.gameStats.currentKillStreak++;
    this.gameStats.lastKillTime = currentTime;
    this.gameStats.killTimes.push(currentTime);

    // Keep only recent kill times (last 10 kills for performance)
    if (this.gameStats.killTimes.length > 10) {
      this.gameStats.killTimes = this.gameStats.killTimes.slice(-10);
    }

    if (this.gameStats.currentKillStreak > this.gameStats.maxKillStreak) {
      this.gameStats.maxKillStreak = this.gameStats.currentKillStreak;
    }

    if (isHeadshot) {
      this.gameStats.headshots++;
    }

    // Award experience points based on kill type
    if (this.experienceService) {
      // Use constants from shared config - 50 XP for player kills, 20 XP for AI kills
      const xpGained = isPlayerKill ? 50 : 20;
      this.experienceService.addExperience(xpGained);
    }

    // Calculate score with time-based multipliers
    this.calculateAndAddScore("kill", {
      isHeadshot,
      streakCount: this.gameStats.currentKillStreak,
      killTimes: this.gameStats.killTimes,
      currentTime,
    });
  }

  addDeath() {
    this.gameStats.deaths++;
    this.gameStats.currentKillStreak = 0; // Reset kill streak on death

    // Subtract score for death
    this.calculateAndAddScore("death");
  }

  addAssist() {
    this.gameStats.assists++;

    // Add score for assist
    this.calculateAndAddScore("assist");
  }

  addHit(damage: number = 0) {
    const currentTime = Date.now();

    // Update hit streak
    const streakData = ScoringUtils.updateHitStreak(
      SCORING_CONFIG,
      this.gameStats.lastHitTime,
      currentTime,
      this.gameStats.hitStreak
    );

    this.gameStats.hitStreak = streakData.streak;
    this.gameStats.currentHitMultiplier = streakData.multiplier;
    this.gameStats.lastHitTime = currentTime;

    // Update consecutive hits (resets if too much time passed)
    if (
      currentTime - this.gameStats.lastHitTime <=
      SCORING_CONFIG.timeBasedMultipliers.hitStreakWindow
    ) {
      this.gameStats.consecutiveHits++;
    } else {
      this.gameStats.consecutiveHits = 1;
    }

    // Update combo tracking
    if (this.gameStats.comboStartTime === 0) {
      this.gameStats.comboStartTime = currentTime;
      this.gameStats.comboActionCount = 1;
    } else {
      this.gameStats.comboActionCount++;
    }

    // Add damage dealt
    if (damage > 0) {
      this.addDamageDealt(damage);
    }

    // Calculate hit score with multipliers
    this.calculateAndAddScore("hit", {
      consecutiveHits: this.gameStats.consecutiveHits,
      hitStreakMultiplier: this.gameStats.currentHitMultiplier,
      comboStartTime: this.gameStats.comboStartTime,
      comboActionCount: this.gameStats.comboActionCount,
      currentTime,
    });
  }

  addDamageDealt(damage: number) {
    this.gameStats.damageDealt += damage;
  }

  addDamageTaken(damage: number) {
    this.gameStats.damageTaken += damage;

    // Small score penalty for damage taken
    this.calculateAndAddScore("damageTaken", { damage });
  }

  addPowerUpCollected() {
    this.gameStats.powerUpsCollected++;
    this.calculateAndAddScore("powerUpCollection");
  }

  addEnemyDestroyed(enemyX?: number, enemyY?: number) {
    this.gameStats.enemiesDestroyed++;
    this.calculateAndAddScore("enemyDestroyed");

    // Trigger explosion effect if position is provided
    if (enemyX !== undefined && enemyY !== undefined) {
      this.triggerEnemyKillEffect(enemyX, enemyY);
    }
  }

  addMeteorDestroyed(meteorX?: number, meteorY?: number) {
    this.gameStats.meteorsDestroyed++;
    this.calculateAndAddScore("meteorDestroyed");

    // Trigger explosion effect if position is provided
    if (meteorX !== undefined && meteorY !== undefined) {
      this.triggerMeteorImpactEffect(meteorX, meteorY);
    }
  }

  // Calculate and add score based on action
  private calculateAndAddScore(action: string, params?: any) {
    let scoreToAdd = 0;

    switch (action) {
      case "kill":
        scoreToAdd = ScoringUtils.calculateKillScore(
          SCORING_CONFIG,
          params?.isHeadshot || false,
          params?.streakCount || 0,
          false // firstBlood - TODO: implement
        );

        // Apply rapid kill multiplier
        if (params?.killTimes && params?.currentTime) {
          const rapidMultiplier = ScoringUtils.calculateRapidKillMultiplier(
            SCORING_CONFIG,
            params.killTimes,
            params.currentTime
          );
          scoreToAdd = Math.floor(scoreToAdd * rapidMultiplier);
        }
        break;

      case "hit":
        scoreToAdd = ScoringUtils.calculateHitScore(
          SCORING_CONFIG,
          params?.consecutiveHits || 0,
          params?.hitStreakMultiplier || 1.0
        );

        // Apply combo multiplier
        if (
          params?.comboStartTime &&
          params?.currentTime &&
          params?.comboActionCount
        ) {
          const comboMultiplier = ScoringUtils.calculateComboMultiplier(
            SCORING_CONFIG,
            params.comboStartTime,
            params.currentTime,
            params.comboActionCount
          );
          scoreToAdd = Math.floor(scoreToAdd * comboMultiplier);
        }
        break;

      case "assist":
        scoreToAdd = SCORING_CONFIG.multipliers.assist;
        break;
      case "death":
        scoreToAdd = SCORING_CONFIG.multipliers.death;
        break;
      case "powerUpCollection":
        scoreToAdd = SCORING_CONFIG.multipliers.powerUpCollection;
        break;
      case "enemyDestroyed":
        scoreToAdd = SCORING_CONFIG.multipliers.enemyDestroyed;
        break;
      case "meteorDestroyed":
        scoreToAdd = SCORING_CONFIG.multipliers.meteorDestroyed;
        break;
      case "damageTaken":
        scoreToAdd =
          SCORING_CONFIG.multipliers.damageTaken * (params?.damage || 0);
        break;
    }

    this.gameStats.score = Math.max(0, this.gameStats.score + scoreToAdd);
  }

  // Simple method to add score directly (used by survival scoring)
  addScore(points: number) {
    this.gameStats.score = Math.max(0, this.gameStats.score + points);
  }

  // Check and reset combos/streaks if too much time has passed
  updateTimeBasedTracking() {
    const currentTime = Date.now();

    // Update survival scoring continuously
    this.updateSurvivalScore(currentTime);

    // Reset combo if it has expired
    if (this.gameStats.comboStartTime > 0) {
      const comboDuration = currentTime - this.gameStats.comboStartTime;
      if (comboDuration > SCORING_CONFIG.timeBasedMultipliers.comboDuration) {
        this.gameStats.comboStartTime = 0;
        this.gameStats.comboActionCount = 0;
      }
    }

    // Reset hit streak if too much time has passed
    if (this.gameStats.lastHitTime > 0) {
      const timeSinceLastHit = currentTime - this.gameStats.lastHitTime;
      if (
        timeSinceLastHit > SCORING_CONFIG.timeBasedMultipliers.hitStreakWindow
      ) {
        this.gameStats.hitStreak = 0;
        this.gameStats.consecutiveHits = 0;
        this.gameStats.currentHitMultiplier = 1.0;
      }
    }
  }

  // Update survival score continuously (called every frame)
  updateSurvivalScore(currentTime: number) {
    // Only award survival points if the game has started
    if (this.gameStats.gameStartTime === 0) return;

    // Award survival points every second
    const timeSinceLastSurvivalScore =
      currentTime - this.gameStats.lastSurvivalScoreTime;
    if (timeSinceLastSurvivalScore >= 1000) {
      // Every 1 second
      const survivalTimeMs = currentTime - this.gameStats.gameStartTime;
      const survivalData = ScoringUtils.calculateProgressiveSurvivalScore(
        SCORING_CONFIG,
        survivalTimeMs
      );

      // Calculate the score for this second
      const scoreThisSecond = Math.floor(
        survivalData.score - this.gameStats.totalSurvivalScore
      );

      if (scoreThisSecond > 0) {
        this.gameStats.totalSurvivalScore = survivalData.score;
        this.gameStats.survivalBonusMultiplier = survivalData.multiplier;
        this.gameStats.score = Math.max(
          0,
          this.gameStats.score + scoreThisSecond
        );
      }

      this.gameStats.lastSurvivalScoreTime = currentTime;
    }
  }

  // Computed values for display
  get currentKDA(): string {
    const k = this.gameStats.kills;
    const d = Math.max(1, this.gameStats.deaths); // Avoid division by zero
    const a = this.gameStats.assists;
    const ratio = ((k + a) / d).toFixed(2);
    return `${k}/${this.gameStats.deaths}/${a} (${ratio})`;
  }

  get killDeathRatio(): number {
    const deaths = Math.max(1, this.gameStats.deaths);
    return this.gameStats.kills / deaths;
  }

  get survivalTime(): number {
    if (this.gameStats.gameStartTime === 0) return 0;
    return Date.now() - this.gameStats.gameStartTime;
  }

  // Effect triggers - keeping methods for compatibility
  private triggerEnemyKillEffect(enemyX: number, enemyY: number) {
    // Only 2D particle effects now
    console.log("Enemy kill effect at", enemyX, enemyY);
  }

  private triggerMeteorImpactEffect(meteorX: number, meteorY: number) {
    // Only 2D particle effects now
    console.log("Meteor impact effect at", meteorX, meteorY);
  }

  private triggerLevelUpEffect() {
    const currentPlayer = this.currentPlayer;
    if (!currentPlayer) return;

    // Only 2D particle effects now
    console.log("Level up effect at", currentPlayer.x, currentPlayer.y);
  }

  private detectDestroyedEntities(
    oldGameState: GameState,
    newGameState: GameState
  ) {
    // Detect destroyed AI enemies
    Object.keys(oldGameState.aiEnemies).forEach((enemyId) => {
      if (!newGameState.aiEnemies[enemyId]) {
        // Enemy was destroyed
        const destroyedEnemy = oldGameState.aiEnemies[enemyId];
        this.addEnemyDestroyed(destroyedEnemy.x, destroyedEnemy.y);
      }
    });

    // Detect destroyed swarm enemies
    Object.keys(oldGameState.swarmEnemies).forEach((swarmId) => {
      if (!newGameState.swarmEnemies[swarmId]) {
        // Swarm enemy was destroyed
        const destroyedSwarm = oldGameState.swarmEnemies[swarmId];
        // Only 2D particle effects now
        console.log("Swarm destruction at", destroyedSwarm.x, destroyedSwarm.y);
      }
    });

    // Detect destroyed meteors
    const oldMeteorIds = new Set(oldGameState.meteors.map((m: any) => m.id));
    const newMeteorIds = new Set(newGameState.meteors.map((m: any) => m.id));

    oldGameState.meteors.forEach((meteor: any) => {
      if (!newMeteorIds.has(meteor.id)) {
        // Meteor was destroyed/exploded
        this.addMeteorDestroyed(meteor.x, meteor.y);
      }
    });

    // Power-ups don't need visual effects, just sound/score
    // The existing canvas particle system handles power-up collection visuals
  }

  get survivalBonusText(): string {
    if (this.gameStats.gameStartTime === 0) return "";
    return ScoringUtils.getSurvivalBonusText(this.survivalTime, SCORING_CONFIG);
  }

  get currentSurvivalMultiplier(): number {
    return this.gameStats.survivalBonusMultiplier;
  }

  get ping(): number {
    return this.stats.ping;
  }

  // Input management
  setKeyState(key: keyof KeyState, pressed: boolean) {
    const currentPlayer = this.currentPlayer;
    const wasPressed = this.keys[key];

    this.keys[key] = pressed;

    // Debug logging for control issues
    if (pressed && !wasPressed && currentPlayer && currentPlayer.health <= 0) {
      debugLogger.logControlIssue(
        "Input received for dead player",
        {
          key: String(key),
          playerId: this.playerId,
          playerHealth: currentPlayer.health,
          playerName: currentPlayer.name,
          timestamp: Date.now(),
        },
        "HIGH"
      );
    }

    // Log if we're trying to move but have no current player
    const movementKeys = [
      "w",
      "a",
      "s",
      "d",
      "ArrowUp",
      "ArrowLeft",
      "ArrowDown",
      "ArrowRight",
    ];
    if (
      pressed &&
      !wasPressed &&
      movementKeys.includes(String(key)) &&
      !currentPlayer
    ) {
      debugLogger.logControlIssue(
        "Movement input without current player",
        {
          key: String(key),
          playerId: this.playerId,
          hasPlayerId: !!this.playerId,
          playersCount: Object.keys(this.gameState.players).length,
          timestamp: Date.now(),
        },
        "LOW" // Reduced from HIGH - this is expected during initialization
      );
    }
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

    // Record angle for latency compensation
    if (this.latencyCompensation) {
      this.latencyCompensation.recordInput(this.keys, angle);
    }

    this.socket.emit("updateAngle", { angle });
  }

  // Input handling with latency compensation
  sendInput() {
    // Enhanced validation to prevent "Movement input without current player" errors
    if (!this.socket || !this.socket.connected || !this.playerId) {
      return;
    }

    // Get current player state for angle calculation
    const player = this.gameState.players[this.playerId];
    if (!player) {
      // Player not yet established on server, skip input
      return;
    }

    // Only send input if player is alive and has valid position
    if (
      player.health <= 0 ||
      player.x === undefined ||
      player.y === undefined
    ) {
      return;
    }

    const worldMouse = this.camera.screenToWorld(
      this.mousePosition.x,
      this.mousePosition.y
    );
    const angle = Math.atan2(worldMouse.y - player.y, worldMouse.x - player.x);

    // Record input for client-side prediction
    let inputId = 0;
    if (this.latencyCompensation) {
      inputId = this.latencyCompensation.recordInput(this.keys, angle);
    }

    // Send input with sequence ID for reconciliation
    this.socket.emit("input", {
      ...this.keys,
      inputId,
      angle,
    });
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

    // Weapon trails removed

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

    // Missile trails removed

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

  // Test method removed

  // Particle system methods
  updateParticles(deltaTime: number) {
    this.particleSystem.update(deltaTime);
  }

  createExplosion(x: number, y: number, type: "laser" | "missile" = "laser") {
    console.log(
      `2D Particle: Creating explosion at (${x}, ${y}) type: ${type}`
    );
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

  createSpawnIndicator(x: number, y: number) {
    this.particleSystem.createSpawnIndicator(x, y);
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

    // Create 2D explosion effect
    this.createExplosion(data.x, data.y, projectileType);

    // 3D explosion effects removed

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
    // Create 2D explosion effect for meteor impact
    this.createExplosion(data.x, data.y, "missile");

    // 3D explosion effects removed
  }

  // DEPRECATED: This method should not be used in the new socket connection standard
  // The App component manages socket connections globally
  // This is kept for compatibility but should be removed in the future
  _deprecatedDisconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setConnected(false);
    this.projectileInstances.clear();
    this.particleSystem.clear();
    this.latencyCompensation = null;
  }

  reset() {
    this.gameState = {
      players: {},
      aiEnemies: {},
      swarmEnemies: {},
      projectiles: [],
      meteors: [],
      walls: [],
      powerUps: {},
    };
    this.playerId = "";
    this.latencyCompensation = null;

    // Reset game stats
    this.gameStats = {
      score: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      gameStartTime: 0,
      lastKillTime: 0,
      currentKillStreak: 0,
      maxKillStreak: 0,
      damageDealt: 0,
      damageTaken: 0,
      powerUpsCollected: 0,
      enemiesDestroyed: 0,
      meteorsDestroyed: 0,
      headshots: 0,
      // Time-based tracking
      killTimes: [],
      lastHitTime: 0,
      hitStreak: 0,
      consecutiveHits: 0,
      comboStartTime: 0,
      comboActionCount: 0,
      currentHitMultiplier: 1.0,
      // Survival scoring
      lastSurvivalScoreTime: 0,
      survivalBonusMultiplier: 1.0,
      totalSurvivalScore: 0,
    };
  }

  // Get interpolated game state for smooth rendering
  getInterpolatedGameState(): GameState {
    if (!this.latencyCompensation) {
      return this.gameState;
    }

    const interpolatedState = this.latencyCompensation.getInterpolatedGameState(
      Date.now()
    );
    return interpolatedState || this.gameState;
  }

  // Get predicted player position for immediate feedback
  getPredictedPlayerPosition() {
    if (!this.latencyCompensation) {
      return this.currentPlayer
        ? { x: this.currentPlayer.x, y: this.currentPlayer.y }
        : null;
    }

    const predicted = this.latencyCompensation.getPredictedPlayerState();
    if (predicted) {
      return { x: predicted.x, y: predicted.y };
    }

    return this.currentPlayer
      ? { x: this.currentPlayer.x, y: this.currentPlayer.y }
      : null;
  }

  // Ping measurement for latency estimation
  measurePing() {
    if (!this.socket) return;

    const pingStart = Date.now();
    this.socket.emit("ping", pingStart);

    // Listen for pong response (you'll need to add this to SocketService)
    this.socket.once("pong", (serverTime: number) => {
      const pongReceived = Date.now();
      if (this.latencyCompensation) {
        this.latencyCompensation.updateLatencyEstimate(pingStart, pongReceived);
      }
      // Update stats display - wrap in runInAction for MobX strict mode
      runInAction(() => {
        this.stats.ping = Math.round((pongReceived - pingStart) / 2);
      });
    });
  }

  // Get latency compensation stats for debugging
  getLatencyStats() {
    return this.latencyCompensation?.getStats() || null;
  }

  // Toggle latency compensation features
  togglePrediction(enabled: boolean) {
    this.latencyCompensation?.enablePrediction(enabled);
  }

  toggleInterpolation(enabled: boolean) {
    this.latencyCompensation?.enableInterpolation(enabled);
  }

  toggleReconciliation(enabled: boolean) {
    this.latencyCompensation?.enableReconciliation(enabled);
  }
}
