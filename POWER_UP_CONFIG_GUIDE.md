# Power-Up Configuration Guide

## Overview

All power-up related numbers are now centralized in `shared/config/PowerUpConfig.ts`. This makes it easy to tweak game balance without hunting through multiple files.

## Configuration Structure

### Laser Upgrade

- **Base Stats**: Speed, damage, distance, fire rate
- **Multipliers**: How much each stat increases per level (as percentages)
- **Features**: Dual shot at level 3, backward laser at level 5

### Missile Upgrade

- **Base Stats**: Speed, damage, distance, tracking range, turn rate
- **Multipliers**: How much each stat increases per level
- **Features**: Dual shot at level 3, triple shot at level 5

### Flash Upgrade

- **Base Stats**: Cooldown, charges, teleport distance
- **Improvements**: Cooldown reduction, extra charges, more distance per level

### Boost Upgrade

- **Speed**: Base multiplier + bonus per level
- **Energy**: Drain rate reduction and regen improvement per level
- **Duration**: Set to 0 for permanent upgrades, or >0 for temporary (currently permanent)

### Health & Shield Pickups

- **Health**: Fixed heal amount and experience reward
- **Shield**: Shield points, duration, and experience reward (always temporary)

### Spawning System

- **Timing**: How often power-ups spawn
- **Limits**: Maximum power-ups on map
- **Chances**: Probability of each power-up type spawning

## How to Tweak Values

### Example: Make Missiles More Powerful

```typescript
// In PowerUpConfig.ts
missileUpgrade: {
  baseDamage: 75, // Increase from 50
  damageMultiplierPerLevel: 0.20, // Increase from 0.15 (20% per level)
  // ... other settings
}
```

### Example: Make Boosts Temporary Again

```typescript
boostUpgrade: {
  durationMs: 90000, // Change from 0 to 90000 (1.5 minutes instead of permanent)
  speedBonusPerLevel: 0.75, // Increase from 0.5 (more speed per level)
  // ... other settings
}
```

### Example: Make Upgrades Permanent vs Temporary

```typescript
// For permanent upgrades (like current boost):
durationMs: 0, // 0 = permanent, never expires

// For temporary upgrades (like shields):
durationMs: 30000, // 30 seconds, then expires
```

### Example: Change Power-Up Spawn Rates

```typescript
spawning: {
  spawnIntervalMs: 10000, // Spawn every 10 seconds instead of 15
  spawnChances: {
    laserUpgrade: 0.30, // 30% chance (was 20%)
    missileUpgrade: 0.30, // 30% chance (was 20%)
    healthPickup: 0.10, // 10% chance (was 20%)
    // ... must total 1.0
  }
}
```

## Helper Functions

The config file includes helper functions to calculate stats:

```typescript
// Get calculated stats for any level
const laserLevel3 = getLaserStats(3);
const missileLevel5 = getMissileStats(5);
const flashLevel2 = getFlashStats(2);
const boostLevel3 = getBoostStats(3);
```

## Validation

The config includes validation to ensure spawn chances add up to 100%:

```typescript
validatePowerUpConfig(); // Returns true if valid, logs warning if not
```

## Files Updated

- `shared/config/PowerUpConfig.ts` - Main configuration file
- `shared/classes/Player.ts` - Uses config for all power-up calculations
- `src/game/game.gateway.ts` - Server-side power-up application
- All power-up related methods now reference the central config

## Quick Balance Changes

### Make the game easier:

- Increase `healAmount` for health pickups
- Decrease missile `baseDamage`
- Increase boost `durationMs`
- Increase power-up `spawnIntervalMs` (spawn more often)

### Make the game harder:

- Decrease `healAmount` for health pickups
- Increase missile `baseDamage`
- Decrease boost `durationMs`
- Decrease power-up `spawnIntervalMs` (spawn less often)

### Focus on different play styles:

- Increase laser spawn chance for fast-paced action
- Increase missile spawn chance for tactical gameplay
- Increase health spawn chance for survival gameplay
- Increase boost spawn chance for mobility-focused gameplay

## Testing Changes

After making changes:

1. The server will automatically reload with new values
2. Clients will get updated stats from the server
3. Use `validatePowerUpConfig()` to check spawn chances sum to 1.0
4. Test different upgrade levels to ensure balance feels right
