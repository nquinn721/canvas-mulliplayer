import { Player } from "../classes/Player";
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

// Enhanced AI difficulty settings
interface EnhancedDifficultySettings {
  detectionRange: number;
  optimalRange: number;
  minRange: number;
  shootCooldown: number;
  accuracy: number;
  speed: number;
  aggressiveness: number;
  pathfindingEnabled: boolean;
  avoidanceDistance: number;
  reactionTime: number;
}

const ENHANCED_DIFFICULTY_PRESETS: Record<string, EnhancedDifficultySettings> =
  {
    EASY: {
      detectionRange: 800,
      optimalRange: 300,
      minRange: 200,
      shootCooldown: 3000,
      accuracy: 0.6,
      speed: 150,
      aggressiveness: 0.3,
      pathfindingEnabled: true,
      avoidanceDistance: 120,
      reactionTime: 800,
    },
    MEDIUM: {
      detectionRange: 1200,
      optimalRange: 250,
      minRange: 150,
      shootCooldown: 2000,
      accuracy: 0.75,
      speed: 180,
      aggressiveness: 0.6,
      pathfindingEnabled: true,
      avoidanceDistance: 100,
      reactionTime: 400,
    },
    HARD: {
      detectionRange: 1600,
      optimalRange: 200,
      minRange: 100,
      shootCooldown: 1500,
      accuracy: 0.9,
      speed: 220,
      aggressiveness: 0.8,
      pathfindingEnabled: true,
      avoidanceDistance: 80,
      reactionTime: 150,
    },
  };

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

      // Calculate movement based on optimal distance
      const distance = context.distanceToPlayer;
      let speedMultiplier = 1.0;

      if (distance < settings.minRange) {
        // Too close - move away
        speedMultiplier = 1.5;
        // Move in opposite direction
        const awayDirection = directionToWaypoint + Math.PI;
        const speed =
          settings.speed * speedMultiplier * (context.deltaTime / 1000);
        const deltaX = Math.cos(awayDirection) * speed;
        const deltaY = Math.sin(awayDirection) * speed;

        ai.updatePosition(
          deltaX,
          deltaY,
          context.worldWidth,
          context.worldHeight,
          context.checkWallCollision
        );
      } else if (distance > settings.optimalRange) {
        // Too far - move closer
        speedMultiplier = distance > settings.detectionRange * 0.8 ? 1.2 : 0.8;
        const speed =
          settings.speed * speedMultiplier * (context.deltaTime / 1000);
        const deltaX = Math.cos(directionToWaypoint) * speed;
        const deltaY = Math.sin(directionToWaypoint) * speed;

        ai.updatePosition(
          deltaX,
          deltaY,
          context.worldWidth,
          context.worldHeight,
          context.checkWallCollision
        );
      } else {
        // In optimal range - strafe while maintaining distance
        const strafeAngle =
          directionToWaypoint + Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        speedMultiplier = 0.6;
        const speed =
          settings.speed * speedMultiplier * (context.deltaTime / 1000);
        const deltaX = Math.cos(strafeAngle) * speed;
        const deltaY = Math.sin(strafeAngle) * speed;

        ai.updatePosition(
          deltaX,
          deltaY,
          context.worldWidth,
          context.worldHeight,
          context.checkWallCollision
        );
      }

      // Face the target for shooting
      const directionToTarget = Math.atan2(
        context.closestPlayer.y - ai.y,
        context.closestPlayer.x - ai.x
      );
      ai.updateAngle(directionToTarget);

      // Check if we reached the current waypoint
      if (PathfindingUtils.distance({ x: ai.x, y: ai.y }, nextWaypoint) < 30) {
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
    const patrolRadius = 200;
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

    // Simple patrol movement
    const dirToTarget = Math.atan2(targetY - ai.y, targetX - ai.x);
    const speed = settings.speed * 0.5 * (context.deltaTime / 1000);
    const deltaX = Math.cos(dirToTarget) * speed;
    const deltaY = Math.sin(dirToTarget) * speed;

    ai.updatePosition(
      deltaX,
      deltaY,
      context.worldWidth,
      context.worldHeight,
      context.checkWallCollision
    );
    ai.updateAngle(dirToTarget);

    return NodeStatus.SUCCESS;
  }
}

