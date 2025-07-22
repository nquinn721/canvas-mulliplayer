import { Player } from "../classes/Player";
import { getAIConfig, type AIDifficultyConfig } from "../config/AIConfig";
import { PathfindingUtils } from "../utils/PathfindingUtils";

// Enhanced behavior tree node types with pathfinding support
enum NodeStatus {
  SUCCESS = "success",
  FAILURE = "failure",
  RUNNING = "running",
}

interface Point {
  x: number;
  y: number;
}

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Enhanced AI context with pathfinding data
interface EnhancedAIContext {
  deltaTime: number;
  players: Map<string, Player>;
  worldWidth: number;
  worldHeight: number;
  walls: Wall[];
  checkWallCollision?: (x: number, y: number, radius: number) => boolean;
  closestPlayer?: Player;
  distanceToPlayer: number;
  currentTime: number;
  hasLineOfSight: boolean;
  currentPath: Point[];
  pathfindingTarget: Point | null;
}

// Base behavior tree node
abstract class EnhancedBehaviorNode {
  protected children: EnhancedBehaviorNode[] = [];

  abstract execute(ai: EnhancedAIEnemy, context: EnhancedAIContext): NodeStatus;

  addChild(child: EnhancedBehaviorNode): void {
    this.children.push(child);
  }
}

// Selector node (OR logic)
class EnhancedSelectorNode extends EnhancedBehaviorNode {
  execute(ai: EnhancedAIEnemy, context: EnhancedAIContext): NodeStatus {
    for (const child of this.children) {
      const status = child.execute(ai, context);
      if (status === NodeStatus.SUCCESS || status === NodeStatus.RUNNING) {
        return status;
      }
    }
    return NodeStatus.FAILURE;
  }
}

// Sequence node (AND logic)
class EnhancedSequenceNode extends EnhancedBehaviorNode {
  execute(ai: EnhancedAIEnemy, context: EnhancedAIContext): NodeStatus {
    for (const child of this.children) {
      const status = child.execute(ai, context);
      if (status === NodeStatus.FAILURE || status === NodeStatus.RUNNING) {
        return status;
      }
    }
    return NodeStatus.SUCCESS;
  }
}

// Enhanced behavior tree nodes

class LineOfSightCondition extends EnhancedBehaviorNode {
  execute(ai: EnhancedAIEnemy, context: EnhancedAIContext): NodeStatus {
    return context.hasLineOfSight ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
  }
}

class EnemyInRangeCondition extends EnhancedBehaviorNode {
  execute(ai: EnhancedAIEnemy, context: EnhancedAIContext): NodeStatus {
    const settings = ai.getSettings();
    return context.closestPlayer &&
      context.distanceToPlayer <= settings.detectionRange
      ? NodeStatus.SUCCESS
      : NodeStatus.FAILURE;
  }
}

