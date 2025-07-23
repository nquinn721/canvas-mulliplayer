import React, { useEffect, useState } from "react";
import { useSocket, useSocketStatus } from "../hooks/useSocket";
import { authStore } from "../stores";

export const TestConnectionPage: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);

  // Use socket hooks for consistent connection management
  const { isConnected, connect } = useSocket();
  const { ping } = useSocketStatus();

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  useEffect(() => {
    addLog("TestConnectionPage mounted");
    addLog(
      `Auth state: ${JSON.stringify({
        hasToken: !!authStore.token,
        isAuthenticated: authStore.isAuthenticated,
        isGuest: authStore.isGuest,
        username: authStore.user?.username,
      })}`
    );

    // Auto-test socket connection after a short delay
    setTimeout(() => {
      addLog("Auto-testing socket connection...");
      testSocketConnection();
    }, 2000);
  }, []);

  const testGuestLogin = async () => {
    addLog("Testing guest login...");
    try {
      const result = await authStore.loginAsGuest("TestUser");
      addLog(`Guest login result: ${JSON.stringify(result)}`);
      addLog(
        `New auth state: ${JSON.stringify({
          hasToken: !!authStore.token,
          isAuthenticated: authStore.isAuthenticated,
          isGuest: authStore.isGuest,
          username: authStore.user?.username,
          tokenPreview: authStore.token?.substring(0, 30),
        })}`
      );
    } catch (error) {
      addLog(`Guest login error: ${error}`);
    }
  };

  const testSocketConnection = () => {
    addLog("Testing socket connection...");
    try {
      connect();
      addLog("Socket connection initiated");
      addLog(
        `Connection status: ${isConnected ? "Connected" : "Disconnected"}`
      );
      if (ping) {
        addLog(`Ping: ${ping}ms`);
      }
    } catch (error) {
      addLog(`Socket connection error: ${error}`);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Socket Connection Test</h1>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={testGuestLogin} style={{ marginRight: "10px" }}>
          Test Guest Login
        </button>
        <button onClick={testSocketConnection} style={{ marginRight: "10px" }}>
          Test Socket Connection
        </button>
      </div>

      <div>
        <h3>Current Auth State:</h3>
        <pre>
          {JSON.stringify(
            {
              hasToken: !!authStore.token,
              isAuthenticated: authStore.isAuthenticated,
              isGuest: authStore.isGuest,
              username: authStore.user?.username,
              tokenPreview: authStore.token?.substring(0, 30),
            },
            null,
            2
          )}
        </pre>
      </div>

      <div>
        <h3>Logs:</h3>
        <div
          style={{
            maxHeight: "400px",
            overflow: "auto",
            border: "1px solid #ccc",
            padding: "10px",
            backgroundColor: "#f5f5f5",
          }}
        >
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: "5px" }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
