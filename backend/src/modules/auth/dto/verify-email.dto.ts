import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description:
      'The single-purpose token from the verification email. Signed separately from access tokens and valid for 24 hours.',
  })
  @IsJWT()
  token!: string;
}