class NavigateToTargetAction extends EnhancedBehaviorNode {
  execute(ai: EnhancedAIEnemy, context: EnhancedAIContext): NodeStatus {
    if (!context.closestPlayer) return NodeStatus.FAILURE;

    const settings = ai.getSettings();
    const currentPos = { x: ai.x, y: ai.y };
    const targetPos = {
      x: context.closestPlayer.x,
      y: context.closestPlayer.y,
    };

    // Check if we need to recalculate path
    if (
      context.currentPath.length === 0 ||
      !context.pathfindingTarget ||
      PathfindingUtils.distance(context.pathfindingTarget, targetPos) > 100 ||
      (context.currentPath.length > 1 &&
        PathfindingUtils.distance(currentPos, context.currentPath[1]) < 30)
    ) {
      // Calculate new path
      const newPath = PathfindingUtils.findPath(
        currentPos,
        targetPos,
        context.walls,
        context.worldWidth,
        context.worldHeight,
        ai.radius,
        20 // Buffer distance to keep bots 20px away from walls
      );

      // Simplify the path to reduce waypoints
      context.currentPath = PathfindingUtils.simplifyPath(
        newPath,
        context.walls,
        ai.radius,
        20 // Buffer distance to keep bots 20px away from walls
      );
      context.pathfindingTarget = targetPos;

      // Remove current position from path if it's the first waypoint
      if (
        context.currentPath.length > 0 &&
        PathfindingUtils.distance(currentPos, context.currentPath[0]) < 30
      ) {
        context.currentPath.shift();
      }
    }

    // Follow the path
    if (context.currentPath.length > 0) {
      const nextWaypoint = context.currentPath[0];
      const directionToWaypoint = Math.atan2(
        nextWaypoint.y - ai.y,
        nextWaypoint.x - ai.x
      );

      // Calculate movement based on optimal distance with smooth transitions
      const distance = context.distanceToPlayer;
      let targetSpeedMultiplier = 1.0;
      let targetDirection = directionToWaypoint;

      if (distance < settings.minRange) {
        // Too close - move away with urgency
        targetSpeedMultiplier = 1.5 + Math.random() * 0.3; // Add some variation
        targetDirection =
          directionToWaypoint + Math.PI + (Math.random() - 0.5) * 0.3; // Add noise
      } else if (distance > settings.optimalRange) {
        // Too far - move closer with varying speeds
        targetSpeedMultiplier =
          distance > settings.detectionRange * 0.8
            ? 1.2 + Math.random() * 0.2
            : 0.8 + Math.random() * 0.2;
        targetDirection = directionToWaypoint + (Math.random() - 0.5) * 0.2; // Slight direction noise
      } else {
        // In optimal range - strafe and circle with more natural movement
        const strafeIntensity = 0.8 + Math.random() * 0.4;
        targetDirection =
          directionToWaypoint +
          (Math.PI / 2) * strafeIntensity +
          (Math.random() - 0.5) * 0.6;
        targetSpeedMultiplier = 0.6 + Math.random() * 0.3;
      }

      // Apply momentum and smooth acceleration
      const maxAcceleration = settings.speed * 2.0 * (context.deltaTime / 1000);
      const targetVelX =
        Math.cos(targetDirection) *
        settings.speed *
        targetSpeedMultiplier *
        (context.deltaTime / 1000);
      const targetVelY =
        Math.sin(targetDirection) *
        settings.speed *
        targetSpeedMultiplier *
        (context.deltaTime / 1000);

      // Smooth velocity transitions using momentum
      const smoothingFactor = Math.min(1.0, context.deltaTime / 200); // Smooth over 200ms
      ai.setVelocityX(
        ai.getVelocityX() + (targetVelX - ai.getVelocityX()) * smoothingFactor
      );
      ai.setVelocityY(
        ai.getVelocityY() + (targetVelY - ai.getVelocityY()) * smoothingFactor
      );

      // Apply movement with smoothed velocity
      ai.updatePosition(
        ai.getVelocityX(),
        ai.getVelocityY(),
        context.worldWidth,
        context.worldHeight,
        context.checkWallCollision
      );

      // Smooth angle transitions for facing target
      const directionToTarget = Math.atan2(
        context.closestPlayer.y - ai.y,
        context.closestPlayer.x - ai.x
      );

      // Add slight aiming variation based on accuracy
      const aimVariation =
        (1.0 - settings.accuracy) * (Math.random() - 0.5) * 0.3;
      ai.setTargetAngle(directionToTarget + aimVariation);

      // Smooth angle interpolation
      const angleDiff = ai.getTargetAngle() - ai.getCurrentAngle();
      const normalizedAngleDiff = Math.atan2(
        Math.sin(angleDiff),
        Math.cos(angleDiff)
      );
      const angleSmoothing = Math.min(1.0, context.deltaTime / 150); // Smooth over 150ms
      ai.setCurrentAngle(
        ai.getCurrentAngle() + normalizedAngleDiff * angleSmoothing
      );
      ai.updateAngle(ai.getCurrentAngle());

      // Check if we reached the current waypoint
      if (PathfindingUtils.distance({ x: ai.x, y: ai.y }, nextWaypoint) < 35) {
        context.currentPath.shift();
      }
    }

    return NodeStatus.SUCCESS;
  }
}

