import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext";
import HomeMenu from "../components/HomeMenu";

export const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const handlePlayAsGuest = async (
    playerName: string,
    difficulty: "EASY" | "MEDIUM" | "HARD"
  ) => {
    try {
      await loginAsGuest(playerName);
      // Navigate to lobby after successful guest login
      navigate("/lobby");
    } catch (error) {
      console.error("Failed to login as guest:", error);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>Space Fighters</h1>
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If already authenticated, redirect to lobby
  if (isAuthenticated) {
    navigate("/lobby");
    return null;
  }

  return <HomeMenu onStartGame={handlePlayAsGuest} />;
};
