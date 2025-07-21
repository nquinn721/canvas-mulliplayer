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
    <div className="modal-overlay">
      <div className="modal-content death-menu">
        <div className="modal-header death-menu-header">
          <h2>
            <FontAwesomeIcon icon={faSkull} />
            You Died!
          </h2>
          <p>Your ship was destroyed in battle</p>
        </div>

        <div className="modal-body death-menu-buttons">
          <button
            className="death-menu-button respawn-button"
            onClick={onRespawn}
          >
            <FontAwesomeIcon icon={faRedo} />
            Respawn
          </button>

          <button
            className="death-menu-button home-button"
            onClick={onReturnToHome}
          >
            <FontAwesomeIcon icon={faHome} />
            Return to Home
          </button>
        </div>

        <div className="death-menu-stats">
          <p>
            <FontAwesomeIcon icon={faGamepad} />
            Press Escape to respawn quickly
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeathMenu;
