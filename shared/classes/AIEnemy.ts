import { Player } from "./Player";

// Behavior Tree Node Types
enum NodeStatus {
  SUCCESS = "success",
  FAILURE = "failure",
  RUNNING = "running",
}

// AI Difficulty Settings
interface DifficultySettings {
  detectionRange: number;
  optimalRange: number;
  minRange: number;
  shootCooldown: number;
  accuracy: number;
  speed: number;
  aggressiveness: number;
}

const DIFFICULTY_PRESETS: Record<string, DifficultySettings> = {
  EASY: {
    detectionRange: 800, // Increased from 400
    optimalRange: 300,
    minRange: 200,
    shootCooldown: 3000,
    accuracy: 0.6,
    speed: 150,
    aggressiveness: 0.3,
  },
  MEDIUM: {
    detectionRange: 1200, // Increased from 600
    optimalRange: 250,
    minRange: 150,
    shootCooldown: 2000,
    accuracy: 0.75,
    speed: 180,
    aggressiveness: 0.6,
  },
  HARD: {
    detectionRange: 1600, // Increased from 800
    optimalRange: 200,
    minRange: 100,
    shootCooldown: 1500,
    accuracy: 0.9,
    speed: 220,
    aggressiveness: 0.8,
  },
};

// Behavior Tree Node
abstract class BehaviorNode {
  protected children: BehaviorNode[] = [];

  abstract execute(ai: AIEnemy, context: AIContext): NodeStatus;

  addChild(child: BehaviorNode): void {
    this.children.push(child);
  }
}

// Selector Node (OR)
class SelectorNode extends BehaviorNode {
  execute(ai: AIEnemy, context: AIContext): NodeStatus {
    for (const child of this.children) {
      const status = child.execute(ai, context);
      if (status === NodeStatus.SUCCESS || status === NodeStatus.RUNNING) {
        return status;
      }
    }
    return NodeStatus.FAILURE;
  }
}

// Sequence Node (AND)
class SequenceNode extends BehaviorNode {
  execute(ai: AIEnemy, context: AIContext): NodeStatus {
    for (const child of this.children) {
      const status = child.execute(ai, context);
      if (status === NodeStatus.FAILURE || status === NodeStatus.RUNNING) {
        return status;
      }
    }
    return NodeStatus.SUCCESS;
  }
}

// Context for AI decisions
interface AIContext {
  deltaTime: number;
  players: Map<string, Player>;
  worldWidth: number;
  worldHeight: number;
  checkWallCollision?: (x: number, y: number, radius: number) => boolean;
  closestPlayer?: Player;
  distanceToPlayer: number;
  currentTime: number;
}

export class AIEnemy extends Player {
  private difficulty: string = "MEDIUM";
  private settings: DifficultySettings;
  private behaviorTree: BehaviorNode;
  private lastShootTime: number = 0;
  private spawnX: number;
  private spawnY: number;
  private patrolAngle: number = 0;
  private patrolCenter: { x: number; y: number };

  constructor(
    id: string,
    x: number,
    y: number,
    difficulty: string = "MEDIUM",
    color: string = "#ff4444"
  ) {
    super(id, "AI_Bot", x, y, color, 100, DIFFICULTY_PRESETS[difficulty].speed);

    this.difficulty = difficulty;
    this.settings = DIFFICULTY_PRESETS[difficulty];
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
    // Root selector: try combat behaviors first, then patrol
    this.behaviorTree = new SelectorNode();

    // Combat sequence: detect enemy -> maintain optimal distance -> shoot
    const combatSequence = new SequenceNode();
    combatSequence.addChild(new EnemyDetectedCondition());
    combatSequence.addChild(new MaintainOptimalDistanceAction());
    combatSequence.addChild(new ShootAction());

    // Patrol action: wander around spawn area
    const patrolAction = new PatrolAction();

    this.behaviorTree.addChild(combatSequence);
    this.behaviorTree.addChild(patrolAction);
  }

  // Main AI update method
  updateAI(
    deltaTime: number,
    players: Map<string, Player>,
    worldWidth: number,
    worldHeight: number,
    checkWallCollision?: (x: number, y: number, radius: number) => boolean,
    powerUps?: Map<string, any>
  ): void {
    const currentTime = Date.now();

    // Find closest player
    const closestPlayer = this.findClosestPlayer(players);
    const distanceToPlayer = closestPlayer
      ? this.getDistanceTo(closestPlayer.x, closestPlayer.y)
      : Infinity;

    // Create context for behavior tree
    const context: AIContext = {
      deltaTime,
      players,
      worldWidth,
      worldHeight,
      checkWallCollision,
      closestPlayer,
      distanceToPlayer,
      currentTime,
    };

    // Execute behavior tree
    this.behaviorTree.execute(this, context);

    // Update energy systems
    this.updateBoostEnergy(deltaTime);
  }

