import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: "Username must be at least 3 characters long" })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      "Username can only contain letters, numbers, underscores, and hyphens",
  })
  username: string;

  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  password: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

export class LoginDto {
  @IsString()
  usernameOrEmail: string;

  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  newPassword: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: "Username must be at least 3 characters long" })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      "Username can only contain letters, numbers, underscores, and hyphens",
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: "Display name must be at least 3 characters long" })
  displayName?: string;

  @IsOptional()
  @IsEmail({}, { message: "Please provide a valid email address" })
  email?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  preferences?: any;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: "New password must be at least 6 characters long" })
  newPassword: string;
}

export class SocialAuthDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  providerId: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      "Username can only contain letters, numbers, underscores, and hyphens",
  })
  username?: string; // Optional preferred username
}

export class UpdateUsernameDto {
  @IsString()
  @MinLength(3, { message: "Username must be at least 3 characters long" })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      "Username can only contain letters, numbers, underscores, and hyphens",
  })
  username: string;
}

export class UpdateDisplayNameDto {
  @IsString()
  @MinLength(1, { message: "Display name must be at least 1 character long" })
  @Matches(/^[a-zA-Z0-9\s_-]+$/, {
    message:
      "Display name can only contain letters, numbers, spaces, underscores, and hyphens",
  })
  displayName: string;
}

export class ScoreUpdateDto {
  @IsNumber({}, { message: "Score must be a valid number" })
  @Min(0, { message: "Score cannot be negative" })
  score: number;

  @IsOptional()
  @IsNumber({}, { message: "Kills must be a valid number" })
  @Min(0, { message: "Kills cannot be negative" })
  kills?: number;

  @IsOptional()
  @IsNumber({}, { message: "Deaths must be a valid number" })
  @Min(0, { message: "Deaths cannot be negative" })
  deaths?: number;
}

export class ExperienceUpdateDto {
  @IsNumber({}, { message: "Experience must be a valid number" })
  @Min(0, { message: "Experience cannot be negative" })
  experience: number;

  @IsNumber({}, { message: "Level must be a valid number" })
  @Min(1, { message: "Level must be at least 1" })
  level: number;
}
