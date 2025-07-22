import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "../services/auth.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: "usernameOrEmail",
      passwordField: "password",
    });
  }

  async validate(usernameOrEmail: string, password: string): Promise<any> {
    const result = await this.authService.login({ usernameOrEmail, password });
    if (!result) {
      throw new UnauthorizedException();
    }
    return result.user;
  }
}
