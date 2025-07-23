import { useEffect } from "react";
import { gameStore, socketService } from "../stores";

/**
 * Custom hook for managing socket connections consistently across components
 * This hook follows the singleton pattern and ensures only one connection exists
 */
export const useSocket = () => {
  useEffect(() => {
    // Always attempt to connect when a component mounts
    // The socketService will handle checking if already connected
    console.log("useSocket: Ensuring socket connection...");
    console.log(
      "useSocket: Current connection status:",
      socketService.isConnected
    );
    socketService.connect();

    // No cleanup - let the socket persist across component unmounts
    // Only the main App should handle final cleanup
  }, []);

  return {
    isConnected: socketService.isConnected,
    socketId: socketService.socketId,
    connect: () => socketService.connect(),
    joinGame: (playerName: string) => socketService.joinGame(playerName),
  };
};

/**
 * Hook for components that only need to check connection status
 * without trying to establish a connection
 */
export const useSocketStatus = () => {
  return {
    isConnected: gameStore.isConnected,
    socketId: gameStore.socket?.id,
    ping: gameStore.stats.ping,
  };
};
