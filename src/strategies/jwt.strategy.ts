import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  email?: string;
  isAdmin?: boolean;
  authProvider?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.SPACE_FIGHTER_JWT_SECRET ||
        process.env.JWT_SECRET ||
        "fallback-secret-key",
    });
  }

  async validate(payload: JwtPayload) {
    // For guest users, we don't need to fetch from database
    if (payload.sub.startsWith("guest_")) {
      return {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
        isGuest: true,
      };
    }

    // For regular users, fetch from database to ensure they still exist
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User not found or inactive");
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.hasAdminAccess,
      authProvider: user.authProvider,
      isGuest: false,
    };
  }
}
