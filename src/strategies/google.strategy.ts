import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { AuthService } from "../services/auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(private authService: AuthService) {
    super({
      clientID:
        process.env.SPACE_FIGHTER_GOOGLE_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_ID,
      clientSecret:
        process.env.SPACE_FIGHTER_GOOGLE_CLIENT_SECRET ||
        process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:3001/auth/google/callback",
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
      console.log("Google profile received:", JSON.stringify(profile, null, 2));
      const result = await this.authService.loginWithGoogle(profile);
      console.log("Google auth result:", result);
      done(null, result); // This includes both user and token
    } catch (error) {
      console.error("Google strategy error:", error);
      done(error, null);
    }
  }
}
