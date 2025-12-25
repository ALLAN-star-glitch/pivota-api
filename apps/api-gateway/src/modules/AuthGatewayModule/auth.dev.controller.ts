import {
  Controller,
  Get,
  Res,
  ForbiddenException,
  Logger,
  Version,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { BaseResponseDto, TokenPairDto } from '@pivota-api/dtos';

@ApiTags('AuthModule - (DEV TOOLS)')
@ApiExtraModels(BaseResponseDto, TokenPairDto)
@Controller('auth-dev')
export class AuthDevController {
  private readonly logger = new Logger(AuthDevController.name);

  constructor(private readonly authService: AuthService) {}

  @Version('1')
  @Get('generate-token')
  @ApiOperation({ summary: 'Bypass login to generate tokens for testing (Dev Only)' })
  @ApiResponse({
    status: 200,
    description: 'Tokens generated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(TokenPairDto) },
          },
        },
      ],
    },
  })
  async generateDevToken(
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponseDto<TokenPairDto>> {
    // 🛡️ Strict environment check
    if (process.env.NODE_ENV === 'production') {
      this.logger.error('CRITICAL: Attempt to use dev-token in production blocked!');
      throw new ForbiddenException('Bypass disabled in production');
    }

    /**
     * Hardcoded Test Data: 
     * The person testing no longer needs to provide these.
     */
    const TEST_USER_UUID = '27ce02f2-ac01-4f7c-b7bb-95eebc43cbd7';
    const TEST_EMAIL = 'allanmathenge67@gmail.com';
    const TEST_ROLE = 'SuperAdmin';

    this.logger.warn(` BYPASS: Generating tokens for ${TEST_EMAIL} as ${TEST_ROLE}`);
    
    // Call the method in your AuthService with hardcoded data
    return this.authService.generateDevTokenOnly(
      TEST_USER_UUID, 
      TEST_EMAIL, 
      TEST_ROLE, 
      res
    );
  }
}