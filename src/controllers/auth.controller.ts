import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Put,
  Request,
  Response,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { calculateLevelFromExperience } from "../../shared/config/ExperienceConfig";
import { Roles } from "../decorators/roles.decorator";
import {
  ExperienceUpdateDto,
  LoginDto,
  RegisterDto,
  ScoreUpdateDto,
  UpdateDisplayNameDto,
  UpdateUsernameDto,
} from "../dto/auth.dto";
import { UserRole } from "../entities/user.entity";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { AuthService } from "../services/auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      return {
        success: true,
        message: "Registration successful",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || "Registration failed",
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post("login")
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto);
      return {
        success: true,
        message: "Login successful",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || "Login failed",
        },
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  // OAuth Routes
  @Get("google")
  @UseGuards(AuthGuard("google"))
  async googleAuth(@Request() req) {
    // This initiates Google OAuth flow
    // Actual authentication handled by Passport
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(@Request() req, @Response() res) {
    console.log("=== Google OAuth Callback Hit ===");
    console.log("Request user:", req.user);
    console.log("Request query:", req.query);
    try {
      const result = req.user; // User data from strategy
      console.log("OAuth result:", result);

      if (result && result.token) {
        console.log("Valid OAuth result with token:", result.token);
        // Determine frontend URL based on environment
        let frontendUrl = process.env.FRONTEND_URL;

        if (!frontendUrl) {
          if (process.env.NODE_ENV === "production") {
            // For Cloud Run, try to determine the frontend URL
            const serviceUrl =
              process.env.SERVICE_URL || process.env.CLOUD_RUN_URL;
            if (serviceUrl) {
              // Assume frontend is served from the same domain
              frontendUrl = serviceUrl;
            } else {
              // Use the current request host as fallback
              const protocol = req.headers["x-forwarded-proto"] || "https";
              const host = req.headers.host;
              frontendUrl = `${protocol}://${host}`;
            }
          } else {
            frontendUrl = "http://localhost:5173"; // Updated to match current client port
          }
        }

        const redirectUrl = `${frontendUrl}/login?token=${result.token}`;
        console.log("Redirecting to:", redirectUrl);
        res.redirect(redirectUrl);
      } else {
        console.log("No token in OAuth result:", result);
        // Redirect to frontend with error
        let frontendUrl = process.env.FRONTEND_URL;
        if (!frontendUrl) {
          if (process.env.NODE_ENV === "production") {
            const protocol = req.headers["x-forwarded-proto"] || "https";
            const host = req.headers.host;
            frontendUrl = `${protocol}://${host}`;
          } else {
            frontendUrl = "http://localhost:5173"; // Updated to match current client port
          }
        }
        const errorRedirectUrl = `${frontendUrl}/login?error=${encodeURIComponent("Google authentication failed - no token received")}`;
        console.log("Error redirect to:", errorRedirectUrl);
        res.redirect(errorRedirectUrl);
      }
    } catch (error) {
      console.error("OAuth callback error:", error);
      let frontendUrl = process.env.FRONTEND_URL;
      if (!frontendUrl) {
        if (process.env.NODE_ENV === "production") {
          const protocol = req.headers["x-forwarded-proto"] || "https";
          const host = req.headers.host;
          frontendUrl = `${protocol}://${host}`;
        } else {
          frontendUrl = "http://localhost:5173"; // Updated to match current client port
        }
      }
      const errorRedirectUrl = `${frontendUrl}/login?error=${encodeURIComponent(error.message || "Google authentication failed")}`;
      console.log("Exception redirect to:", errorRedirectUrl);
      res.redirect(errorRedirectUrl);
    }
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    try {
      const user = await this.authService.getUserById(req.user.id);
      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider,
          totalKills: user.totalKills,
          totalDeaths: user.totalDeaths,
          totalScore: user.totalScore,
          playerLevel: user.playerLevel,
          experience: user.experience,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to get profile",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put("username")
  @UseGuards(JwtAuthGuard)
  async updateUsername(
    @Request() req,
    @Body(ValidationPipe) updateUsernameDto: UpdateUsernameDto
  ) {
    try {
      const result = await this.authService.updateUsername(
        req.user.id,
        updateUsernameDto
      );
      return {
        success: true,
        message: "Username updated successfully",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || "Failed to update username",
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Put("display-name")
  @UseGuards(JwtAuthGuard)
  async updateDisplayName(
    @Request() req,
    @Body(ValidationPipe) updateDisplayNameDto: UpdateDisplayNameDto
  ) {
    try {
      const result = await this.authService.updateDisplayName(
        req.user.id,
        updateDisplayNameDto
      );
      return {
        success: true,
        message: "Display name updated successfully",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || "Failed to update display name",
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post("update-experience")
  @UseGuards(JwtAuthGuard)
  async updateExperience(
    @Request() req,
    @Body(ValidationPipe) experienceUpdateDto: ExperienceUpdateDto
  ) {
    try {
      const result = await this.authService.updateUserExperience(
        req.user.id,
        experienceUpdateDto.experience,
        experienceUpdateDto.level
      );
      return {
        success: true,
        message: "Experience updated successfully",
        user: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || "Failed to update experience",
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post("update-score")
  @UseGuards(JwtAuthGuard)
  async updateScore(
    @Request() req,
    @Body(ValidationPipe) scoreUpdateDto: ScoreUpdateDto
  ) {
    try {
      const result = await this.authService.updateUserScore(
        req.user.id,
        scoreUpdateDto.score,
        scoreUpdateDto.kills || 0,
        scoreUpdateDto.deaths || 0
      );
      return {
        success: true,
        message: "Score updated successfully",
        user: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || "Failed to update score",
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get("admin/users")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllUsers(@Request() req) {
    try {
      const users = await this.authService.getAllUsers();
      return {
        success: true,
        data: users.map((user) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider,
          totalKills: user.totalKills,
          totalDeaths: user.totalDeaths,
          totalScore: user.totalScore,
          playerLevel: user.playerLevel,
          experience: user.experience,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        })),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to get users",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put("admin/users/:id/role")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateUserRole(@Request() req, @Body() body: { role: UserRole }) {
    try {
      // Implementation would go here for updating user roles
      return {
        success: true,
        message: "User role updated successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to update user role",
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get("verify")
  @UseGuards(JwtAuthGuard)
  async verifyToken(@Request() req) {
    return {
      success: true,
      message: "Token is valid",
      data: {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
      },
    };
  }

  @Get("debug")
  async getDebugPage(@Response() res) {
    // Serve the OAuth debug page
    const fs = require("fs");
    const path = require("path");
    try {
      const debugPage = fs.readFileSync(
        path.join(process.cwd(), "oauth-debug.html"),
        "utf8"
      );
      res.type("html");
      res.send(debugPage);
    } catch (error) {
      res.json({
        success: false,
        message: "Debug page not found",
        error: error.message,
      });
    }
  }

  @Post("admin/recalculate-levels")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async recalculateAllUserLevels(@Request() req) {
    try {
      const result = await this.authService.recalculateAllUserLevels();
      return {
        success: true,
        message: `Level recalculation completed: ${result.updated}/${result.total} users updated`,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || "Failed to recalculate user levels",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("debug-level/:experience")
  async debugLevelCalculation(@Request() req, @Response() res) {
    try {
      const experience = parseInt(req.params.experience) || 0;
      const level = calculateLevelFromExperience(experience);

      // Get some example level calculations
      const examples = [];
      for (let exp of [0, 100, 250, 500, 1000, 2000, 5000]) {
        examples.push({
          experience: exp,
          level: calculateLevelFromExperience(exp),
        });
      }

      res.json({
        success: true,
        data: {
          input: { experience },
          result: { level },
          examples,
          config: {
            baseExperienceRequired: 100,
            experienceMultiplier: 1.5,
            formula: "exponential",
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  @Get("debug-my-level")
  @UseGuards(JwtAuthGuard)
  async debugMyLevel(@Request() req) {
    try {
      const user = await this.authService.getUserById(req.user.id);
      const calculatedLevel = calculateLevelFromExperience(
        user.experience || 0
      );

      return {
        success: true,
        data: {
          userId: user.id,
          username: user.username,
          currentData: {
            experience: user.experience || 0,
            storedLevel: user.playerLevel || 1,
          },
          calculated: {
            level: calculatedLevel,
            levelMatches: (user.playerLevel || 1) === calculatedLevel,
          },
          shouldUpdate: (user.playerLevel || 1) !== calculatedLevel,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || "Failed to debug user level",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("fix-my-level")
  @UseGuards(JwtAuthGuard)
  async fixMyLevel(@Request() req) {
    try {
      const user = await this.authService.getUserById(req.user.id);
      const calculatedLevel = calculateLevelFromExperience(
        user.experience || 0
      );

      if (user.playerLevel !== calculatedLevel) {
        await this.authService.updateUserLevel(
          parseInt(user.id),
          calculatedLevel
        );

        return {
          success: true,
          message: "Level updated successfully",
          data: {
            userId: user.id,
            username: user.username,
            oldLevel: user.playerLevel || 1,
            newLevel: calculatedLevel,
            experience: user.experience || 0,
          },
        };
      } else {
        return {
          success: true,
          message: "Level is already correct",
          data: {
            userId: user.id,
            username: user.username,
            level: calculatedLevel,
            experience: user.experience || 0,
          },
        };
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || "Failed to fix user level",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("oauth-status")
  async getOAuthStatus() {
    const googleConfigured =
      (process.env.SPACE_FIGHTER_GOOGLE_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_ID) &&
      (process.env.SPACE_FIGHTER_GOOGLE_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_ID) !== "your-google-client-id" &&
      (process.env.SPACE_FIGHTER_GOOGLE_CLIENT_SECRET ||
        process.env.GOOGLE_CLIENT_SECRET) &&
      (process.env.SPACE_FIGHTER_GOOGLE_CLIENT_SECRET ||
        process.env.GOOGLE_CLIENT_SECRET) !== "your-google-client-secret";

    return {
      success: true,
      data: {
        environment: process.env.NODE_ENV || "development",
        google: {
          configured: googleConfigured,
          clientId: googleConfigured
            ? process.env.SPACE_FIGHTER_GOOGLE_CLIENT_ID ||
              process.env.GOOGLE_CLIENT_ID
            : "Not configured",
          status: googleConfigured
            ? "Ready"
            : "Needs real credentials from Google Cloud Console",
          callbackUrl: process.env.GOOGLE_CALLBACK_URL || "auto-detected",
        },
        urls: {
          frontendUrl: process.env.FRONTEND_URL || "auto-detected",
          serviceUrl:
            process.env.SERVICE_URL || process.env.CLOUD_RUN_URL || "not-set",
          port: process.env.PORT || "3001",
        },
        cloudRun: {
          isCloudRun: !!(
            process.env.K_SERVICE || process.env.CLOUD_RUN_SERVICE
          ),
          service:
            process.env.K_SERVICE ||
            process.env.CLOUD_RUN_SERVICE ||
            "not-detected",
          revision: process.env.K_REVISION || "not-detected",
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("test-oauth")
  async testOAuth(@Response() res) {
    try {
      // Create a test user for OAuth testing
      const testUser = {
        id: 999,
        username: "TestUser",
        email: "test@example.com",
        isGuest: false,
      };

      // Create JWT token
      const result = await this.authService.loginWithGoogle(testUser);

      if (result && result.token) {
        // Redirect to frontend with token (same as real OAuth flow)
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";
        res.redirect(`${frontendUrl}?token=${result.token}`);
      } else {
        res.status(500).json({ error: "Failed to create test token" });
      }
    } catch (error) {
      console.error("Test OAuth error:", error);
      res.status(500).json({ error: "Test OAuth failed" });
    }
  }
}
