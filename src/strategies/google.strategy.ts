import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { AuthService } from "../services/auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(private authService: AuthService) {
    // Determine the callback URL based on environment
    let callbackURL = process.env.GOOGLE_CALLBACK_URL;

    if (!callbackURL) {
      // Auto-detect based on environment
      if (process.env.NODE_ENV === "production") {
        // For Cloud Run, use the service URL or construct from known service URL
        const serviceUrl = process.env.SERVICE_URL || process.env.CLOUD_RUN_URL;
        if (serviceUrl) {
          callbackURL = `${serviceUrl}/api/auth/google/callback`;
        } else {
          // Use the known Cloud Run service URL
          callbackURL =
            "https://canvas-game-203453576607.us-east1.run.app/api/auth/google/callback";
        }
      } else {
        // Development callback
        callbackURL = "http://localhost:3001/api/auth/google/callback";
      }
    }

    console.log("=== Google OAuth Strategy Configuration ===");
    console.log("Callback URL:", callbackURL);
    console.log("Environment:", process.env.NODE_ENV);

    super({
      clientID:
        process.env.SPACE_FIGHTER_GOOGLE_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_ID,
      clientSecret:
        process.env.SPACE_FIGHTER_GOOGLE_CLIENT_SECRET ||
        process.env.GOOGLE_CLIENT_SECRET,
      callbackURL,
      scope: ["email", "profile"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    try {
      const result = await this.authService.loginWithGoogle(profile);
      done(null, result); // This includes both user and token
    } catch (error) {
      console.error("Google OAuth validation error:", error);
      done(error, null);
    }
  }
}
