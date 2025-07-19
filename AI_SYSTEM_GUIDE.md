# Smart AI Enemy System

This document explains how to use the new SmartAIEnemy system with behavior trees for enhanced AI gameplay.

## Overview

The SmartAIEnemy system replaces basic AI logic with a sophisticated behavior tree system that provides:

- **Adjustable difficulty levels** (Easy, Medium, Hard)
- **Intelligent decision making** with priorities
- **Realistic AI behavior** that's challenging but not overpowered
- **Better combat awareness** and tactical decisions

## Features

### Difficulty Levels

**Easy AI:**

- Slower reaction time (800ms)
- Lower accuracy (70%)
- Less aggressive behavior
- Flees when health drops below 40%
- Shorter combat range (300 units)

**Medium AI:**

- Moderate reaction time (400ms)
- Good accuracy (85%)
- Balanced aggression
- Flees when health drops below 25%
- Standard combat range (400 units)

**Hard AI:**

- Fast reaction time (150ms)
- High accuracy (95%)
- Very aggressive behavior
- Only flees when health drops below 15%
- Extended combat range (500 units)

### Behavior Tree Structure

The AI uses a priority-based decision tree:

1. **Survival**: If health is low → Flee from enemies
2. **Combat**: If enemy nearby → Attack with appropriate weapon
3. **Utility**: If power-up nearby → Seek power-ups
4. **Default**: Patrol area randomly

### Weapon Selection

The AI intelligently chooses weapons based on:

- **Distance to target**: Missiles for long range (>250 units)
- **Difficulty level**: Higher difficulty uses missiles more frequently
- **Random variation**: Adds unpredictability to combat

## Usage in Game

### Spawning Smart AI Enemies

The game gateway now automatically spawns SmartAIEnemy instances with random difficulty:

- 30% Easy
- 50% Medium
- 20% Hard

### Runtime Difficulty Adjustment

You can change AI difficulty during gameplay:

```typescript
const smartAI = aiEnemy as SmartAIEnemy;
smartAI.setDifficulty("HARD"); // Changes behavior immediately
```

### Debugging AI Behavior

Get information about AI state:

```typescript
const smartAI = aiEnemy as SmartAIEnemy;
console.log(smartAI.getDebugInfo());
// Output: "AI ai_1: Difficulty=MEDIUM, Health=85/100, Boost=150/200"
```

## Integration

The system maintains backward compatibility with the existing AIEnemy class while providing enhanced behavior for SmartAIEnemy instances. The game gateway automatically detects which type of AI it's dealing with and uses the appropriate shooting system.

## Performance

The behavior tree system is designed to be efficient:

- Nodes short-circuit on failure for fast decision making
- Reaction delays prevent excessive processing
- State is maintained between frames for smooth behavior

## Future Enhancements

The behavior tree system can be easily extended with:

- Formation flying for multiple AI
- Learning from player behavior patterns
- Dynamic difficulty adjustment based on player skill
- Cooperative AI tactics
- Environmental awareness (cover, obstacles)

---

_The SmartAIEnemy system provides a solid foundation for challenging, fair, and engaging AI opponents in your multiplayer space shooter._