// Enhanced AI Enemy class with pathfinding capabilities
export class EnhancedAIEnemy extends Player {
  private difficulty: string = "MEDIUM";
  private settings: EnhancedDifficultySettings;
  private behaviorTree: EnhancedBehaviorNode;
  private lastShootTime: number = 0;
  private spawnX: number;
  private spawnY: number;
  private patrolAngle: number = 0;
  private patrolCenter: { x: number; y: number };
  private currentPath: Point[] = [];
  private pathfindingTarget: Point | null = null;
  private lastPathfindingUpdate: number = 0;

  constructor(
    id: string,
    x: number,
    y: number,
    difficulty: string = "MEDIUM",
    color: string = "#ff4444"
  ) {
    super(
      id,
      "Smart_AI_Bot",
      x,
      y,
      color,
      100,
      ENHANCED_DIFFICULTY_PRESETS[difficulty].speed
    );

    this.difficulty = difficulty;
    this.settings = ENHANCED_DIFFICULTY_PRESETS[difficulty];
    this.spawnX = x;
    this.spawnY = y;
    this.patrolCenter = { x, y };
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.radius = 18;

    // Set upgrades based on difficulty
    this.laserUpgradeLevel =
      difficulty === "HARD" ? 3 : difficulty === "MEDIUM" ? 2 : 1;
    this.missileUpgradeLevel = difficulty === "HARD" ? 2 : 1;

    this.buildBehaviorTree();
    this.lastShootTime = Date.now() - this.settings.shootCooldown;
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

    // Only shoot if we have line of sight, player is in range, and we're off cooldown
    if (
      !hasLineOfSight ||
      distance > this.settings.detectionRange ||
      currentTime - this.lastShootTime < this.settings.shootCooldown
    ) {
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

    // Choose weapon based on distance and difficulty-based missile preference
    let missileChance = 0;
    switch (this.difficulty) {
      case "EASY":
        missileChance = 0.1; // 10% chance for missiles
        break;
      case "MEDIUM":
        missileChance = 0.3; // 30% chance for missiles
        break;
      case "HARD":
        missileChance = 0.6; // 60% chance for missiles
        break;
    }

    // Increase missile chance if target is far away
    if (distance > this.settings.optimalRange) {
      missileChance *= 1.5; // 1.5x more likely to use missile at long range
    }

    const weapon = Math.random() < missileChance ? "missile" : "laser";

    this.lastShootTime = currentTime;
    return { angle, weapon };
  }

  // Getter methods for behavior tree access
  getSettings(): EnhancedDifficultySettings {
    return this.settings;
  }

  getPatrolCenter(): Point {
    return this.patrolCenter;
  }

  getPatrolAngle(): number {
    return this.patrolAngle;
  }

  updatePatrolAngle(): void {
    this.patrolAngle += (Math.random() - 0.5) * 0.1;
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
    if (ENHANCED_DIFFICULTY_PRESETS[difficulty]) {
      this.difficulty = difficulty;
      this.settings = ENHANCED_DIFFICULTY_PRESETS[difficulty];
      this.speed = this.settings.speed;
      // Rebuild behavior tree with new settings
      this.buildBehaviorTree();
    }
  }

  // Debug method
  getDebugInfo(): string {
    return `Enhanced AI ${this.id}: Difficulty=${this.difficulty}, Health=${this.health}/${this.maxHealth}, PathNodes=${this.currentPath.length}, LOS=${this.pathfindingTarget ? "Target" : "None"}`;
  }
}
