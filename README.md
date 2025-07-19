# Canvas Multiplayer - Enhanced AI Pathfinding Update

A space-themed multiplayer game with intelligent AI bots featuring advanced pathfinding and line-of-sight systems.

## 🚀 Latest Update: Advanced AI Pathfinding

### New AI Features

- **🧠 Smart Pathfinding**: AI bots use A\* algorithm to navigate around obstacles
- **👁️ Line of Sight**: Bots only shoot when they can see players (no more shooting through walls!)
- **🎯 Intelligent Combat**: Tactical positioning and obstacle avoidance
- **⚡ Performance Optimized**: Efficient pathfinding with smart caching

## 🎮 Game Features

### Core Gameplay

- **Multiplayer Combat**: Real-time space battles with other players
- **Smart AI Enemies**: Enhanced AI bots with pathfinding and tactical behavior
- **Weapon Systems**: Lasers and homing missiles with upgrade system
- **Power-ups**: Health, shields, boost, and weapon upgrades
- **Dynamic Environment**: Procedurally generated walls and obstacles

### AI Intelligence Levels

- **Easy**: Slower reactions, basic pathfinding, 60% accuracy
- **Medium**: Balanced behavior, smart navigation, 75% accuracy
- **Hard**: Quick reactions, advanced tactics, 90% accuracy

### Controls

- **WASD**: Move and strafe
- **Mouse**: Aim direction
- **Left Click**: Fire laser
- **Right Click**: Fire homing missile
- **Shift**: Boost speed
- **ESC**: Game menu

## 🛠️ Technical Features

### AI Pathfinding System

- **A\* Algorithm**: Optimal path finding around obstacles
- **Line of Sight**: Bresenham's line algorithm for vision checking
- **Grid-based Navigation**: 50px grid cells for efficient computation
- **Path Simplification**: Removes unnecessary waypoints for smooth movement
- **Obstacle Avoidance**: Smart positioning away from walls

### Enhanced Behavior Trees

- **Combat Priority**: Line of sight checks before engaging
- **Tactical Movement**: Optimal distance maintenance while avoiding obstacles
- **Adaptive Patrolling**: Intelligent patrol patterns using pathfinding
- **Real-time Decision Making**: Context-aware behavior based on environment

### Performance Optimizations

- **Path Caching**: Reuses calculated paths when targets don't move significantly
- **Grid Optimization**: Spatial partitioning for efficient pathfinding
- **Iteration Limits**: Prevents infinite loops in pathfinding
- **Smart Updates**: Only recalculates paths when necessary

## 🎯 AI Difficulty Settings

### Easy AI (Green)

- **Detection Range**: 800px
- **Reaction Time**: 800ms
- **Accuracy**: 60%
- **Pathfinding**: Basic obstacle avoidance
- **Behavior**: Defensive, flees when health drops below 40%

### Medium AI (Orange)

- **Detection Range**: 1200px
- **Reaction Time**: 400ms
- **Accuracy**: 75%
- **Pathfinding**: Smart navigation with path optimization
- **Behavior**: Balanced aggression, flees at 25% health

### Hard AI (Red)

- **Detection Range**: 1600px
- **Reaction Time**: 150ms
- **Accuracy**: 90%
- **Pathfinding**: Advanced tactics with predictive movement
- **Behavior**: Highly aggressive, only flees at 15% health

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd canvas-multiplayer

# Install dependencies
npm install

# Start the development server
npm run start:dev

# In another terminal, start the client
cd client
npm install
npm run dev
```

### Play the Game

1. Open `http://localhost:5173` in your browser
2. Enter your player name
3. Select AI difficulty level
4. Click "Start Game"
5. Battle against intelligent AI bots!

## 📁 Project Structure

```
canvas-multiplayer/
├── src/                    # Server-side code (NestJS)
│   └── game/
│       └── game.gateway.ts # Game logic and AI management
├── client/                 # Client-side code (React + Vite)
│   └── src/
│       ├── components/     # React components
│       ├── game/          # Game engine
│       └── services/      # Client services
├── shared/                # Shared code between client and server
│   ├── classes/           # Game entities
│   │   ├── AIEnemy.ts     # Original AI implementation
│   │   └── EnhancedAIEnemy.ts  # New AI with pathfinding
│   ├── utils/
│   │   └── PathfindingUtils.ts  # Pathfinding algorithms
│   └── weapons/           # Weapon systems
└── test/                  # Test files
    └── pathfinding.test.ts # Pathfinding system tests
```

## 🧪 Testing

### Run Pathfinding Tests

```bash
npm run test:pathfinding
```

The test suite verifies:

- ✅ Line of sight detection
- ✅ A\* pathfinding algorithm
- ✅ Path simplification
- ✅ Obstacle avoidance
- ✅ Performance benchmarks

### Example Test Output

```
🧪 Testing AI Pathfinding System...
🔍 Line of sight detection: ❌ Blocked (correct)
🗺️ A* pathfinding: 17 waypoints → 4 simplified
⚡ Performance: 0.03ms average per operation
🎉 All tests passed!
```

## 📚 Documentation

- **[AI Pathfinding Guide](AI_PATHFINDING_GUIDE.md)**: Detailed technical documentation
- **[Enhanced UI Features](ENHANCED_UI_FEATURES.md)**: UI improvements and controls
- **[AI System Guide](AI_SYSTEM_GUIDE.md)**: Original AI behavior system
- **[Deployment Guide](DEPLOYMENT.md)**: Production deployment instructions

## 🔧 Development

### Key Files Modified

- `shared/utils/PathfindingUtils.ts` - New pathfinding algorithms
- `shared/classes/EnhancedAIEnemy.ts` - Enhanced AI with pathfinding
- `src/game/game.gateway.ts` - Updated to use enhanced AI system
- `shared/index.ts` - Exports for new classes

### Environment Variables

```bash
NODE_ENV=development
CLIENT_URL=http://localhost:5173
PORT=3001
```

## 🎮 Gameplay Improvements

### Before Pathfinding

- ❌ AI bots shot through walls
- ❌ Bots got stuck on obstacles
- ❌ Predictable movement patterns
- ❌ Unrealistic combat behavior

### After Pathfinding

- ✅ AI respects line of sight
- ✅ Smart navigation around obstacles
- ✅ Dynamic tactical positioning
- ✅ Realistic combat engagement

## 🚀 Future Enhancements

- **Formation Flying**: Coordinated AI group movements
- **Predictive Pathfinding**: Anticipating player movement
- **Cover System**: AI using walls as tactical cover
- **Dynamic Difficulty**: AI that adapts to player skill
- **Cooperative AI**: Multiple bots working together

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

---

_Experience the thrill of space combat with intelligent AI opponents that think, plan, and adapt to your strategies!_
