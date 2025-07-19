import { AIEnemy } from "../classes/AIEnemy";
import {
  AttackNearestEnemyNode,
  BehaviorContext,
  BehaviorNode,
  BehaviorResult,
  DifficultyProfile,
  DifficultyProfiles,
  FleeFromEnemyNode,
  IsEnemyNearbyNode,
  IsHealthLowNode,
  IsPowerUpNearbyNode,
  PatrolNode,
  PursueNearestEnemyNode,
  SeekPowerUpNode,
  SelectorNode,
  SequenceNode,
} from "./BehaviorTree";

export class SmartAIEnemy extends AIEnemy {
  private behaviorTree: BehaviorNode;
  private difficultyProfile: DifficultyProfile;
  private lastReactionTime: number = 0;
  private lastDirectionChange: number = 0;
  private shouldShootLaser: boolean = false;
  private shouldShootMissile: boolean = false;
  private lastDebugLogTime: number = 0;
  public isInPursuit: boolean = false; // Used by behavior tree to override patrol limits
  public aggroTarget: any = null; // Current target being pursued/attacked

  constructor(
    id: string,
    x: number,
    y: number,
    difficulty: keyof typeof DifficultyProfiles = "MEDIUM",
    color: string = "#ff4444"
  ) {
    super(id, x, y, color);

    this.difficultyProfile = DifficultyProfiles[difficulty];
    this.behaviorTree = this.createBehaviorTree();

    // Adjust AI stats based on difficulty
    this.adjustStatsForDifficulty();
  }

  private createBehaviorTree(): BehaviorNode {
    const profile = this.difficultyProfile;

    // Create behavior tree structure:
    // Selector (choose one that succeeds)
    //   ├── Sequence: If health low → Flee
    //   ├── Sequence: If enemy nearby → Attack
    //   ├── Sequence: If enemy detected but far → Pursue
    //   ├── Sequence: If power-up nearby → Seek power-up
    //   └── Patrol (default behavior)

    return new SelectorNode([
      // Survival behavior: Flee when health is low
      new SequenceNode([
        new IsHealthLowNode(profile.fleeThreshold),
        new FleeFromEnemyNode(),
      ]),

      // Combat behavior: Attack nearby enemies
      new SequenceNode([
        new IsEnemyNearbyNode(profile.combatRange),
        new AttackNearestEnemyNode(profile.combatRange, profile.level),
      ]),

      // Pursuit behavior: Chase distant enemies (larger detection range)
      new SequenceNode([
        new IsEnemyNearbyNode(profile.combatRange * 3), // 3x combat range for detection
        new PursueNearestEnemyNode(profile.combatRange * 3),
      ]),

      // Utility behavior: Seek power-ups (only if not too aggressive)
      new SequenceNode([new IsPowerUpNearbyNode(200), new SeekPowerUpNode()]),

      // Default behavior: Patrol
      new PatrolNode(profile.level),
    ]);
  }

  private adjustStatsForDifficulty(): void {
    const profile = this.difficultyProfile;

    // Adjust shooting cooldown based on difficulty
    this.shootCooldown = 3000 + (1 - profile.level) * 2000; // 3-5 seconds

    // Adjust detection range
    this.detectionRange = profile.combatRange;

    // Adjust speed slightly (easier AI moves a bit slower)
    this.speed = 200 + profile.level * 50; // 200-250 speed
  }

  // Override the main AI update method
  updateAI(
    deltaTime: number,
    players: Map<string, any>,
    worldWidth: number,
    worldHeight: number,
    checkWallCollision?: (x: number, y: number, radius: number) => boolean,
    powerUps?: Map<string, any>
  ): void {
    // Reset action flags
    this.shouldShootLaser = false;
    this.shouldShootMissile = false;

    // Create behavior context
    const context: BehaviorContext = {
      ai: this,
      players,
      powerUps,
      worldWidth,
      worldHeight,
      deltaTime,
      currentTime: Date.now(),
      checkWallCollision,
    };

    // Execute behavior tree
    const treeResult = this.behaviorTree.execute(context);

    // Reset pursuit state if not actively pursuing
    if (treeResult !== BehaviorResult.RUNNING || !this.isInPursuit) {
      this.isInPursuit = false;
      this.aggroTarget = null;
    }

    // Handle shooting actions determined by behavior tree
    this.handleShooting();

    // Handle movement - call the parent's movement logic but with behavior tree context
    this.updateMovementWithBehavior(
      deltaTime,
      players,
      worldWidth,
      worldHeight,
      checkWallCollision,
      powerUps
    );

    // Update boost energy and other inherited behavior
    this.updateBoostEnergy(deltaTime);
  }