class AvoidObstaclesAction extends EnhancedBehaviorNode {
  execute(ai: EnhancedAIEnemy, context: EnhancedAIContext): NodeStatus {
    if (!context.closestPlayer) return NodeStatus.FAILURE;

    const settings = ai.getSettings();
    const currentPos = { x: ai.x, y: ai.y };
    const targetPos = {
      x: context.closestPlayer.x,
      y: context.closestPlayer.y,
    };

    // Find a safe position to move towards
    const safePosition = PathfindingUtils.findSafePosition(
      currentPos,
      targetPos,
      context.walls,
      context.worldWidth,
      context.worldHeight,
      ai.radius,
      settings.avoidanceDistance,
      20 // Buffer distance to keep bots 20px away from walls
    );

    // Move towards safe position
    const directionToSafe = Math.atan2(
      safePosition.y - ai.y,
      safePosition.x - ai.x
    );
    const speed = settings.speed * 0.8 * (context.deltaTime / 1000);
    const deltaX = Math.cos(directionToSafe) * speed;
    const deltaY = Math.sin(directionToSafe) * speed;

    ai.updatePosition(
      deltaX,
      deltaY,
      context.worldWidth,
      context.worldHeight,
      context.checkWallCollision
    );

    // Face the target
    const directionToTarget = Math.atan2(
      context.closestPlayer.y - ai.y,
      context.closestPlayer.x - ai.x
    );
    ai.updateAngle(directionToTarget);

    return NodeStatus.SUCCESS;
  }
}

class SmartShootAction extends EnhancedBehaviorNode {
  execute(ai: EnhancedAIEnemy, context: EnhancedAIContext): NodeStatus {
    // Only shoot if we have line of sight and the target is in range
    if (!context.hasLineOfSight || !context.closestPlayer) {
      return NodeStatus.FAILURE;
    }

    const settings = ai.getSettings();
    const distance = context.distanceToPlayer;

    // Check if target is in shooting range
    if (distance > settings.detectionRange) {
      return NodeStatus.FAILURE;
    }

    // The actual shooting will be handled by the gateway using getShootingInfo
    return NodeStatus.SUCCESS;
  }
}

class EnhancedPatrolAction extends EnhancedBehaviorNode {
  execute(ai: EnhancedAIEnemy, context: EnhancedAIContext): NodeStatus {
    const settings = ai.getSettings();
    const patrolCenter = ai.getPatrolCenter();

    // Update patrol angle
    ai.updatePatrolAngle();

    // Calculate patrol target
    const patrolRadius = settings.patrolRadius; // Use dynamic patrol radius from settings
    const targetX =
      patrolCenter.x + Math.cos(ai.getPatrolAngle()) * patrolRadius;
    const targetY =
      patrolCenter.y + Math.sin(ai.getPatrolAngle()) * patrolRadius;

    // Use pathfinding for patrol if enabled
    if (settings.pathfindingEnabled) {
      const currentPos = { x: ai.x, y: ai.y };
      const targetPos = { x: targetX, y: targetY };

      if (
        !PathfindingUtils.hasLineOfSight(
          currentPos,
          targetPos,
          context.walls,
          ai.radius,
          20 // Buffer distance to keep bots 20px away from walls
        )
      ) {
        // Find path to patrol target
        const path = PathfindingUtils.findPath(
          currentPos,
          targetPos,
          context.walls,
          context.worldWidth,
          context.worldHeight,
          ai.radius,
          20 // Buffer distance to keep bots 20px away from walls
        );

        if (path.length > 1) {
          const nextWaypoint = path[1];
          const dirToWaypoint = Math.atan2(
            nextWaypoint.y - ai.y,
            nextWaypoint.x - ai.x
          );
          const speed = settings.speed * 0.5 * (context.deltaTime / 1000);
          const deltaX = Math.cos(dirToWaypoint) * speed;
          const deltaY = Math.sin(dirToWaypoint) * speed;

          ai.updatePosition(
            deltaX,
            deltaY,
            context.worldWidth,
            context.worldHeight,
            context.checkWallCollision
          );
          ai.updateAngle(dirToWaypoint);

          return NodeStatus.SUCCESS;
        }
      }
    }

    // Simple patrol movement with smoothing
    const dirToTarget = Math.atan2(targetY - ai.y, targetX - ai.x);

    // Add some wandering behavior to make patrol more natural
    const wanderStrength = 0.3;
    const wanderAngle = dirToTarget + (Math.random() - 0.5) * wanderStrength;

    const baseSpeed = settings.speed * 0.5 * (context.deltaTime / 1000);
    const speedVariation = 0.8 + Math.random() * 0.4; // 80% to 120% speed variation

    const targetVelX = Math.cos(wanderAngle) * baseSpeed * speedVariation;
    const targetVelY = Math.sin(wanderAngle) * baseSpeed * speedVariation;

    // Apply momentum to patrol movement too
    const patrolSmoothing = Math.min(1.0, context.deltaTime / 300); // Slower smoothing for patrol
    ai.setVelocityX(
      ai.getVelocityX() + (targetVelX - ai.getVelocityX()) * patrolSmoothing
    );
    ai.setVelocityY(
      ai.getVelocityY() + (targetVelY - ai.getVelocityY()) * patrolSmoothing
    );

    ai.updatePosition(
      ai.getVelocityX(),
      ai.getVelocityY(),
      context.worldWidth,
      context.worldHeight,
      context.checkWallCollision
    );

    // Smooth angle transition for patrol too
    ai.setTargetAngle(dirToTarget);
    const angleDiff = ai.getTargetAngle() - ai.getCurrentAngle();
    const normalizedAngleDiff = Math.atan2(
      Math.sin(angleDiff),
      Math.cos(angleDiff)
    );
    const patrolAngleSmoothing = Math.min(1.0, context.deltaTime / 400); // Even slower for patrol
    ai.setCurrentAngle(
      ai.getCurrentAngle() + normalizedAngleDiff * patrolAngleSmoothing
    );
    ai.updateAngle(ai.getCurrentAngle());

    return NodeStatus.SUCCESS;
  }
}

