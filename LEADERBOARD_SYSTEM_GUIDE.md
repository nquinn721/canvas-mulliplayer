# Leaderboard System Documentation

## Overview

The leaderboard system provides comprehensive scoring, ranking, and competitive features for the multiplayer canvas game. It includes real-time score calculation, multiple leaderboard categories, and automated ranking updates.

## Features

### 1. Database Schema

#### Leaderboard Table

- **Primary Key**: UUID
- **Foreign Key**: userId (references user.id)
- **Indexes**: Optimized for ranking queries
- **Unique Constraints**: Prevents duplicate entries per user/period/category

#### Key Fields

- `type`: Leaderboard period (daily, weekly, monthly, all_time, seasonal)
- `category`: Score category (total_score, kills, survival_time, win_rate, etc.)
- `score`: Main ranking value
- `rank`: Current position
- `periodStart/periodEnd`: Time boundaries for the leaderboard period

### 2. Scoring System

#### Score Multipliers

```typescript
{
  kill: 100,           // Points per kill
  assist: 50,          // Points per assist
  survival: 1,         // Points per second survived
  powerUpCollection: 25, // Points per power-up collected
  enemyDestroyed: 75,  // Points per AI enemy destroyed
  meteorDestroyed: 10, // Points per meteor destroyed
  headshot: 150,       // Bonus for precision kills
  multiKill: 50,       // Bonus per additional kill in multi-kill
  streak: 25,          // Bonus per kill in streak
  firstBlood: 200,     // First kill of the match
  lastManStanding: 500, // Survive when all others are eliminated
  victory: 1000,       // Win the match
  perfectGame: 2000,   // Win without dying
  damageTaken: -0.1,   // Small penalty per damage point
  death: -50           // Penalty for dying
}
```

#### Streak Bonuses

- Double Kill: 100 points
- Triple Kill: 200 points
- Multi Kill: 300 points
- Ultra Kill: 500 points
- Rampage: 750 points
- Unstoppable: 1000 points
- Godlike: 1500 points

### 3. Leaderboard Types

#### Daily Leaderboard

- **Period**: 24 hours (midnight to midnight)
- **Retention**: 7 days
- **Updates**: Every 5 minutes

#### Weekly Leaderboard

- **Period**: Sunday to Saturday
- **Retention**: 30 days
- **Updates**: Every 5 minutes

#### Monthly Leaderboard

- **Period**: First day to last day of month
- **Retention**: 365 days
- **Updates**: Every 5 minutes

#### All-Time Leaderboard

- **Period**: Permanent
- **Retention**: Never deleted
- **Updates**: Every 5 minutes

#### Seasonal Leaderboard

- **Period**: 90 days (3 months)
- **Retention**: 2 years
- **Updates**: Every 5 minutes
- **Special Rewards**: End-of-season bonuses

### 4. Score Categories

#### Total Score

- Combined score from all activities
- Primary ranking metric

#### Kills

- Total eliminations
- Direct combat performance

#### Survival Time

- Total time survived across all games
- Measured in milliseconds

#### Win Rate

- Percentage of games won
- Stored as basis points (10000 = 100%)

#### Experience

- Total experience points earned
- Affects player level

#### Level

- Player progression level
- Based on experience points

#### Kill/Death Ratio

- Combat efficiency metric
- Stored multiplied by 1000 for precision

### 5. API Endpoints

#### Submit Score

```
POST /leaderboard/submit-score
Authorization: Bearer <token>
```

Submit game results to update player scores and leaderboard positions.

#### Get Leaderboard

```
GET /leaderboard?type=all_time&category=total_score&limit=100&offset=0
```

Retrieve leaderboard entries for specified type and category.

#### Get User Rank

```
GET /leaderboard/rank?type=all_time&category=total_score
Authorization: Bearer <token>
```

Get current user's rank in specified leaderboard.

#### Get Leaderboard Around User

```
GET /leaderboard/around-user?type=all_time&category=total_score&range=5
Authorization: Bearer <token>
```

Get leaderboard entries around user's current position.

#### Admin Operations

```
POST /leaderboard/update-rankings  (Admin only)
POST /leaderboard/cleanup          (Admin only)
```

Manual triggers for ranking updates and data cleanup.

### 6. Client Integration

#### LeaderboardService

TypeScript service for client-side integration:

