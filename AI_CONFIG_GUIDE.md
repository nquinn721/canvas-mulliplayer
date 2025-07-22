# AI Configuration System

This document describes the new AI difficulty configuration system that allows for fine-tuned control over AI bot behavior and stats.

## Overview

The AI configuration system provides 5 difficulty levels with comprehensive settings for each level:

- **EASY** - Beginner-friendly bots with lower health and slower reactions
- **MEDIUM** - Balanced bots for average players
- **HARD** - Challenging bots with better abilities and tactics
- **EXPERT** - Very difficult bots with high-level abilities
- **NIGHTMARE** - Extremely challenging bots for expert players

## Configuration Categories

### Basic Stats

- `health` / `maxHealth` - Bot health points (scales with difficulty)
- `speed` - Movement speed
- `radius` - Collision radius

### Combat Settings

- `detectionRange` - How far bots can detect players
- `optimalRange` - Preferred combat distance
- `minRange` - Minimum engagement distance
- `accuracy` - Shooting accuracy (0-1)
- `reactionTime` - Delay before reacting to players

### Ability Levels

- `laserUpgradeLevel` - Laser weapon upgrade level (1-5)
- `missileUpgradeLevel` - Missile weapon upgrade level (1-5)
- `flashUpgradeLevel` - Flash ability upgrade level (1-5)
- `boostUpgradeLevel` - Boost ability upgrade level (1-4)

### Behavior Settings

- `aggressiveness` - How aggressive the bot is (0-1)
- `pathfindingEnabled` - Whether bot uses smart pathfinding
- `avoidanceDistance` - Distance to maintain from obstacles
- `shootCooldown` - General shooting frequency
- `missilePreference` - Probability of choosing missiles over lasers

### Movement Patterns

- `patrolRadius` - Area size for patrolling
- `combatMovementSpeed` - Movement speed multiplier in combat
- `retreatThreshold` - Health percentage to start retreating

## Difficulty Progression

| Difficulty | Health | Speed | Accuracy | Abilities | Description                  |
| ---------- | ------ | ----- | -------- | --------- | ---------------------------- |
| EASY       | 80     | 180   | 60%      | Level 1   | Slow, inaccurate, low health |
| MEDIUM     | 120    | 200   | 75%      | Level 2   | Balanced stats               |
| HARD       | 180    | 220   | 85%      | Level 3   | Fast, accurate, high health  |
| EXPERT     | 250    | 240   | 90%      | Level 4   | Very challenging             |
| NIGHTMARE  | 350    | 260   | 95%      | Level 5   | Extremely difficult          |

## Usage

The AI config is automatically applied when creating AI bots or changing difficulty:

```typescript
// Create AI with specific difficulty
const aiBot = new EnhancedAIEnemy("bot1", x, y, "HARD");

// Change difficulty of existing bot
aiBot.setDifficulty("EXPERT");

// Get available difficulties
const levels = getAvailableDifficulties(); // ["EASY", "MEDIUM", "HARD", "EXPERT", "NIGHTMARE"]
```

## Key Benefits

1. **Scalable Difficulty** - Health scales from 80 (Easy) to 350 (Nightmare)
2. **Balanced Progression** - Each level provides meaningful upgrades
3. **Comprehensive Settings** - Every aspect of AI behavior is configurable
4. **Easy Customization** - All settings in one centralized config file
5. **Type Safety** - Full TypeScript support with proper interfaces

## Cooldown System Integration

The AI now properly respects ability cooldowns:

- **Missile Cooldown** - Based on upgrade level (3000ms base, reduced 10% per level)
- **Laser Cooldown** - Fixed 500ms cooldown
- **Smart Weapon Selection** - Falls back to available weapons when preferred weapon is on cooldown
- **No Spam** - AI won't shoot when all weapons are on cooldown

This creates much more balanced and realistic AI combat behavior.
