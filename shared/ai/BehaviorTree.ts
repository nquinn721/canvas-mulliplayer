export enum BehaviorResult {
  SUCCESS = "success",
  FAILURE = "failure",
  RUNNING = "running"
}

export interface BehaviorContext {
  ai: any;
  players: Map<string, any>;
  powerUps?: Map<string, any>;
  worldWidth: number;
  worldHeight: number;
  deltaTime: number;
  currentTime: number;
  checkWallCollision?: (x: number, y: number, radius: number) => boolean;
}

export abstract class BehaviorNode {
  abstract execute(context: BehaviorContext): BehaviorResult;
}

// Composite Nodes
export class SequenceNode extends BehaviorNode {
  private children: BehaviorNode[] = [];
  private currentIndex = 0;

  constructor(children: BehaviorNode[]) {
    super();
    this.children = children;
  }

  execute(context: BehaviorContext): BehaviorResult {
    while (this.currentIndex < this.children.length) {
      const result = this.children[this.currentIndex].execute(context);
      
      if (result === BehaviorResult.FAILURE) {
        this.currentIndex = 0;
        return BehaviorResult.FAILURE;
      }
      
      if (result === BehaviorResult.RUNNING) {
        return BehaviorResult.RUNNING;
      }
      
      this.currentIndex++;
    }
    
    this.currentIndex = 0;
    return BehaviorResult.SUCCESS;
  }
}

export class SelectorNode extends BehaviorNode {
  private children: BehaviorNode[] = [];
  private currentIndex = 0;

  constructor(children: BehaviorNode[]) {
    super();
    this.children = children;
  }

  execute(context: BehaviorContext): BehaviorResult {
    // A SelectorNode should try all children from the beginning each time
    for (let i = 0; i < this.children.length; i++) {
      const result = this.children[i].execute(context);
      
      if (result === BehaviorResult.SUCCESS || result === BehaviorResult.RUNNING) {
        return result;
      }
      
      // Continue to next child if this one failed
    }
    
    return BehaviorResult.FAILURE;
  }
}

// Condition Nodes
export class IsEnemyNearbyNode extends BehaviorNode {
  constructor(private range: number) {
    super();
  }

  execute(context: BehaviorContext): BehaviorResult {
    const nearestEnemy = this.findNearestPlayer(context);
    const distance = nearestEnemy ? this.getDistance(context.ai, nearestEnemy) : Infinity;
    
    if (nearestEnemy && distance <= this.range) {
      return BehaviorResult.SUCCESS;
    }
    return BehaviorResult.FAILURE;
  }

  private findNearestPlayer(context: BehaviorContext): any | null {
    let nearest: any = null;
    let minDistance = Infinity;

    context.players.forEach((player) => {
      if (player.id === context.ai.id) return; // Skip self
      
      const distance = this.getDistance(context.ai, player);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = player;
      }
    });

    return nearest;
  }

  private getDistance(a: any, b: any): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
}

export class IsHealthLowNode extends BehaviorNode {
  constructor(private threshold: number = 0.3) {
    super();
  }

  execute(context: BehaviorContext): BehaviorResult {
    const healthPercentage = context.ai.health / context.ai.maxHealth;
    return healthPercentage < this.threshold ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
  }
}

export class IsPowerUpNearbyNode extends BehaviorNode {
  constructor(private range: number = 200) {
    super();
  }

  execute(context: BehaviorContext): BehaviorResult {
    if (!context.powerUps) return BehaviorResult.FAILURE;

    for (const powerUp of context.powerUps.values()) {
      if (powerUp.collected) continue;
      
      const distance = Math.sqrt(
        (context.ai.x - powerUp.x) ** 2 + (context.ai.y - powerUp.y) ** 2
      );
      
      if (distance <= this.range) {
        return BehaviorResult.SUCCESS;
      }
    }
    
    return BehaviorResult.FAILURE;
  }
}

// Action Nodes
export class AttackNearestEnemyNode extends BehaviorNode {
  constructor(
    private attackRange: number,
    private difficultyLevel: number = 0.5
  ) {
    super();
  }

