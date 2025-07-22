import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-facebook";
import { AuthService } from "../services/auth.service";

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, "facebook") {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL:
        process.env.FACEBOOK_CALLBACK_URL ||
        "http://localhost:3001/auth/facebook/callback",
      scope: "email",
      profileFields: ["emails", "name", "picture.type(large)"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void
  ): Promise<any> {
    try {
      const result = await this.authService.loginWithFacebook(profile);
      done(null, result);
    } catch (error) {
      done(error, null);
    }
  }
}
