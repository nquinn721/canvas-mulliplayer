# Destructible Environment System Guide

This guide explains how to use and configure the new destructible environment system that adds strategic depth to the multiplayer space shooter.

## Overview

The destructible environment system introduces three types of interactive obstacles:

1. **Regular Walls** - Indestructible barriers for permanent map structure
2. **Destructible Walls** - Breakable barriers that can be destroyed by weapons
3. **Environmental Obstacles** - Various destructible objects with unique properties

## Features

### Destructible Wall Types

**Concrete Walls** (Most Common)

- Health: 120 HP
- Color: Gray (#8B8B8B)
- Moderate durability for standard cover

**Metal Walls** (High Durability)

- Health: 200 HP
- Color: Silver (#C0C0C0)
- Strong barriers with golden spark particles
- Best for defensive positions

**Glass Barriers** (Fragile)

- Health: 40 HP
- Color: Light Blue (#E6F3FF)
- Shatters easily with dramatic particle effects
- Good for temporary cover

**Energy Barriers** (Medium Durability)

- Health: 80 HP
- Color: Cyan (#00FFFF)
- Sci-fi energy fields with glowing particles

**Crystal Structures** (Low-Medium Durability)

- Health: 60 HP
- Color: Pink (#FF69B4)
- Crystalline formations with prismatic particles

**Wooden Barriers** (Low Durability)

- Health: 50 HP
- Color: Brown (#8B4513)
- Basic wooden structures with wood chip particles

### Environmental Obstacle Types

**Asteroids** (Common)

- Health: 150 HP
- Shape: Large circular rocks
- Non-explosive but durable

**Space Debris** (Common)

- Health: 80 HP
- Shape: Rotating metal fragments
- Moderate durability

**Energy Cores** (Explosive)

- Health: 60 HP
- Shape: Glowing spheres with pulsing animation
- **Explosion**: 100px radius, 40 damage
- Chain reaction potential

**Fuel Tanks** (Highly Explosive)

- Health: 70 HP
- Shape: Orange cylindrical containers
- **Explosion**: 120px radius, 50 damage
- Highest explosion damage

**Shield Generators** (Utility)

- Health: 100 HP
- Shape: Rectangular devices with animation
- Future: Could provide temporary shields

**Satellites** (Tech Debris)

- Health: 90 HP
- Shape: Rotating rectangular objects
- High-tech appearance

**Ice Crystals** (Environmental)

- Health: 50 HP
- Shape: Pale blue crystalline structures
- Animated with frost effects

**Plasma Conduits** (Explosive)

- Health: 110 HP
- Shape: Purple energy transmission lines
- **Explosion**: 80px radius, 35 damage

## Weapon Effectiveness

### Damage Multipliers

**Against Destructible Walls:**

- Lasers: 80% damage (0.8x multiplier)
- Missiles: 150% damage (1.5x multiplier)
- Explosions: 200% damage (2.0x multiplier)

**Against Environmental Obstacles:**

- Lasers: 100% damage (1.0x multiplier)
- Missiles: 120% damage (1.2x multiplier)
- Explosions: 180% damage (1.8x multiplier)

### Strategic Implications

- **Missiles** are most effective against walls
- **Explosions** deal massive damage to all destructible objects
- **Chain reactions** can clear entire areas when explosive objects are clustered

## Visual Feedback

### Health Indication

- Objects change color as they take damage
- Health bars appear when damage is below 90%
- Critical damage (below 30%) shows red health bars

### Particle Effects

- **Impact particles** when objects are hit
- **Destruction particles** when objects are destroyed
- **Explosion effects** for explosive objects
- Particles have physics (gravity, air resistance)

## Gameplay Mechanics

### Experience Rewards

- **Wall Destruction**: 5 XP
- **Obstacle Destruction**: 12.5 XP
- **Chain Explosion Bonus**: 1.5x score multiplier

### Explosions

- Damage decreases with distance from explosion center
- Can kill players, AI enemies, and swarm AI
- 30% chance to trigger chain reactions with nearby explosives
- Damage calculation: `baseDamage * (1 - distance/radius) * 0.6`

### Strategic Elements

- **Cover Destruction**: Remove enemy hiding spots
- **Path Creation**: Destroy walls to create new routes
- **Area Denial**: Use explosions to control space
- **Chain Reactions**: Plan explosive cascades

## Configuration

### Spawn Rates (Standard Mode)

- Regular Walls: 40
- Destructible Walls: 15
- Environmental Obstacles: 10

### Alternative Game Modes

**Destruction Mode** (More destructible objects)

- Regular Walls: 20
- Destructible Walls: 25
- Environmental Obstacles: 20

**Fortress Mode** (More defensive walls)

- Regular Walls: 60
- Destructible Walls: 10
- Environmental Obstacles: 5

**Chaos Mode** (Maximum destruction)

- Regular Walls: 10
- Destructible Walls: 30
- Environmental Obstacles: 25

## Technical Implementation

### Server-Side

- Collision detection with all destructible objects
- Damage calculation with weapon multipliers
- Explosion handling with area effects
- Particle system updates
- Network synchronization

### Client-Side

- Rendering of destructible objects with health-based colors
- Particle effects display
- Animation of rotating and pulsing objects
- Health bar visualization

### Network Events

- `wallHit` - Destructible wall takes damage
- `wallDestroyed` - Destructible wall is destroyed
- `obstacleHit` - Environmental obstacle takes damage
- `obstacleDestroyed` - Environmental obstacle is destroyed
- `explosion` - Explosion effect with area damage

## AI Behavior

### Strategic AI Considerations

- AI avoids explosive objects when at low health
- AI targets destructible cover to expose players
- Pathfinding updates when objects are destroyed
- Explosion damage affects AI decision making

## Performance Optimization

- Visible object culling based on camera view
- Particle count limits to maintain performance
- Efficient collision detection algorithms
- Network data compression for large object counts

## Future Enhancements

### Planned Features

- **Shield Generator Functionality**: Temporary protective barriers
- **Destructible Terrain**: Ground/floor destruction
- **Environmental Hazards**: Toxic clouds, electrical fields
- **Reconstruction**: Some objects slowly regenerate
- **Interactive Elements**: Switches, doors, elevators

### Advanced Mechanics

- **Material Properties**: Objects behave differently (metal bounces projectiles, etc.)
- **Environmental Combos**: Special effects when certain objects are destroyed together
- **Player Construction**: Ability to build temporary barriers
- **Weather Effects**: Environmental changes affect object durability

## Usage Examples

### Tactical Scenarios

**Breaching**: Use missiles to destroy wall sections and create new attack routes

**Area Denial**: Shoot fuel tanks near enemy positions to force movement

**Chain Clearing**: Target energy cores in clusters to clear large areas

**Cover Creation**: Destroy obstacles to create temporary hiding spots from their debris

---

_The destructible environment system transforms static maps into dynamic battlefields where terrain becomes a tactical resource to be created, destroyed, and controlled._