```typescript
const leaderboardService = new LeaderboardService("/api");

// Submit game result
await leaderboardService.submitScore(gameResult, authToken);

// Get leaderboard
const entries = await leaderboardService.getLeaderboard(
  LeaderboardType.ALL_TIME,
  ScoreCategory.TOTAL_SCORE
);

// Get user rank
const userRank = await leaderboardService.getUserRank(
  LeaderboardType.ALL_TIME,
  ScoreCategory.TOTAL_SCORE,
  authToken
);
```

#### React Component

Ready-to-use React component with:

- Period and category selection
- Real-time data loading
- User rank display
- Responsive design
- Loading states
- Error handling

### 7. Configuration

#### Scoring Configuration

Located in `shared/config/ScoringConfig.ts`:

- Easily adjustable multipliers
- Streak bonus configuration
- Level progression settings
- Leaderboard retention policies

#### Database Configuration

Automated table creation with:

- Proper indexes for performance
- Foreign key constraints
- Unique constraints
- Views for optimized queries
- Stored procedures for complex operations

### 8. Performance Optimizations

#### Database Indexes

- Composite indexes for ranking queries
- Single-column indexes for filtering
- Unique indexes for constraint enforcement

#### Caching Strategy

- Leaderboard data cached for 5 minutes
- Ranking updates batched for efficiency
- User rank calculations optimized

#### Cleanup Automation

- Automatic cleanup of old entries
- Configurable retention periods
- Batch processing for large operations

### 9. Security Features

#### Authentication

- JWT token validation
- User ownership verification
- Admin role checking

#### Data Validation

- Input sanitization
- Score validation limits
- Rate limiting protection

#### SQL Injection Prevention

- Parameterized queries
- TypeORM protection
- Input validation

### 10. Monitoring and Maintenance

#### Logging

- Score update events
- Ranking calculation performance
- Error tracking
- User activity monitoring

#### Health Checks

- Database connectivity
- Service availability
- Performance metrics
- Error rates

#### Maintenance Tasks

- Daily cleanup routines
- Weekly performance analysis
- Monthly data archiving
- Seasonal reward distribution

## Usage Examples

### Basic Integration

1. **Submit Game Score**

```typescript
const gameResult = {
  score: 1500,
  kills: 5,
  deaths: 2,
  survivalTimeMs: 180000,
  isVictory: true,
  // ... other stats
};

await leaderboardService.submitScore(gameResult, userToken);
```

2. **Display Leaderboard**

```tsx
<Leaderboard
  authToken={userToken}
  onClose={() => setShowLeaderboard(false)}
  onError={(error) => console.error(error)}
/>
```

3. **Check User Rank**

```typescript
const rank = await leaderboardService.getUserRank(
  LeaderboardType.WEEKLY,
  ScoreCategory.KILLS,
  userToken
);
```

### Advanced Features

1. **Custom Score Calculation**

```typescript
// Modify scoring multipliers in ScoringConfig.ts
export const CUSTOM_SCORING_CONFIG = {
  ...DEFAULT_SCORING_CONFIG,
  multipliers: {
    ...DEFAULT_SCORING_CONFIG.multipliers,
    kill: 150, // Increase kill value
    victory: 2000, // Increase victory bonus
  },
};
```

2. **Seasonal Events**

```typescript
// Enable seasonal multipliers
const seasonalScore = baseScore * SCORING_CONFIG.season.seasonalBonusMultiplier;
```

3. **Admin Management**

```typescript
// Trigger manual ranking update
await fetch("/api/leaderboard/update-rankings", {
  method: "POST",
  headers: { Authorization: `Bearer ${adminToken}` },
});
```

## Future Enhancements

1. **Tournaments**: Bracket-style competitions
2. **Team Leaderboards**: Guild/clan rankings
3. **Achievement System**: Badge integration
4. **Real-time Updates**: WebSocket live rankings
5. **Historical Analytics**: Performance trends
6. **Custom Competitions**: User-created tournaments
7. **Social Features**: Friend comparisons
8. **Mobile Optimization**: Responsive improvements

## Support and Troubleshooting

### Common Issues

1. **Scores Not Updating**
   - Check authentication token
   - Verify game result format
   - Check server logs for errors

2. **Rankings Incorrect**
   - Trigger manual ranking update
   - Check minimum games requirement
   - Verify period calculations

3. **Performance Issues**
   - Monitor database indexes
   - Check batch sizes
   - Review cleanup schedules

### Development Tips

1. **Testing**: Use development database for testing
2. **Configuration**: Adjust multipliers for balance
3. **Monitoring**: Enable detailed logging
4. **Optimization**: Profile ranking queries
5. **Backup**: Regular database backups

For additional support, check the error logs in the `/errors` directory or contact the development team.