// Enhanced AI Enemy class with pathfinding capabilities
export class EnhancedAIEnemy extends Player {
  private difficulty: string = "MEDIUM";
  private settings: AIDifficultyConfig;
  private behaviorTree: EnhancedBehaviorNode;
  private lastShootTime: number = 0;
  private lastLaserTime: number = 0;
  private spawnX: number;
  private spawnY: number;
  private patrolAngle: number = 0;
  private patrolCenter: { x: number; y: number };
  private currentPath: Point[] = [];
  private pathfindingTarget: Point | null = null;
  private lastPathfindingUpdate: number = 0;

  // Movement smoothing properties
  private velocityX: number = 0;
  private velocityY: number = 0;
  private targetAngle: number = 0;
  private currentAngle: number = 0;
  private lastMovementTime: number = 0;
  private movementNoise: number = 0;
  private lastNoiseUpdate: number = 0;

  // Static method to get difficulty indicator for bot names
  static getDifficultyIndicator(difficulty: string): string {
    switch (difficulty.toUpperCase()) {
      case "EASY":
        return "-E";
      case "MEDIUM":
        return "-M";
      case "HARD":
        return "-H";
      case "EXPERT":
        return "-X";
      case "NIGHTMARE":
        return "-N";
      default:
        return "-M"; // Default to medium
    }
  }

  constructor(
    id: string,
    x: number,
    y: number,
    difficulty: string = "MEDIUM",
    color: string = "#ff4444"
  ) {
    const aiConfig = getAIConfig(difficulty);

    // Create bot name with difficulty indicator
    const difficultyIndicator =
      EnhancedAIEnemy.getDifficultyIndicator(difficulty);
    const botName = `Smart_AI_Bot${difficultyIndicator}`;

    super(id, botName, x, y, color, aiConfig.health, aiConfig.speed);

    this.difficulty = difficulty;
    this.settings = aiConfig;
    this.spawnX = x;
    this.spawnY = y;
    this.patrolCenter = { x, y };
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.radius = aiConfig.radius;
    this.maxHealth = aiConfig.maxHealth;

    // Set upgrades based on difficulty from config
    this.laserUpgradeLevel = aiConfig.laserUpgradeLevel;
    this.missileUpgradeLevel = aiConfig.missileUpgradeLevel;
    this.flashUpgradeLevel = aiConfig.flashUpgradeLevel;
    this.boostUpgradeLevel = aiConfig.boostUpgradeLevel;

    this.buildBehaviorTree();
    this.lastShootTime = Date.now() - this.settings.shootCooldown;
    this.lastLaserTime = Date.now() - this.settings.shootCooldown; // Use AI config cooldown instead of hardcoded 500ms

    // Initialize missile cooldown to prevent immediate missile firing
    const missileStats = this.getMissileStats();
    this.lastMissileTime = Date.now() - missileStats.cooldown; // Prevent immediate missile firing

    // Initialize movement smoothing properties
    this.velocityX = 0;
    this.velocityY = 0;
    this.targetAngle = this.angle;
    this.currentAngle = this.angle;
    this.lastMovementTime = Date.now();
    this.movementNoise = 0;
    this.lastNoiseUpdate = Date.now();
  }

