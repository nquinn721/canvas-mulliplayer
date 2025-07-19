# AI Pathfinding and Line of Sight System

This update adds advanced pathfinding and line-of-sight capabilities to AI bots to prevent them from shooting through walls and getting stuck on obstacles.

## New Features

### 🧠 Enhanced AI System

- **Line of Sight Detection**: AI bots can only shoot when they have a clear line of sight to players
- **A\* Pathfinding**: AI bots navigate around obstacles intelligently using A\* pathfinding algorithm
- **Obstacle Avoidance**: Bots actively avoid walls and obstacles when moving
- **Smart Navigation**: Path simplification reduces unnecessary waypoints for smooth movement

### 🎯 Intelligent Combat Behavior

- **No Wall Shooting**: AI bots will not fire projectiles through walls
- **Dynamic Positioning**: Bots find optimal positions that provide line of sight to targets
- **Tactical Movement**: Bots strafe and maintain optimal distance while avoiding obstacles
- **Adaptive Pathfinding**: Real-time path recalculation based on target movement

### ⚙️ Technical Improvements

- **PathfindingUtils**: Comprehensive utility class for navigation algorithms
- **EnhancedAIEnemy**: New AI class with advanced behavior trees
- **Grid-based Navigation**: Efficient pathfinding using spatial grid system
- **Performance Optimized**: Smart caching and path simplification for smooth gameplay

## Implementation Details

### Line of Sight System

The line of sight system uses Bresenham's line algorithm to check for wall intersections:

```typescript
// Check if AI can see the player
const hasLineOfSight = PathfindingUtils.hasLineOfSight(
  { x: ai.x, y: ai.y },
  { x: player.x, y: player.y },
  walls,
  ai.radius
);
```

### A\* Pathfinding

The A\* algorithm finds optimal paths around obstacles:

```typescript
// Find path from AI to target
const path = PathfindingUtils.findPath(
  startPosition,
  targetPosition,
  walls,
  worldWidth,
  worldHeight,
  entityRadius
);
```

### Enhanced Behavior Tree

The new behavior tree structure prioritizes:

1. **Enemy Detection**: Check if enemies are in range
2. **Line of Sight**: Verify clear shooting lanes
3. **Navigation**: Move towards targets while avoiding obstacles
4. **Combat**: Engage only when optimal conditions are met
5. **Patrol**: Intelligent patrolling when no targets are present

## AI Difficulty Levels

### Easy AI

- **Pathfinding**: Enabled with basic obstacle avoidance
- **Reaction Time**: 800ms delay for more forgiving gameplay
- **Avoidance Distance**: 120px buffer around obstacles
- **Accuracy**: 60% shooting accuracy

### Medium AI

- **Pathfinding**: Enhanced navigation with better path optimization
- **Reaction Time**: 400ms for balanced challenge
- **Avoidance Distance**: 100px optimal spacing
- **Accuracy**: 75% shooting accuracy

### Hard AI

- **Pathfinding**: Advanced pathfinding with predictive movement
- **Reaction Time**: 150ms near-instant response
- **Avoidance Distance**: 80px tight maneuvering
- **Accuracy**: 90% precision shooting

## Usage

The enhanced AI system is automatically enabled when you start the game. AI bots will:

1. **Navigate intelligently** around walls and obstacles
2. **Only shoot when they have clear line of sight** to prevent shooting through walls
3. **Find optimal positions** for combat while avoiding getting stuck
4. **Adapt their behavior** based on the selected difficulty level

## Performance Considerations

- **Grid-based pathfinding** uses 50px cells for efficient computation
- **Path simplification** removes unnecessary waypoints
- **Line of sight caching** reduces redundant calculations
- **Maximum iteration limits** prevent infinite loops

## Debug Information

Enable debug mode to see AI pathfinding information:

```typescript
const debugInfo = enhancedAI.getDebugInfo();
console.log(debugInfo);
// Output: "Enhanced AI ai_1: Difficulty=MEDIUM, Health=85/100, PathNodes=3, LOS=Target"
```

## Future Enhancements

- **Formation Movement**: AI bots moving in coordinated formations
- **Dynamic Difficulty**: Adaptive AI that adjusts to player skill level
- **Predictive Pathfinding**: Anticipating player movement for advanced tactics
- **Cover System**: AI bots using walls as cover during combat
- **Cooperative AI**: Multiple bots working together strategically

---

_The enhanced AI pathfinding system provides more challenging, realistic, and fair gameplay by ensuring AI bots behave intelligently around obstacles and never cheat by shooting through walls._
