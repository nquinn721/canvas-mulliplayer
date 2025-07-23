import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  GuestLoginDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SocialAuthDto,
  UpdateProfileDto,
  UpdateUsernameDto,
} from "../dto/auth.dto";
import { AuthProvider, User, UserRole } from "../entities/user.entity";
import { JwtPayload } from "../strategies/jwt.strategy";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  async register(
    registerDto: RegisterDto
  ): Promise<{ user: User; token: string }> {
    const { username, email, password, displayName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException("Username already exists");
      }
      if (existingUser.email === email) {
        throw new ConflictException("Email already exists");
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username,
      authProvider: AuthProvider.LOCAL,
      verificationToken: randomBytes(32).toString("hex"),
    });

    await this.userRepository.save(user);

    // Generate JWT token
    const token = this.generateToken(user);

    return { user, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
    const { usernameOrEmail, password } = loginDto;

    // Find user by username or email
    const user = await this.userRepository.findOne({
      where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account has been deactivated");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate JWT token
    const token = this.generateToken(user);

    return { user, token };
  }

  async loginAsGuest(
    guestLoginDto: GuestLoginDto
  ): Promise<{ user: User; token: string }> {
    let { username } = guestLoginDto;

    // Generate username if not provided
    if (!username) {
      username = `Guest_${Math.random().toString(36).substr(2, 9)}`;
    } else {
      // Check if username is already taken by a real user
      const existingUser = await this.userRepository.findOne({
        where: { username },
      });
      if (existingUser) {
        // Append random suffix to avoid conflicts
        username = `${username}_${Math.random().toString(36).substr(2, 4)}`;
      }
    }

    // Create guest user (not persisted to database)
    const guestUser = this.userRepository.create({
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      displayName: username,
      authProvider: AuthProvider.GUEST,
      role: UserRole.GUEST,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Generate JWT token for guest
    const token = this.generateToken(guestUser);

    return { user: guestUser, token };
  }

  async loginWithGoogle(
    googleUser: any
  ): Promise<{ user: User; token: string }> {
    const { id, emails, displayName, photos } = googleUser;
    const email = emails[0]?.value;

    // Check if user exists
    let user = await this.userRepository.findOne({
      where: [{ googleId: id }, { email }],
    });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = id;
        user.authProvider = AuthProvider.GOOGLE;
        await this.userRepository.save(user);
      }
    } else {
      // Generate a unique username from email or displayName
      let baseUsername = email?.split('@')[0] || displayName?.replace(/\s+/g, '').toLowerCase() || 'user';
      baseUsername = baseUsername.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      // Ensure username is unique
      let username = baseUsername;
      let counter = 1;
      while (await this.userRepository.findOne({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // Create new user
      user = this.userRepository.create({
        googleId: id,
        username,
        email,
        displayName,
        avatar: photos[0]?.value,
        authProvider: AuthProvider.GOOGLE,
        emailVerified: true,
        isActive: true,
        role: UserRole.USER,
      });
      await this.userRepository.save(user);
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const token = this.generateToken(user);
    return { user, token };
  }

  async loginWithFacebook(
    facebookUser: any
  ): Promise<{ user: User; token: string }> {
    const { id, emails, displayName, photos } = facebookUser;
    const email = emails?.[0]?.value;

    // Check if user exists
    let user = await this.userRepository.findOne({
      where: [{ facebookId: id }, ...(email ? [{ email }] : [])],
    });

    if (user) {
      // Update Facebook ID if not set
      if (!user.facebookId) {
        user.facebookId = id;
        user.authProvider = AuthProvider.FACEBOOK;
        await this.userRepository.save(user);
      }
    } else {
      // Create new user
      user = this.userRepository.create({
        facebookId: id,
        email,
        displayName,
        avatar: photos?.[0]?.value,
        authProvider: AuthProvider.FACEBOOK,
        emailVerified: !!email,
        isActive: true,
      });
      await this.userRepository.save(user);
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const token = this.generateToken(user);
    return { user, token };
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    if (payload.authProvider === AuthProvider.GUEST) {
      // For guest users, return a temporary user object
      return {
        id: payload.sub,
        authProvider: AuthProvider.GUEST,
        role: UserRole.GUEST,
        isAdmin: false,
        isActive: true,
        displayName: "Guest",
      } as User;
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });

    return user;
  }

  async updateProfile(
    userId: string,
    updateDto: UpdateProfileDto
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.isGuest) {
      throw new BadRequestException("Guest users cannot update profiles");
    }

    // Check for username conflicts if username is being updated
    if (updateDto.username && updateDto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateDto.username },
      });
      if (existingUser) {
        throw new ConflictException("Username already exists");
      }
    }

    Object.assign(user, updateDto);
    return this.userRepository.save(user);
  }

  async updateUsername(
    userId: string,
    updateUsernameDto: UpdateUsernameDto
  ): Promise<User> {
    const { username } = updateUsernameDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.isGuest) {
      throw new BadRequestException("Guest users cannot update usernames");
    }

    // Check if username is already taken
    const existingUser = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException("Username already exists");
    }

    user.username = username;
    // Update display name to match username if not set
    if (!user.displayName || user.displayName === user.username) {
      user.displayName = username;
    }

    return this.userRepository.save(user);
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.isGuest || user.authProvider !== AuthProvider.LOCAL) {
      throw new BadRequestException(
        "Cannot change password for this account type"
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 12);
    await this.userRepository.save(user);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || user.authProvider !== AuthProvider.LOCAL) {
      // Don't reveal whether email exists
      return;
    }

    const resetToken = randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await this.userRepository.save(user);

    // TODO: Send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: {
        resetPasswordToken: token,
      },
    });

    if (!user || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepository.save(user);
  }

  async makeAdmin(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.isAdmin = true;
    user.role = UserRole.ADMIN;
    return this.userRepository.save(user);
  }

  async removeAdmin(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.isAdmin = false;
    user.role = UserRole.USER;
    return this.userRepository.save(user);
  }

  async updateGameStats(
    userId: string,
    stats: {
      gamesPlayed?: number;
      gamesWon?: number;
      kills?: number;
      deaths?: number;
      score?: number;
      experience?: number;
    }
  ): Promise<void> {
    if (!userId || userId.startsWith("guest_")) {
      return; // Don't update stats for guests
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    if (stats.gamesPlayed !== undefined) user.gamesPlayed += stats.gamesPlayed;
    if (stats.gamesWon !== undefined) user.gamesWon += stats.gamesWon;
    if (stats.kills !== undefined) user.totalKills += stats.kills;
    if (stats.deaths !== undefined) user.totalDeaths += stats.deaths;
    if (stats.score !== undefined) user.totalScore += stats.score;
    if (stats.experience !== undefined) {
      user.experience += stats.experience;
      // Level up logic
      const newLevel = Math.floor(user.experience / 1000) + 1;
      if (newLevel > user.playerLevel) {
        user.playerLevel = newLevel;
      }
    }

    await this.userRepository.save(user);
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isAdmin: user.hasAdminAccess,
      authProvider: user.authProvider,
    };

    return this.jwtService.sign(payload);
  }

  async socialAuth(socialAuthDto: SocialAuthDto) {
    let user: User;

    if (socialAuthDto.provider === "google") {
      // Check if user exists with this Google ID
      user = await this.userRepository.findOne({
        where: { googleId: socialAuthDto.providerId },
      });
    } else if (socialAuthDto.provider === "facebook") {
      // Check if user exists with this Facebook ID
      user = await this.userRepository.findOne({
        where: { facebookId: socialAuthDto.providerId },
      });
    }

    if (!user) {
      // Check if user exists with this email
      const existingUser = await this.userRepository.findOne({
        where: { email: socialAuthDto.email },
      });

      if (existingUser) {
        // Link this social account to existing user
        if (socialAuthDto.provider === "google") {
          existingUser.googleId = socialAuthDto.providerId;
        } else if (socialAuthDto.provider === "facebook") {
          existingUser.facebookId = socialAuthDto.providerId;
        }
        existingUser.authProvider = socialAuthDto.provider as AuthProvider;
        user = await this.userRepository.save(existingUser);
      } else {
        // Create new user
        const username =
          socialAuthDto.username ||
          socialAuthDto.displayName ||
          socialAuthDto.email.split("@")[0];

        // Ensure username is unique
        let finalUsername = username;
        let counter = 1;
        while (
          await this.userRepository.findOne({
            where: { username: finalUsername },
          })
        ) {
          finalUsername = `${username}${counter}`;
          counter++;
        }

        const userData = {
          username: finalUsername,
          email: socialAuthDto.email,
          authProvider: socialAuthDto.provider as AuthProvider,
          role: UserRole.USER,
          displayName: socialAuthDto.displayName || finalUsername,
        };

        if (socialAuthDto.provider === "google") {
          (userData as any).googleId = socialAuthDto.providerId;
        } else if (socialAuthDto.provider === "facebook") {
          (userData as any).facebookId = socialAuthDto.providerId;
        }

        user = new User();
        Object.assign(user, userData);
        user = await this.userRepository.save(user);
      }
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async getAllUsers() {
    return await this.userRepository.find({
      order: { createdAt: "DESC" },
    });
  }
}