  execute(context: BehaviorContext): BehaviorResult {
    const target = this.findNearestPlayer(context);
    if (!target) {
      return BehaviorResult.FAILURE;
    }

    const distance = this.getDistance(context.ai, target);
    if (distance > this.attackRange) {
      return BehaviorResult.FAILURE;
    }

    // Add difficulty-based accuracy
    const baseAngle = Math.atan2(target.y - context.ai.y, target.x - context.ai.x);
    const accuracyOffset = (1 - this.difficultyLevel) * 0.3; // Max 0.3 radians offset on easiest
    const angleOffset = (Math.random() - 0.5) * accuracyOffset;
    const finalAngle = baseAngle + angleOffset;

    // Add reaction delay based on difficulty
    const reactionDelay = (1 - this.difficultyLevel) * 500; // Up to 500ms delay
    const now = Date.now();
    
    if (!context.ai.lastReactionTime) {
      context.ai.lastReactionTime = now;
    }
    
    if (now - context.ai.lastReactionTime < reactionDelay) {
      return BehaviorResult.RUNNING;
    }

    context.ai.angle = finalAngle;
    context.ai.lastShootTime = now;
    context.ai.lastReactionTime = now;

    // Choose weapon based on distance and difficulty
    const weaponChoice = distance > 250 && this.difficultyLevel > 0.4 && Math.random() < 0.3;
    context.ai.shouldShootMissile = weaponChoice;
    context.ai.shouldShootLaser = !weaponChoice;

    return BehaviorResult.SUCCESS;
  }

  private findNearestPlayer(context: BehaviorContext): any | null {
    let nearest: any = null;
    let minDistance = Infinity;

    context.players.forEach((player) => {
      if (player.id === context.ai.id) return;
      
      const distance = this.getDistance(context.ai, player);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = player;
      }
    });

    return nearest;
  }

  private getDistance(a: any, b: any): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
}

export class FleeFromEnemyNode extends BehaviorNode {
  execute(context: BehaviorContext): BehaviorResult {
    const nearestEnemy = this.findNearestPlayer(context);
    if (!nearestEnemy) return BehaviorResult.FAILURE;

    // Calculate flee direction (opposite to enemy)
    const fleeAngle = Math.atan2(context.ai.y - nearestEnemy.y, context.ai.x - nearestEnemy.x);
    
    // Move away from enemy
    const speed = context.ai.speed * (context.deltaTime / 1000);
    const deltaX = Math.cos(fleeAngle) * speed;
    const deltaY = Math.sin(fleeAngle) * speed;

    // Check bounds and walls
    const newX = Math.max(context.ai.radius, Math.min(context.worldWidth - context.ai.radius, context.ai.x + deltaX));
    const newY = Math.max(context.ai.radius, Math.min(context.worldHeight - context.ai.radius, context.ai.y + deltaY));

    if (!context.checkWallCollision || !context.checkWallCollision(newX, newY, context.ai.radius)) {
      context.ai.x = newX;
      context.ai.y = newY;
    }

    // Face the flee direction
    context.ai.angle = fleeAngle;

    // Use boost when fleeing if available
    if (context.ai.canUseBoost && context.ai.canUseBoost()) {
      context.ai.activateBoost();
    }

    return BehaviorResult.SUCCESS;
  }

  private findNearestPlayer(context: BehaviorContext): any | null {
    let nearest: any = null;
    let minDistance = Infinity;

    context.players.forEach((player) => {
      if (player.id === context.ai.id) return;
      
      const distance = Math.sqrt((context.ai.x - player.x) ** 2 + (context.ai.y - player.y) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = player;
      }
    });

    return nearest;
  }
}

