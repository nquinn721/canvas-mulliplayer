import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import "./AuthModal.css";
import { FacebookIcon, GoogleIcon } from "./SocialIcons";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginAsGuest: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginAsGuest,
}) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    identifier: "", // For login (username or email)
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, register, loginWithGoogle, loginWithFacebook } = useAuth();

  if (!isOpen) return null;

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setError("");
    setIsLoading(true);

    try {
      let result;
      if (provider === "google") {
        result = await loginWithGoogle();
      } else {
        result = await loginWithFacebook();
      }

      if (result.success) {
        onClose();
      } else {
        setError(result.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      let result;
      if (mode === "login") {
        result = await login(formData.identifier, formData.password);
      } else {
        result = await register(
          formData.username,
          formData.email,
          formData.password
        );
      }

      if (result.success) {
        onClose();
      } else {
        setError(result.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
    setFormData({
      username: "",
      email: "",
      password: "",
      identifier: "",
    });
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <div className="auth-modal-header">
          <h2>{mode === "login" ? "Sign In" : "Create Account"}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="auth-modal-content">
          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  placeholder="Choose a username"
                />
              </div>
            )}

            {mode === "login" ? (
              <div className="form-group">
                <label>Username or Email</label>
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter username or email"
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your email"
                />
              </div>
            )}

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Enter password"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={isLoading}
            >
              {isLoading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="social-login-buttons">
            <button
              className="social-login-button google"
              onClick={() => handleSocialLogin("google")}
              disabled={isLoading}
            >
              <GoogleIcon size={20} />
              <span>Continue with Google</span>
            </button>

            <button
              className="social-login-button facebook"
              onClick={() => handleSocialLogin("facebook")}
              disabled={isLoading}
            >
              <FacebookIcon size={20} />
              <span>Continue with Facebook</span>
            </button>
          </div>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            className="guest-play-button"
            onClick={onLoginAsGuest}
            disabled={isLoading}
          >
            Play as Guest
          </button>

          <div className="auth-switch">
            {mode === "login" ? (
              <p>
                Don't have an account?
                <button className="link-button" onClick={switchMode}>
                  Create one
                </button>
              </p>
            ) : (
              <p>
                Already have an account?
                <button className="link-button" onClick={switchMode}>
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
