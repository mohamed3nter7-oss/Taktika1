import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Gender, UserRole } from '../../../generated/prisma/client';

/**
 * Registration input.
 *
 * `role` accepts only the six professional roles in the `UserRole` enum. There
 * is no admin value in that enum and no field here that touches
 * `admin_profiles` — combined with `forbidNonWhitelisted: true` and the single
 * explicit `user.create` in the service, registration is STRUCTURALLY
 * incapable of minting an administrator (CLAUDE.md §9), not merely validated
 * against doing so.
 */
export class RegisterDto {
  @ApiProperty({ example: 'mohamed@example.com' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  @MaxLength(255)
  // Normalised here so the DB's chk_users_email_lowercase CHECK (§6) is a
  // backstop rather than a 500 waiting to happen.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({ minLength: 10, maxLength: 128 })
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters.' })
  @MaxLength(128) // bcrypt silently truncates past 72 bytes; cap well before surprises
  password!: string;

  @ApiProperty({ example: 'Mohamed Anter' })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({
    example: '1998-04-23',
    description:
      'ISO date. Role-aware minimum age is enforced server-side: PLAYER ≥ 12, all other roles ≥ 18.',
  })
  @Type(() => Date)
  @IsDate({ message: 'dateOfBirth must be a valid ISO date.' })
  dateOfBirth!: Date;

  @ApiProperty({ description: 'countries.id' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  countryId!: number;

  @ApiProperty({ description: 'cities.id' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cityId!: number;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '+201001234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,20}$/, { message: 'phone must be a valid number.' })
  phone?: string;

  // Bounds are PRD 9.2's, identical to UpdateMeDto's. A field that can be set
  // at registration and then edited must accept the same range in both places
  // — otherwise a value survives sign-up that its own edit form rejects.
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  headline?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}
