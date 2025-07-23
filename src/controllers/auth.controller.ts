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
import { Roles } from "../decorators/roles.decorator";
import {
  GuestLoginDto,
  LoginDto,
  RegisterDto,
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

  @Post("guest")
  async loginAsGuest(@Body(ValidationPipe) guestDto: GuestLoginDto) {
    try {
      const result = await this.authService.loginAsGuest(guestDto);
      return {
        success: true,
        message: "Guest login successful",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || "Guest login failed",
        },
        HttpStatus.BAD_REQUEST
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
    try {
      console.log("=== Google Callback Start ===");
      console.log("Request user:", JSON.stringify(req.user, null, 2));
      console.log("Request query:", JSON.stringify(req.query, null, 2));
      console.log("Request headers:", JSON.stringify(req.headers, null, 2));

      const result = req.user; // User data from strategy

      if (result && result.token) {
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
              // Fallback - you'll need to set this in your Cloud Run environment
              frontendUrl = "https://your-cloud-run-service.run.app";
            }
          } else {
            frontendUrl = "http://localhost:5173";
          }
        }

        console.log("Redirecting to frontend with token:", frontendUrl);
        console.log("=== Google Callback Success ===");
        res.redirect(`${frontendUrl}?token=${result.token}`);
      } else {
        console.error("=== Google Callback Error: No token ===");
        console.error("Result:", JSON.stringify(result, null, 2));
        // Redirect to frontend with error
        let frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(
          `${frontendUrl}?error=${encodeURIComponent("Google authentication failed - no token received")}`
        );
      }
    } catch (error) {
      console.error("Google callback error:", error);
      let frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(
        `${frontendUrl}?error=${encodeURIComponent(error.message || "Google authentication failed")}`
      );
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
}
