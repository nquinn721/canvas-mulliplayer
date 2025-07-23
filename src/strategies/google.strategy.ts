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
        // For Cloud Run, use the service URL
        const serviceUrl = process.env.SERVICE_URL || process.env.CLOUD_RUN_URL;
        if (serviceUrl) {
          callbackURL = `${serviceUrl}/api/auth/google/callback`;
        } else {
          // Fallback for production
          callbackURL =
            "https://your-cloud-run-service.run.app/api/auth/google/callback";
        }
      } else {
        // Development callback
        callbackURL = "http://localhost:3001/api/auth/google/callback";
      }
    }

    console.log("Google OAuth Callback URL:", callbackURL);

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
      console.log("=== Google Strategy Validate Start ===");
      console.log("Access Token:", accessToken ? "Present" : "Missing");
      console.log("Profile ID:", profile?.id);
      console.log("Profile emails:", profile?.emails);
      console.log("Full profile:", JSON.stringify(profile, null, 2));
      
      const result = await this.authService.loginWithGoogle(profile);
      console.log("=== Google Strategy Success ===");
      console.log("Auth result:", JSON.stringify(result, null, 2));
      done(null, result); // This includes both user and token
    } catch (error) {
      console.error("=== Google Strategy Error ===");
      console.error("Error details:", error);
      console.error("Error stack:", error.stack);
      done(error, null);
    }
  }
}
