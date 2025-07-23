# Socket Connection Standard

This document defines the consistent standard for managing WebSocket connections across the application.

## Architecture

### Singleton Pattern

- **SocketService** is implemented as a singleton with global instance management
- **Only one WebSocket connection** exists per browser session
- **Connection persists** across React component mounts/unmounts and route navigation

### Connection Management Hierarchy

1. **App.tsx** (Top Level)
   - Establishes initial connection on app startup
   - Handles cleanup only on browser window close (`beforeunload` event)
   - **Never disconnects** during React navigation

2. **Components** (Middle Level)
   - Use `useSocket()` hook for connection operations
   - Use `useSocketStatus()` hook for read-only status checking
   - **Never call disconnect()** directly

3. **SocketService** (Service Level)
   - Maintains singleton instance across app lifecycle
   - Handles connection state and reconnection logic
   - Only clears instance in testing scenarios

## Hooks

### `useSocket()`

Use this when your component needs to:

- Ensure a connection is established
- Join games or send commands
- Access connection methods

```tsx
import { useSocket } from "../hooks/useSocket";

const MyComponent = () => {
  const { isConnected, connect, joinGame } = useSocket();

  // Component automatically ensures connection on mount
  // No manual connection management needed
};
```

### `useSocketStatus()`

Use this when your component only needs to:

- Display connection status
- Show ping/latency information
- Conditionally render based on connection state

```tsx
import { useSocketStatus } from "../hooks/useSocket";

const StatusComponent = () => {
  const { isConnected, ping } = useSocketStatus();

  return (
    <div>
      Status: {isConnected ? "Connected" : "Disconnected"}
      {ping && `Ping: ${ping}ms`}
    </div>
  );
};
```

## Component Guidelines

### ✅ DO:

- Use hooks for consistent connection management
- Check `isConnected` before sending socket messages
- Let App.tsx handle global connection lifecycle
- Use `gameStore.socket` for game-specific socket operations

### ❌ DON'T:

- Import `socketService` directly in components
- Call `socketService.disconnect()` in components
- Create your own connection management logic
- Use `beforeunload` handlers in components (only App.tsx)

## Connection Flow

1. **App Startup**: App.tsx calls `socketService.connect()`
2. **Component Mount**: Component calls `useSocket()` which ensures connection
3. **Navigation**: Connection persists, no reconnection needed
4. **Browser Close**: App.tsx `beforeunload` handler disconnects cleanly

## State Management

- **gameStore.isConnected**: Primary connection state (reactive)
- **socketService.isConnected**: Service-level connection state
- **gameStore.socket**: Socket instance for sending messages

## Testing

For testing scenarios where you need to reset the connection:

```tsx
import { SocketService } from "../services/SocketService";

// Only use this in tests
SocketService.resetInstance();
```

## Migration Guide

If updating existing components:

1. Remove direct `socketService` imports
2. Replace connection logic with `useSocket()` hook
3. Remove any `disconnect()` calls
4. Use `useSocketStatus()` for status-only components
5. Remove `beforeunload` handlers (except in App.tsx)

## Benefits

- **Eliminates connection issues** during navigation
- **Prevents duplicate connections** and memory leaks
- **Consistent connection state** across the application
- **Simplified component logic** - no connection management needed
- **Better performance** - no unnecessary reconnections