  private buildBehaviorTree(): void {
    // Root selector: try smart combat first, then patrol
    this.behaviorTree = new EnhancedSelectorNode();

    // Smart combat sequence: enemy in range -> has line of sight -> navigate/avoid -> shoot
    const smartCombatSequence = new EnhancedSequenceNode();
    smartCombatSequence.addChild(new EnemyInRangeCondition());

    // Combat movement selector: if line of sight, navigate; otherwise avoid obstacles
    const combatMovementSelector = new EnhancedSelectorNode();

    // Direct navigation with line of sight
    const directNavigationSequence = new EnhancedSequenceNode();
    directNavigationSequence.addChild(new LineOfSightCondition());
    directNavigationSequence.addChild(new NavigateToTargetAction());
    directNavigationSequence.addChild(new SmartShootAction());

    // Obstacle avoidance when no line of sight
    const avoidanceSequence = new EnhancedSequenceNode();
    avoidanceSequence.addChild(new AvoidObstaclesAction());

    combatMovementSelector.addChild(directNavigationSequence);
    combatMovementSelector.addChild(avoidanceSequence);

    smartCombatSequence.addChild(combatMovementSelector);

    // Enhanced patrol action
    const patrolAction = new EnhancedPatrolAction();

    this.behaviorTree.addChild(smartCombatSequence);
    this.behaviorTree.addChild(patrolAction);
  }

  // Main AI update method with enhanced pathfinding
  updateAI(
    deltaTime: number,
    players: Map<string, Player>,
    worldWidth: number,
    worldHeight: number,
    walls: Wall[],
    checkWallCollision?: (x: number, y: number, radius: number) => boolean
  ): void {
    const currentTime = Date.now();

    // Find closest player
    const closestPlayer = this.findClosestPlayer(players);
    const distanceToPlayer = closestPlayer
      ? this.getDistanceTo(closestPlayer.x, closestPlayer.y)
      : Infinity;

    // Check line of sight to closest player
    const hasLineOfSight = closestPlayer
      ? PathfindingUtils.hasLineOfSight(
          { x: this.x, y: this.y },
          { x: closestPlayer.x, y: closestPlayer.y },
          walls,
          this.radius,
          20 // Buffer distance to keep bots 20px away from walls
        )
      : false;

    // Create enhanced context
    const context: EnhancedAIContext = {
      deltaTime,
      players,
      worldWidth,
      worldHeight,
      walls,
      checkWallCollision,
      closestPlayer,
      distanceToPlayer,
      currentTime,
      hasLineOfSight,
      currentPath: this.currentPath,
      pathfindingTarget: this.pathfindingTarget,
    };

    // Execute behavior tree
    this.behaviorTree.execute(this, context);

    // Update internal pathfinding state
    this.currentPath = context.currentPath;
    this.pathfindingTarget = context.pathfindingTarget;

    // Update energy systems
    this.updateBoostEnergy(deltaTime);
  }

  // Enhanced shooting info that considers line of sight
  getShootingInfo(
    players: Map<string, Player>,
    walls: Wall[]
  ): { angle: number; weapon: "laser" | "missile" } | null {
    const currentTime = Date.now();
    const closestPlayer = this.findClosestPlayer(players);

    if (!closestPlayer) return null;

    const distance = this.getDistanceTo(closestPlayer.x, closestPlayer.y);

    // Check line of sight first
    const hasLineOfSight = PathfindingUtils.hasLineOfSight(
      { x: this.x, y: this.y },
      { x: closestPlayer.x, y: closestPlayer.y },
      walls,
      this.radius,
      20 // Buffer distance to keep bots 20px away from walls
    );

    // Only shoot if we have line of sight and player is in range
    if (!hasLineOfSight || distance > this.settings.detectionRange) {
      return null;
    }

    // Calculate angle with accuracy modifier
    const baseAngle = Math.atan2(
      closestPlayer.y - this.y,
      closestPlayer.x - this.x
    );
    const accuracyOffset =
      ((Math.random() - 0.5) * (1 - this.settings.accuracy) * Math.PI) / 4;
    const angle = baseAngle + accuracyOffset;

    // Choose weapon based on distance, difficulty-based missile preference, and cooldowns
    let missileChance = this.settings.missilePreference;

    // Increase missile chance if target is far away
    if (distance > this.settings.optimalRange) {
      missileChance *= 1.5; // 1.5x more likely to use missile at long range
    }

    // Check ability cooldowns and choose available weapon
    const missileStats = this.getMissileStats();
    const flashStats = this.getFlashStats();

    const canUseMissile = this.canShootMissile(
      currentTime,
      missileStats.cooldown
    );
    const canUseLaser =
      currentTime - this.lastLaserTime >= this.settings.shootCooldown; // Use AI config cooldown

    // If we want to use missile but it's on cooldown, use laser if available
    const preferMissile = Math.random() < missileChance;

    let weapon: "laser" | "missile";
    if (preferMissile && canUseMissile) {
      weapon = "missile";
      this.updateMissileTime(currentTime);
    } else if (canUseLaser) {
      weapon = "laser";
      this.lastLaserTime = currentTime;
    } else {
      // Both weapons on cooldown, don't shoot
      return null;
    }

    this.lastShootTime = currentTime;
    return { angle, weapon };
  }