  // Custom movement logic that respects behavior tree decisions
  private updateMovementWithBehavior(
    deltaTime: number,
    players: Map<string, any>,
    worldWidth: number,
    worldHeight: number,
    checkWallCollision?: (x: number, y: number, radius: number) => boolean,
    powerUps?: Map<string, any>
  ): void {
    const deltaTimeSeconds = deltaTime / 1000;
    const currentTime = Date.now();

    // Change direction periodically
    if (
      currentTime - this.changeDirectionTime >=
      this.directionChangeInterval
    ) {
      this.changeDirection(players, powerUps);
      this.changeDirectionTime = currentTime;
    }

    // AI boost logic - only use boost when it's full and in combat
    const shouldUseBoost =
      this.boostEnergy >= this.maxBoostEnergy && this.aggroTarget;

    if (shouldUseBoost && this.canUseBoost()) {
      this.activateBoost();
    } else {
      this.deactivateBoost();
    }

    // Calculate move speed with boost multiplier
    const baseSpeed = this.speed * deltaTimeSeconds;
    const boostMultiplier = this.isBoostActive ? 2.5 : 1.0;
    const aiSpeedReduction = 0.6; // AI moves at 60% of player speed
    const moveSpeed = baseSpeed * boostMultiplier * aiSpeedReduction;

    // Move in current direction
    const moveX = Math.cos(this.currentMoveAngle) * moveSpeed;
    const moveY = Math.sin(this.currentMoveAngle) * moveSpeed;

    // Check patrol radius before moving (unless in pursuit mode)
    const newX = this.x + moveX;
    const newY = this.y + moveY;
    const distanceFromSpawn = Math.sqrt(
      (newX - this.spawnX) ** 2 + (newY - this.spawnY) ** 2
    );

    // Move if within patrol radius OR if in pursuit mode
    if (distanceFromSpawn <= this.patrolRadius || this.isInPursuit) {
      this.updatePosition(
        moveX,
        moveY,
        worldWidth,
        worldHeight,
        checkWallCollision
      );
    } else {
      // Turn around if hitting patrol limit (only when not pursuing)
      this.currentMoveAngle += Math.PI + (Math.random() - 0.5) * 0.5;
    }

    // Smart facing logic: face movement direction when not in combat,
    // but behavior tree will override angle when attacking
    if (!this.aggroTarget) {
      this.angle = this.currentMoveAngle;
    }
    // Note: When in combat, behavior tree nodes will set this.angle to face targets
  }

  private handleShooting(): void {
    const now = Date.now();

    // Check cooldown
    if (now - this.lastShootTime < this.shootCooldown) {
      return;
    }

    if (this.shouldShootLaser) {
      // Trigger laser shot
      this.lastShootTime = now;
    }

    if (this.shouldShootMissile) {
      // Trigger missile shot
      this.lastShootTime = now;
    }
  }

  // Public method to get shooting decision (called by game gateway)
  getShootingDecision(): { weapon: "laser" | "missile"; angle: number } | null {
    // Check cooldown first
    const now = Date.now();
    if (now - this.lastShootTime < this.shootCooldown) {
      return null;
    }

    if (this.shouldShootLaser) {
      this.shouldShootLaser = false;
      return { weapon: "laser", angle: this.angle };
    }

    if (this.shouldShootMissile) {
      this.shouldShootMissile = false;
      return { weapon: "missile", angle: this.angle };
    }

    return null;
  }

  // Override the getShootingInfo method from base class
  getShootingInfo(): { weapon: "laser" | "missile"; angle: number } | null {
    return this.getShootingDecision();
  }

  // Getter for difficulty info (useful for debugging/UI)
  getDifficultyInfo(): DifficultyProfile {
    return this.difficultyProfile;
  }

  // Method to change difficulty at runtime
  setDifficulty(difficulty: keyof typeof DifficultyProfiles): void {
    this.difficultyProfile = DifficultyProfiles[difficulty];
    this.behaviorTree = this.createBehaviorTree();
    this.adjustStatsForDifficulty();
  }

  // Debug method to see current behavior state
  getDebugInfo(): string {
    return `AI ${this.id}: Difficulty=${this.difficultyProfile.name}, Health=${this.health}/${this.maxHealth}, Boost=${this.boostEnergy.toFixed(0)}/${this.maxBoostEnergy}`;
  }
}
