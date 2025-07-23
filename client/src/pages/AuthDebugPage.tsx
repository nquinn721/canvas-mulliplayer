import React, { useEffect, useState } from "react";
import { authStore } from "../stores";

export const AuthDebugPage: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  useEffect(() => {
    addLog("AuthDebugPage mounted");

    // Log current auth state
    addLog(
      `Current auth state: ${JSON.stringify({
        hasUser: !!authStore.user,
        hasToken: !!authStore.token,
        isAuthenticated: authStore.isAuthenticated,
        isGuest: authStore.isGuest,
        username: authStore.user?.username,
        userIsGuest: authStore.user?.isGuest,
        tokenPrefix: authStore.token?.substring(0, 20),
      })}`
    );

    // Check localStorage
    const localStorageState = {
      authToken: localStorage.getItem("authToken"),
      authUser: localStorage.getItem("authUser"),
      AuthStore: localStorage.getItem("AuthStore"),
    };
    addLog(`localStorage state: ${JSON.stringify(localStorageState)}`);
  }, []);

  const clearAuth = () => {
    authStore.forceLogout();
    addLog("Forced logout called");
  };

  const loginAsGuest = async () => {
    addLog("Attempting guest login...");
    try {
      const result = await authStore.loginAsGuest();
      addLog(`Guest login result: ${JSON.stringify(result)}`);
    } catch (error) {
      addLog(`Guest login error: ${error}`);
    }
  };

  const refreshProfile = async () => {
    addLog("Attempting profile refresh...");
    try {
      await authStore.refreshProfile();
      addLog("Profile refresh completed");
    } catch (error) {
      addLog(`Profile refresh error: ${error}`);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Auth Debug Page</h1>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={clearAuth} style={{ marginRight: "10px" }}>
          Clear Auth
        </button>
        <button onClick={loginAsGuest} style={{ marginRight: "10px" }}>
          Login as Guest
        </button>
        <button onClick={refreshProfile} style={{ marginRight: "10px" }}>
          Refresh Profile
        </button>
      </div>

      <div>
        <h3>Current State:</h3>
        <pre>
          {JSON.stringify(
            {
              hasUser: !!authStore.user,
              hasToken: !!authStore.token,
              isAuthenticated: authStore.isAuthenticated,
              isGuest: authStore.isGuest,
              username: authStore.user?.username,
              userIsGuest: authStore.user?.isGuest,
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
          }}
        >
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