export class SeekPowerUpNode extends BehaviorNode {
  execute(context: BehaviorContext): BehaviorResult {
    if (!context.powerUps) return BehaviorResult.FAILURE;

    let nearestPowerUp: any = null;
    let minDistance = Infinity;

    context.powerUps.forEach((powerUp) => {
      if (powerUp.collected) return;
      
      const distance = Math.sqrt(
        (context.ai.x - powerUp.x) ** 2 + (context.ai.y - powerUp.y) ** 2
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestPowerUp = powerUp;
      }
    });

    if (!nearestPowerUp) return BehaviorResult.FAILURE;

    // Move towards power-up
    const angle = Math.atan2(nearestPowerUp.y - context.ai.y, nearestPowerUp.x - context.ai.x);
    const speed = context.ai.speed * (context.deltaTime / 1000);
    const deltaX = Math.cos(angle) * speed;
    const deltaY = Math.sin(angle) * speed;

    const newX = Math.max(context.ai.radius, Math.min(context.worldWidth - context.ai.radius, context.ai.x + deltaX));
    const newY = Math.max(context.ai.radius, Math.min(context.worldHeight - context.ai.radius, context.ai.y + deltaY));

    if (!context.checkWallCollision || !context.checkWallCollision(newX, newY, context.ai.radius)) {
      context.ai.x = newX;
      context.ai.y = newY;
    }

    // Face the direction of movement towards power-up
    context.ai.angle = angle;

    return BehaviorResult.RUNNING;
  }
}

export class PatrolNode extends BehaviorNode {
  constructor(private difficultyLevel: number = 0.5) {
    super();
  }

  execute(context: BehaviorContext): BehaviorResult {
    // Change direction periodically (more random on easier difficulties)
    const now = Date.now();
    const changeInterval = 2000 + (1 - this.difficultyLevel) * 3000; // 2-5 seconds
    
    if (!context.ai.lastDirectionChange || now - context.ai.lastDirectionChange > changeInterval) {
      context.ai.currentMoveAngle = Math.random() * Math.PI * 2;
      context.ai.lastDirectionChange = now;
    }

    // Move in current direction
    const speed = context.ai.speed * (context.deltaTime / 1000) * 0.5; // Slower when patrolling
    const deltaX = Math.cos(context.ai.currentMoveAngle) * speed;
    const deltaY = Math.sin(context.ai.currentMoveAngle) * speed;

    const newX = Math.max(context.ai.radius, Math.min(context.worldWidth - context.ai.radius, context.ai.x + deltaX));
    const newY = Math.max(context.ai.radius, Math.min(context.worldHeight - context.ai.radius, context.ai.y + deltaY));

    // Check for walls and change direction if needed
    if (context.checkWallCollision && context.checkWallCollision(newX, newY, context.ai.radius)) {
      context.ai.currentMoveAngle = Math.random() * Math.PI * 2;
      return BehaviorResult.RUNNING;
    }

    context.ai.x = newX;
    context.ai.y = newY;
    
    // Face the movement direction when patrolling
    context.ai.angle = context.ai.currentMoveAngle;

    return BehaviorResult.RUNNING;
  }
}

// AI Difficulty Profiles
export interface DifficultyProfile {
  name: string;
  level: number; // 0.0 to 1.0
  reactionTime: number; // milliseconds
  accuracy: number; // 0.0 to 1.0
  aggressiveness: number; // 0.0 to 1.0
  combatRange: number;
  fleeThreshold: number; // health percentage
}

export const DifficultyProfiles: { [key: string]: DifficultyProfile } = {
  EASY: {
    name: "Easy",
    level: 0.3,
    reactionTime: 800,
    accuracy: 0.6,
    aggressiveness: 0.4,
    combatRange: 1200, // Reasonable range for Easy AI
    fleeThreshold: 0.5
  },
  MEDIUM: {
    name: "Medium", 
    level: 0.6,
    reactionTime: 400,
    accuracy: 0.8,
    aggressiveness: 0.7,
    combatRange: 1400, // Reasonable range for Medium AI
    fleeThreshold: 0.3
  },
  HARD: {
    name: "Hard",
    level: 0.9,
    reactionTime: 200,
    accuracy: 0.95,
    aggressiveness: 0.9,
    combatRange: 1600, // Reasonable range for Hard AI
    fleeThreshold: 0.15
  }
};