  // Getter methods for behavior tree access
  getSettings(): AIDifficultyConfig {
    return this.settings;
  }

  getPatrolCenter(): Point {
    return this.patrolCenter;
  }

  getPatrolAngle(): number {
    return this.patrolAngle;
  }

  updatePatrolAngle(): void {
    // Larger angle changes for more dynamic patrol movement
    // Use difficulty-based angle change rates
    const baseAngleChange = 0.02; // Base 0.02 radians per update
    const difficultyMultiplier = this.settings.aggressiveness * 2; // 0.6 to 2.0x
    const maxAngleChange = baseAngleChange * (1 + difficultyMultiplier);

    this.patrolAngle += (Math.random() - 0.5) * maxAngleChange;
  }

  // Movement smoothing getters and setters
  getVelocityX(): number {
    return this.velocityX;
  }

  setVelocityX(velocity: number): void {
    this.velocityX = velocity;
  }

  getVelocityY(): number {
    return this.velocityY;
  }

  setVelocityY(velocity: number): void {
    this.velocityY = velocity;
  }

  getTargetAngle(): number {
    return this.targetAngle;
  }

  setTargetAngle(angle: number): void {
    this.targetAngle = angle;
  }

  getCurrentAngle(): number {
    return this.currentAngle;
  }

  setCurrentAngle(angle: number): void {
    this.currentAngle = angle;
  }

  private findClosestPlayer(players: Map<string, Player>): Player | null {
    let closestPlayer: Player | null = null;
    let closestDistance = Infinity;

    players.forEach((player) => {
      // Only target players that are alive (health > 0)
      if (player.health <= 0) return;

      const distance = this.getDistanceTo(player.x, player.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPlayer = player;
      }
    });

    return closestPlayer;
  }

  getDistanceTo(x: number, y: number): number {
    return Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
  }

  setDifficulty(difficulty: string): void {
    const aiConfig = getAIConfig(difficulty);
    if (aiConfig) {
      this.difficulty = difficulty;
      this.settings = aiConfig;
      this.speed = aiConfig.speed;

      // Handle health properly when changing difficulty
      // Calculate health percentage to maintain relative health
      const healthPercent =
        this.maxHealth > 0 ? this.health / this.maxHealth : 1;
      this.maxHealth = aiConfig.maxHealth;
      this.health = Math.min(
        aiConfig.maxHealth,
        Math.round(healthPercent * aiConfig.maxHealth)
      );

      this.radius = aiConfig.radius;

      // Update bot name with new difficulty indicator
      const difficultyIndicator =
        EnhancedAIEnemy.getDifficultyIndicator(difficulty);
      this.name = `Smart_AI_Bot${difficultyIndicator}`;

      // Update ability levels
      this.laserUpgradeLevel = aiConfig.laserUpgradeLevel;
      this.missileUpgradeLevel = aiConfig.missileUpgradeLevel;
      this.flashUpgradeLevel = aiConfig.flashUpgradeLevel;
      this.boostUpgradeLevel = aiConfig.boostUpgradeLevel;

      // Rebuild behavior tree with new settings
      this.buildBehaviorTree();
    }
  }

  // Debug method
  getDebugInfo(): string {
    return `Enhanced AI ${this.id}: Difficulty=${this.difficulty}, Health=${this.health}/${this.maxHealth}, PathNodes=${this.currentPath.length}, LOS=${this.pathfindingTarget ? "Target" : "None"}`;
  }
}
