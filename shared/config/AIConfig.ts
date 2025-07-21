/**
 * AI Configuration settings
 * All AI difficulty-related settings can be tweaked here
 */

export interface AIDifficultyConfig {
  // Basic Stats
  health: number;
  maxHealth: number;
  speed: number;
  radius: number;
  
  // Combat Settings
  detectionRange: number;
  optimalRange: number;
  minRange: number;
  accuracy: number; // 0-1, higher = more accurate
  reactionTime: number; // milliseconds delay before reacting
  
  // Ability Levels
  laserUpgradeLevel: number;
  missileUpgradeLevel: number;
  flashUpgradeLevel: number;
  boostUpgradeLevel: number;
  
  // Behavior Settings
  aggressiveness: number; // 0-1, higher = more aggressive
  pathfindingEnabled: boolean;
  avoidanceDistance: number;
  
  // Combat Frequency
  shootCooldown: number; // General shooting cooldown
  missilePreference: number; // 0-1, chance to prefer missiles over lasers
  
  // Movement Patterns
  patrolRadius: number;
  combatMovementSpeed: number;
  retreatThreshold: number; // Health percentage to start retreating
}

// Pre-configured difficulty levels
export const AI_DIFFICULTY_PRESETS: Record<string, AIDifficultyConfig> = {
  EASY: {
    // Basic Stats
    health: 80,
    maxHealth: 80,
    speed: 180,
    radius: 18,
    
    // Combat Settings
    detectionRange: 300,
    optimalRange: 200,
    minRange: 100,
    accuracy: 0.6,
    reactionTime: 800,
    
    // Ability Levels
    laserUpgradeLevel: 1,
    missileUpgradeLevel: 1,
    flashUpgradeLevel: 1,
    boostUpgradeLevel: 1,
    
    // Behavior Settings
    aggressiveness: 0.3,
    pathfindingEnabled: true,
    avoidanceDistance: 50,
    
    // Combat Frequency
    shootCooldown: 2500,
    missilePreference: 0.15, // 15% chance for missiles
    
    // Movement Patterns
    patrolRadius: 100,
    combatMovementSpeed: 0.8,
    retreatThreshold: 0.3, // Retreat at 30% health
  },

  MEDIUM: {
    // Basic Stats
    health: 120,
    maxHealth: 120,
    speed: 200,
    radius: 18,
    
    // Combat Settings
    detectionRange: 400,
    optimalRange: 250,
    minRange: 80,
    accuracy: 0.75,
    reactionTime: 500,
    
    // Ability Levels
    laserUpgradeLevel: 2,
    missileUpgradeLevel: 2,
    flashUpgradeLevel: 2,
    boostUpgradeLevel: 1,
    
    // Behavior Settings
    aggressiveness: 0.6,
    pathfindingEnabled: true,
    avoidanceDistance: 40,
    
    // Combat Frequency
    shootCooldown: 2000,
    missilePreference: 0.35, // 35% chance for missiles
    
    // Movement Patterns
    patrolRadius: 120,
    combatMovementSpeed: 1.0,
    retreatThreshold: 0.25, // Retreat at 25% health
  },

  HARD: {
    // Basic Stats
    health: 180,
    maxHealth: 180,
    speed: 220,
    radius: 18,
    
    // Combat Settings
    detectionRange: 500,
    optimalRange: 300,
    minRange: 60,
    accuracy: 0.85,
    reactionTime: 300,
    
    // Ability Levels
    laserUpgradeLevel: 3,
    missileUpgradeLevel: 3,
    flashUpgradeLevel: 3,
    boostUpgradeLevel: 2,
    
    // Behavior Settings
    aggressiveness: 0.8,
    pathfindingEnabled: true,
    avoidanceDistance: 30,
    
    // Combat Frequency
    shootCooldown: 1500,
    missilePreference: 0.5, // 50% chance for missiles
    
    // Movement Patterns
    patrolRadius: 150,
    combatMovementSpeed: 1.2,
    retreatThreshold: 0.2, // Retreat at 20% health
  },

  EXPERT: {
    // Basic Stats
    health: 250,
    maxHealth: 250,
    speed: 240,
    radius: 18,
    
    // Combat Settings
    detectionRange: 600,
    optimalRange: 350,
    minRange: 50,
    accuracy: 0.9,
    reactionTime: 200,
    
    // Ability Levels
    laserUpgradeLevel: 4,
    missileUpgradeLevel: 4,
    flashUpgradeLevel: 4,
    boostUpgradeLevel: 3,
    
    // Behavior Settings
    aggressiveness: 0.9,
    pathfindingEnabled: true,
    avoidanceDistance: 25,
    
    // Combat Frequency
    shootCooldown: 1200,
    missilePreference: 0.6, // 60% chance for missiles
    
    // Movement Patterns
    patrolRadius: 180,
    combatMovementSpeed: 1.3,
    retreatThreshold: 0.15, // Retreat at 15% health
  },

  NIGHTMARE: {
    // Basic Stats
    health: 350,
    maxHealth: 350,
    speed: 260,
    radius: 18,
    
    // Combat Settings
    detectionRange: 700,
    optimalRange: 400,
    minRange: 40,
    accuracy: 0.95,
    reactionTime: 150,
    
    // Ability Levels
    laserUpgradeLevel: 5,
    missileUpgradeLevel: 5,
    flashUpgradeLevel: 5,
    boostUpgradeLevel: 4,
    
    // Behavior Settings
    aggressiveness: 1.0,
    pathfindingEnabled: true,
    avoidanceDistance: 20,
    
    // Combat Frequency
    shootCooldown: 1000,
    missilePreference: 0.7, // 70% chance for missiles
    
    // Movement Patterns
    patrolRadius: 200,
    combatMovementSpeed: 1.5,
    retreatThreshold: 0.1, // Retreat at 10% health
  }
};

// Helper function to get AI config by difficulty
export function getAIConfig(difficulty: string): AIDifficultyConfig {
  const config = AI_DIFFICULTY_PRESETS[difficulty.toUpperCase()];
  if (!config) {
    console.warn(`Unknown AI difficulty: ${difficulty}, defaulting to MEDIUM`);
    return AI_DIFFICULTY_PRESETS.MEDIUM;
  }
  return config;
}

// Helper function to get all available difficulty levels
export function getAvailableDifficulties(): string[] {
  return Object.keys(AI_DIFFICULTY_PRESETS);
}

// Helper function to validate difficulty level
export function isValidDifficulty(difficulty: string): boolean {
  return Object.keys(AI_DIFFICULTY_PRESETS).includes(difficulty.toUpperCase());
}