  // Check if AI should shoot at target
  getShootingInfo(
    players: Map<string, Player>
  ): { angle: number; weapon: "laser" | "missile" } | null {
    const currentTime = Date.now();
    const closestPlayer = this.findClosestPlayer(players);

    if (!closestPlayer) return null;

    const distance = this.getDistanceTo(closestPlayer.x, closestPlayer.y);

    // Only shoot if player is in detection range and we're off cooldown
    if (
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
    console.log(
      `AI ${this.id} shooting ${weapon} at distance ${distance.toFixed(1)}`
    );
    return { angle, weapon };
  }

  private findClosestPlayer(players: Map<string, Player>): Player | null {
    let closestPlayer: Player | null = null;
    let closestDistance = Infinity;

    players.forEach((player) => {
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
    if (DIFFICULTY_PRESETS[difficulty]) {
      this.difficulty = difficulty;
      this.settings = DIFFICULTY_PRESETS[difficulty];
      this.speed = this.settings.speed;
    }
  }
}

// Behavior Tree Action and Condition Nodes

class EnemyDetectedCondition extends BehaviorNode {
  execute(ai: AIEnemy, context: AIContext): NodeStatus {
    return context.closestPlayer &&
      context.distanceToPlayer <= ai["settings"].detectionRange
      ? NodeStatus.SUCCESS
      : NodeStatus.FAILURE;
  }
}

class MaintainOptimalDistanceAction extends BehaviorNode {
  execute(ai: AIEnemy, context: AIContext): NodeStatus {
    if (!context.closestPlayer) return NodeStatus.FAILURE;

    const {
      closestPlayer,
      deltaTime,
      worldWidth,
      worldHeight,
      checkWallCollision,
    } = context;
    const settings = ai["settings"] as DifficultySettings;
    const distance = context.distanceToPlayer;

    let moveX = 0;
    let moveY = 0;

    // Calculate direction to/from player
    const dirToPlayer = Math.atan2(
      closestPlayer.y - ai.y,
      closestPlayer.x - ai.x
    );

    if (distance < settings.minRange) {
      // Too close - move away quickly
      moveX = -Math.cos(dirToPlayer);
      moveY = -Math.sin(dirToPlayer);
    } else if (distance > settings.optimalRange) {
      // Too far - move closer but cautiously
      const approachFactor = 0.5; // Move slowly towards optimal range
      moveX = Math.cos(dirToPlayer) * approachFactor;
      moveY = Math.sin(dirToPlayer) * approachFactor;
    } else {
      // In optimal range - strafe around player
      const strafeAngle =
        dirToPlayer + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      moveX = Math.cos(strafeAngle) * 0.3;
      moveY = Math.sin(strafeAngle) * 0.3;
    }

    // Apply movement
    const speed = settings.speed * (deltaTime / 1000);
    const deltaX = moveX * speed;
    const deltaY = moveY * speed;

    ai.updatePosition(
      deltaX,
      deltaY,
      worldWidth,
      worldHeight,
      checkWallCollision
    );

    // Face the player
    ai.updateAngle(dirToPlayer);

    return NodeStatus.SUCCESS;
  }
}

class ShootAction extends BehaviorNode {
  execute(ai: AIEnemy, context: AIContext): NodeStatus {
    // Don't actually shoot here - let the gateway handle shooting
    // Just return SUCCESS if we have a target in range
    if (!context.closestPlayer) return NodeStatus.FAILURE;

    const distance = context.distanceToPlayer;
    const settings = ai["settings"] as DifficultySettings;

    // Return SUCCESS if target is in shooting range (gateway will handle actual shooting)
    return distance <= settings.detectionRange
      ? NodeStatus.SUCCESS
      : NodeStatus.FAILURE;
  }
}

class PatrolAction extends BehaviorNode {
  execute(ai: AIEnemy, context: AIContext): NodeStatus {
    const { deltaTime, worldWidth, worldHeight, checkWallCollision } = context;
    const settings = ai["settings"] as DifficultySettings;

    // Update patrol angle slowly
    ai["patrolAngle"] += (Math.random() - 0.5) * 0.1;

    // Move in patrol pattern around spawn area
    const patrolRadius = 200;
    const targetX =
      ai["patrolCenter"].x + Math.cos(ai["patrolAngle"]) * patrolRadius;
    const targetY =
      ai["patrolCenter"].y + Math.sin(ai["patrolAngle"]) * patrolRadius;

    // Move towards patrol target
    const dirToTarget = Math.atan2(targetY - ai.y, targetX - ai.x);
    const speed = settings.speed * 0.5 * (deltaTime / 1000); // Slower patrol speed

    const deltaX = Math.cos(dirToTarget) * speed;
    const deltaY = Math.sin(dirToTarget) * speed;

    ai.updatePosition(
      deltaX,
      deltaY,
      worldWidth,
      worldHeight,
      checkWallCollision
    );
    ai.updateAngle(dirToTarget);

    return NodeStatus.SUCCESS;
  }
}
