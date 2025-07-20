import {
  faGamepad,
  faHome,
  faRedo,
  faSkull,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import "./DeathMenu.css";

interface DeathMenuProps {
  onRespawn: () => void;
  onReturnToHome: () => void;
}

const DeathMenu: React.FC<DeathMenuProps> = ({ onRespawn, onReturnToHome }) => {
  return (
    <div className="death-menu-overlay">
      <div className="death-menu">
        <div className="death-menu-header">
          <h2>
            <FontAwesomeIcon icon={faSkull} className="death-icon" />
            You Died!
          </h2>
          <p>Your ship was destroyed in battle</p>
        </div>

        <div className="death-menu-buttons">
          <button
            className="death-menu-button respawn-button"
            onClick={onRespawn}
          >
            <FontAwesomeIcon icon={faRedo} className="button-icon" />
            Respawn
          </button>

          <button
            className="death-menu-button home-button"
            onClick={onReturnToHome}
          >
            <FontAwesomeIcon icon={faHome} className="button-icon" />
            Return to Home
          </button>
        </div>

        <div className="death-menu-stats">
          <p>
            <FontAwesomeIcon icon={faGamepad} className="hint-icon" />
            Press Escape to respawn quickly
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeathMenu;
