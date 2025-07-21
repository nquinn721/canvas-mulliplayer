# AI Difficulty Multi-Player Conflict Resolution

## How It Works When Multiple Players Want to Change AI Difficulty

The system now includes comprehensive conflict resolution to handle multiple players trying to change AI difficulty:

## **Conflict Resolution Rules**

### 1. **Cooldown System** (10 seconds)
- After any player changes difficulty, there's a 10-second cooldown
- Other players cannot change difficulty during this cooldown
- Prevents rapid back-and-forth changes and spam

### 2. **Last Change Wins** 
- The most recent valid change takes effect for everyone
- All AI bots immediately update to the new difficulty
- New AI spawns use the current difficulty setting

### 3. **Global Broadcast**
- ALL players are notified when someone changes difficulty
- Message includes who made the change and what it changed from/to
- No secret difficulty changes

## **Player Experience**

### **Successful Change:**
```
Player "John" changes difficulty from MEDIUM to HARD
→ All players see: "John changed AI difficulty to HARD (affects 5 bots)"
→ John gets confirmation: "Successfully changed AI difficulty to HARD"
```

### **Rejected Change (Cooldown):**
```
Player "Sarah" tries to change difficulty 3 seconds later
→ Sarah sees: "AI difficulty was recently changed by John. Please wait 7 seconds."
→ Current difficulty remains HARD
```

### **New Player Joining:**
```
Player "Mike" joins the game
→ Mike immediately receives: "Current AI difficulty: HARD (set by John)"
→ Mike knows the current state without confusion
```

## **Technical Implementation**

### **Server State Tracking:**
- `preferredAIDifficulty` - Current difficulty level
- `lastDifficultyChangeBy` - Player name who last changed it
- `difficultyChangeTimestamp` - When it was changed
- `DIFFICULTY_CHANGE_COOLDOWN` - 10 second protection

### **WebSocket Events:**

#### **Client → Server:**
- `changeAIDifficulty` - Request to change difficulty
- `getAIDifficultyStatus` - Get current difficulty info

#### **Server → Client:**
- `aiDifficultyChanged` - Broadcast successful change to ALL players
- `aiDifficultyChangeRejected` - Inform requester their change was denied
- `aiDifficultyChangeConfirmed` - Confirm successful change to requester
- `aiDifficultyStatus` - Send current status (auto-sent on join)

## **Event Data Structures**

### **Successful Change (Broadcast to All):**
```typescript
{
  difficulty: "HARD",
  previousDifficulty: "MEDIUM", 
  changedBy: "John",
  affectedEnemies: 5,
  timestamp: 1642781234567
}
```

### **Rejected Change:**
```typescript
{
  reason: "cooldown",
  message: "AI difficulty was recently changed by John. Please wait 7 seconds.",
  remainingCooldown: 7,
  currentDifficulty: "HARD",
  lastChangedBy: "John"
}
```

### **Status Info:**
```typescript
{
  currentDifficulty: "HARD",
  lastChangedBy: "John", 
  changeTimestamp: 1642781234567,
  aiEnemyCount: 5,
  availableDifficulties: ["EASY", "MEDIUM", "HARD", "EXPERT", "NIGHTMARE"]
}
```

## **Benefits of This System**

1. **🛡️ Prevents Griefing** - 10-second cooldown stops rapid changes
2. **📢 Full Transparency** - Everyone knows who changed what and when
3. **⚡ Immediate Effect** - Changes apply instantly to all AI bots
4. **🔄 Consistency** - All players always see the same difficulty
5. **📊 Status Tracking** - New players immediately know current state
6. **🎮 Fair Access** - Any player can change difficulty (with cooldown respect)

## **Future Enhancement Options**

If you want more restrictive control, you could add:
- **Host-only changes** - Only room creator can change difficulty
- **Voting system** - Require majority vote for changes
- **Per-player difficulty** - Each player faces their chosen difficulty
- **Permission levels** - Some players can't change difficulty

The current system balances accessibility with conflict prevention!
