import {
  Body,
  Controller,
  Logger,
  Post,
  Version,
  Res,
  UseGuards,
  Req,
  Get,
  Query,
  Delete,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import {
  
  LoginRequestDto,
  SessionDto,
  GoogleLoginRequestDto,
  LoginResponseDto,
  BaseResponseDto,
  TokenPairDto,
  OrganisationSignupRequestDto,
  OrganizationSignupDataDto,
  UserSignupRequestDto,
  UserSignupDataDto,
  RequestOtpDto,
  VerifyOtpDto,
  VerifyOtpResponseDataDto,
  ResetPasswordDto,
  RevokeSessionDto,
  OtpPurposeQueryDto,
} from '@pivota-api/dtos';
import { ClientInfo } from '../../decorators/client-info.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  getSchemaPath,
  ApiExtraModels,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtRequest } from '@pivota-api/interfaces';
import { RolesGuard } from '../../guards/role.guard';
import { Roles } from '../../decorators/roles.decorator';
import { ThrottlerGuard, Throttle} from '@nestjs/throttler';

@ApiTags('Auth') // Main module tag
@ApiExtraModels(
  BaseResponseDto, 
  LoginResponseDto, 
  UserSignupRequestDto, 
  TokenPairDto, 
  OrganizationSignupDataDto, 
  UserSignupDataDto, 
  GoogleLoginRequestDto,
  RequestOtpDto,
  VerifyOtpDto,
  VerifyOtpResponseDataDto,
  ResetPasswordDto,
  RevokeSessionDto
)
@Controller('auth-module')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // ===========================================================
  // 🔐 AUTH - REGISTRATION
  // ===========================================================

  /**
   * Register a new user account
   * 
   * Creates a new individual user account in the system.
   * Requires a valid OTP code for verification.
   * 
   * @param signupDto - User registration details (email, password, personal info)
   * @returns Created user details and account information
   */
@Post('signup')
@Version('1')
@ApiTags('Auth - Registration')
@ApiOperation({ 
  summary: 'Register a new user',
  description: `
    Creates a new individual user account in the system.
    
    **Microservice:** Auth Service
    **Authentication:** Not required (public)
    
    **Registration Flow:**
    1. User requests OTP via /otp/request
    2. User receives OTP via email
    3. User submits OTP with registration details
    4. System validates OTP and creates account
    5. User must **manually log in** after successful registration
    
    **Important Notes:**
    •  User is **NOT automatically logged in** after signup
    •  User must call the login endpoint separately
    •  JWT tokens are NOT issued by this endpoint
    
    **Required Information:**
    • **email** - Valid email address (will be normalized to lowercase)
    • **password** - Strong password (min 8 chars with uppercase, lowercase, number, special char)
    • **firstName** - User's first name
    • **lastName** - User's last name
    • **phone** - Kenyan phone number (will be normalized to +254 format)
    • **otpCode** - Valid OTP code received via email
    
    **Phone Number Format:**
    Accepts various Kenyan formats:
    • 0712345678 → +254712345678
    • 0112345678 → +254112345678
    • 254712345678 → +254712345678
    • +254712345678 → +254712345678
    
    All are normalized to E.164 format (+254XXXXXXXXX).
    
    **Account Creation Process:**
    • Creates Account record (root identity)
    • Creates User record (login identity)
    • Creates UserProfile (metadata)
    • Assigns default 'GeneralUser' role
    • Sets up free tier subscription (if applicable)
    
    **Response includes:**
    • User UUID and details
    • Account information
    • Profile completion status
    • **No tokens are returned** - user must log in
    
    **Next Steps:**
    After successful signup, the user should:
    1. Navigate to login page
    2. Call POST /auth-module/login with credentials
    3. Complete 2FA verification (if enabled)
    4. Receive JWT tokens upon successful login
  `
})
@ApiBody({ 
  type: UserSignupRequestDto,
  examples: {
    'New user signup': {
      value: {
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+254712345678',
        planSlug: 'free-forever',
        code: '123456'
      }
    }
  }
})
@ApiResponse({
  status: 201,
  description: 'User signed up successfully. User must now log in.',
  schema: {
    allOf: [
      { $ref: getSchemaPath(BaseResponseDto) },
      {
        properties: {
          data: { 
            $ref: getSchemaPath(UserSignupDataDto),
            example: {
              userUuid: 'usr_123abc',
              accountId: 'acc_456def',
              email: 'john.doe@example.com',
              firstName: 'John',
              lastName: 'Doe',
              phone: '+254712345678',
              status: 'ACTIVE',
              requiresPayment: false,
              requiresMfa: false,
              createdAt: '2026-03-05T10:30:00.000Z',
              message: 'Account created successfully. Please log in.'
            }
          }
        },
      },
    ],
  },
})
@ApiResponse({ 
  status: 400, 
  description: 'Validation error - Invalid input data',
  schema: {
    example: {
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: [
        { field: 'email', message: 'email must be a valid email address' },
        { field: 'password', message: 'password must be at least 8 characters' }
      ]
    }
  }
})
@ApiResponse({ 
  status: 409, 
  description: 'Conflict - Email already registered',
  schema: {
    example: {
      success: false,
      message: 'A user with this email address already exists',
      code: 'ALREADY_EXISTS'
    }
  }
})
@ApiResponse({ 
  status: 410, 
  description: 'OTP expired or invalid',
  schema: {
    example: {
      success: false,
      message: 'OTP code expired or invalid',
      code: 'INVALID_OTP'
    }
  }
})
async signup(
  @Body() signupDto: UserSignupRequestDto  
): Promise<BaseResponseDto<UserSignupDataDto>> {
  this.logger.log(`📩 Signup request: ${signupDto.email}`);
  const response = await this.authService.signup(signupDto);
  if (!response.success) {
    this.logger.warn(`⚠️ Signup failed for ${signupDto.email}: ${response.message}`);
    throw response;
  } else {
    this.logger.log(`✅ Signup successful for: ${signupDto.email}`);
  }
  return response;
}

  /**
   * Register a new organization
   * 
   * Creates a new organization account in the system.
   * 
   * @param dto - Organization registration details
   * @returns Created organization details
   */
  @Post('signup/organization')
  @Version('1')
  @ApiTags('Auth - Registration')
  @ApiOperation({ 
    summary: 'Register a new organisation',
    description: `
      Creates a new organization account in the system.
      
      **Microservice:** Auth Service
      **Authentication:** Not required (public)
      
      **Organization Registration Flow:**
      1. Admin requests OTP via /otp/request
      2. Admin receives OTP via email
      3. Admin submits OTP with organization details
      4. System validates OTP and creates organization account
      5. Admin user is created as organization admin
      
      **Required Information:**
      • **name** - Organization name
      • **email** - Admin email address
      • **password** - Admin password
      • **firstName** - Admin first name
      • **lastName** - Admin last name
      • **phone** - Admin phone number
      • **otpCode** - Valid OTP code
      
      **Organization Features:**
      • Team member management
      • Multi-user access
      • Organization-wide listings
      • Shared resources
      • Role-based permissions
      
      **Account Structure:**
      • Organization Account (root)
      • Admin User (creator)
      • Organization Profile
      • Team members can be added later
      
      **Post-Creation:**
      • Admin can invite team members
      • Organization can be onboarded as provider
      • Can manage organization listings
    `
  })
  @ApiBody({ 
    type: OrganisationSignupRequestDto,
    examples: {
      'Organization signup': {
        value: {
          name: 'Pivota Properties Ltd',
          email: 'admin@pivotaproperties.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+254712345678',
          otpCode: '123456'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Organisation signed up successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { 
              $ref: getSchemaPath(OrganizationSignupDataDto),
              example: {
                organizationUuid: 'org_123abc',
                accountId: 'acc_456def',
                name: 'Pivota Properties Ltd',
                adminUserUuid: 'usr_789ghi',
                email: 'admin@pivotaproperties.com',
                status: 'ACTIVE',
                createdAt: '2026-03-05T10:30:00.000Z'
              }
            }
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input data' })
  @ApiResponse({ status: 409, description: 'Conflict - Organization with same email already exists' })
  @ApiResponse({ status: 410, description: 'OTP expired or invalid' })
  async signupOrganisation(
    @Body() dto: OrganisationSignupRequestDto,
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
    this.logger.log(`🏢 Organisation signup request: ${dto.name}`);
    return this.authService.signupOrganisation(dto);
  }

  // ===========================================================
  // 🔐 AUTH - LOGIN
  // ===========================================================

  /**
   * Login Stage 1: Verify password and trigger MFA
   * 
   * First step of two-factor authentication login.
   * Validates password and sends OTP if MFA is enabled.
   * 
   * @param loginDto - Login credentials (email, password)
   * @returns MFA required status
   */
  @Post('login')
  @Version('1')
  @ApiTags('Auth - Login')
  @ApiOperation({ 
    summary: 'Step 1: Verify password and trigger MFA OTP',
    description: `
      First step of two-factor authentication login.
      
      **Microservice:** Auth Service
      **Authentication:** Not required
      
      **Login Flow:**
      1. User submits email and password
      2. System validates credentials
      3. If MFA enabled, sends OTP to email
      4. Returns 2FA_PENDING status
      5. User completes with /login/verify-mfa
      
      **MFA Logic:**
      • If user has MFA enabled: returns 2FA_PENDING
      • If user has no MFA: would complete login (but we always require MFA)
      
      **Rate Limiting:**
      • Protected by ThrottlerGuard
      • Limited to 5 attempts per minute
      
      **Response:**
      • Success: 2FA_PENDING (MFA required)
      • Failure: Invalid credentials message
      
      **Note:**
      No cookies are set at this stage.
      Actual login completion happens in Stage 2.
    `
  })
  @ApiBody({ 
    type: LoginRequestDto,
    examples: {
      'User login': {
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePass123!'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Password correct. MFA REQUIRED. Status code: 2FA_PENDING',
    schema: {
      example: {
        success: true,
        message: 'MFA required. Please verify OTP.',
        code: '2FA_PENDING',
        data: {
          requiresMfa: true,
          email: 'john.doe@example.com'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts - rate limited' })
  async login(
    @Body() loginDto: LoginRequestDto,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`🔑 Login Stage 1 for: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  /**
   * Login Stage 2: Verify MFA OTP and issue cookies
   * 
   * Completes the two-factor authentication process.
   * Verifies OTP and issues JWT cookies for authenticated session.
   * 
   * @param dto - OTP verification details
   * @param clientInfo - Client device information for session tracking
   * @param res - Express response object for setting cookies
   * @returns Login success with user data
   */
  @Post('login/verify-mfa')
  @Version('1')
  @ApiTags('Auth - Login')
  @ApiOperation({ 
    summary: 'Step 2: Verify OTP and issue JWT cookies',
    description: `
      Completes the two-factor authentication process.
      
      **Microservice:** Auth Service
      **Authentication:** Not required (completes login)
      
      **Process:**
      1. User submits OTP received via email
      2. System validates OTP code
      3. If valid, creates session and issues cookies
      4. Returns user data and session info
      
      **Cookie Setup:**
      • Sets secure HTTP-only cookies
      • Access token (short-lived)
      • Refresh token (long-lived)
      • Session tracking cookie
      
      **Session Tracking:**
      • Records device information
      • Tracks IP address
      • Stores user agent
      • Creates session record in database
      
      **Security Features:**
      • OTP expires after use
      • Session limited duration
      • Device fingerprinting
      • Concurrent session limits
      
      **Response includes:**
      • User profile data
      • Account information
      • Session details
      • Cookies automatically set
    `
  })
  @ApiBody({ 
    type: VerifyOtpDto,
    examples: {
      'Verify MFA': {
        value: {
          email: 'john.doe@example.com',
          code: '123456'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'MFA Verified. User logged in and cookies issued.',
    schema: {
      example: {
        success: true,
        message: 'Login successful',
        code: 'OK',
        data: {
          userUuid: 'usr_123abc',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'GeneralUser',
          accountId: 'acc_456def',
          sessionId: 'sess_789ghi',
          expiresIn: 3600
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async verifyMfaLogin(
    @Body() dto: VerifyOtpDto,
    @ClientInfo() clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`🛡️ MFA Login Verification for: ${dto.email}`);
    const resp = await this.authService.verifyMfaLogin(dto, clientInfo, res);
    if (!resp.success) {
      this.logger.warn(`⚠️ MFA Login failed for ${dto.email}: ${resp.message}`);
      throw resp;
    } else {
      this.logger.log(`✅ MFA Login successful for: ${dto.email}`);
    }
    return resp;  
  }

  /**
   * Login or register using Google OAuth
   * 
   * Authenticates user with Google OAuth token.
   * Creates account if user doesn't exist.
   * 
   * @param googleDto - Google OAuth token
   * @param clientInfo - Client device information
   * @param res - Express response object
   * @returns Login success with user data
   */
  @Post('google')
  @Version('1')
  @ApiTags('Auth - Login')
  @ApiOperation({ 
    summary: 'Login or Register using Google OAuth token',
    description: `
      Authenticates user with Google OAuth token.
      
      **Microservice:** Auth Service
      **Authentication:** Not required (uses Google token)
      
      **How it works:**
      1. Frontend obtains Google OAuth token
      2. Token is sent to this endpoint
      3. System validates token with Google
      4. If user exists, logs them in
      5. If not, creates new account automatically
      
      **Account Creation:**
      • Extracts profile info from Google
      • Creates Account and User records
      • Sets default role (GeneralUser)
      • No password required
      
      **Benefits:**
      • Seamless authentication
      • No password to remember
      • Faster signup process
      • Verified email
      
      **Security:**
      • Token validation with Google
      • Session creation with device info
      • Same cookie security as normal login
    `
  })
  @ApiBody({ 
    type: GoogleLoginRequestDto,
    examples: {
      'Google login': {
        value: {
          token: 'ya29.a0AfH6SMC...'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    type: LoginResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid Google token' })
  async googleLogin(
    @Body() googleDto: GoogleLoginRequestDto,
    @ClientInfo() clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    return this.authService.googleLogin(googleDto.token, clientInfo, res);
  }

  /**
   * Logout user and clear session
   * 
   * Terminates current session and clears authentication cookies.
   * 
   * @param res - Express response object
   * @returns Logout confirmation
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @ApiBearerAuth()
  @ApiTags('Auth - Login')
  @ApiOperation({ 
    summary: 'Logout user and clear JWT cookies',
    description: `
      Terminates current session and clears authentication cookies.
      
      **Microservice:** Auth Service
      **Authentication:** Required (JWT cookie)
      
      **What happens:**
      • Session is revoked in database
      • JWT cookies are cleared
      • Token becomes invalid
      • User must log in again
      
      **Effects:**
      • Cannot access protected endpoints
      • Refresh token invalidated
      • Session removed from active sessions list
      
      **Note:**
      If you have multiple devices, only the current session is logged out.
      Use session revocation for other devices.
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logged out successfully',
    schema: {
      example: {
        success: true,
        message: 'Logged out successfully'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Res({ passthrough: true }) res: Response) {
    await this.authService.logout(res);
    return { success: true, message: 'Logged out successfully' };
  }

  // ===========================================================
  // 🔐 AUTH - TOKEN MANAGEMENT
  // ===========================================================

  /**
   * Refresh access token
   * 
   * Uses refresh token to obtain a new access token.
   * 
   * @param refreshToken - Refresh token from cookies or request body
   * @param res - Express response object
   * @returns New token pair
   */
  @Post('refreshToken')
  @Version('1')
  @ApiTags('Auth - Tokens')
  @ApiOperation({ 
    summary: 'Refresh access token using refresh token',
    description: `
      Uses refresh token to obtain a new access token.
      
      **Microservice:** Auth Service
      **Authentication:** Not required (uses refresh token)
      
      **When to use:**
      • Access token expired
      • Need new tokens without re-authentication
      • Background token refresh
      
      **How it works:**
      1. Client sends refresh token
      2. System validates refresh token
      3. If valid, issues new token pair
      4. Old refresh token is invalidated
      
      **Security:**
      • Refresh tokens are one-time use
      • New refresh token issued each time
      • Tokens have limited lifetime
      • Can be revoked via session management
      
      **Response:**
      • New access token (short-lived)
      • New refresh token (long-lived)
      • Automatically sets cookies
    `
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tokens refreshed successfully',
    type: TokenPairDto
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<TokenPairDto>> { 
    return this.authService.refresh(refreshToken, res);
  }

  // ===========================================================
  // 🔐 AUTH - OTP MANAGEMENT
  // ===========================================================

  /**
   * Request a one-time password (OTP)
   * 
   * Sends a verification code to the user's email for various purposes.
   * 
   * @param dto - Email address
   * @param query - OTP purpose (signup, login, password-reset, etc.)
   * @returns Success confirmation
   */
  @Post('otp/request')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Version('1')
  @ApiTags('Auth - OTP')
  @ApiOperation({ 
    summary: 'Request a security code (OTP) via email',
    description: `
      Sends a verification code to the user's email for various purposes.
      
      **Microservice:** Auth Service
      **Authentication:** Not required
      
      **OTP Purposes:**
      • **signup** - Verify email during registration
      • **login** - Two-factor authentication
      • **password-reset** - Reset forgotten password
      • **email-verify** - Verify email change
      
      **Rate Limiting:**
      • Maximum 5 requests per minute
      • Prevents abuse and spam
      • Per email address tracking
      
      **Process:**
      1. Generate 6-digit numeric code
      2. Store with expiration (10 minutes)
      3. Send via email
      4. Track attempts
      
      **Security:**
      • Codes expire after 10 minutes
      • One-time use only
      • Limited attempts before lockout
      • Email rate limiting
      
      **Note:**
      Always returns success (even if email not found)
      to prevent email enumeration attacks.
    `
  })
  @ApiBody({ 
    type: RequestOtpDto,
    examples: {
      'Request signup OTP': {
        value: {
          email: 'john.doe@example.com'
        }
      }
    }
  })
  @ApiQuery({ 
    name: 'purpose', 
    required: true,
    enum: ['signup', 'login', 'password-reset', 'email-verify'],
    description: 'Purpose of the OTP request'
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      example: {
        success: true,
        message: 'OTP sent successfully',
        code: 'OK'
      }
    }
  })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limited' })
  async requestOtp(
    @Body() dto: RequestOtpDto,
    @Query() query: OtpPurposeQueryDto
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`📩 OTP Request [${query.purpose}] for: ${dto.email}`);
    
    const result = await this.authService.requestOtp(dto, query.purpose);

    if (!result.success) {
      this.logger.warn(`⚠️ OTP Request failed for ${dto.email}: ${result.message}`);
      throw result; 
    }

    return result;
  }

  /**
   * Verify a one-time password (OTP)
   * 
   * Validates an OTP code for a specific purpose.
   * 
   * @param dto - Email and OTP code
   * @param query - OTP purpose
   * @returns Verification result with optional data
   */
  @Post('otp/verify')
  @Version('1')
  @ApiTags('Auth - OTP')
  @ApiOperation({ 
    summary: 'Verify a security code',
    description: `
      Validates an OTP code for a specific purpose.
      
      **Microservice:** Auth Service
      **Authentication:** Not required
      
      **Verification Process:**
      1. Find OTP record by email and code
      2. Check expiration
      3. Verify purpose matches
      4. Mark as used
      5. Return purpose-specific data
      
      **Purpose-Specific Responses:**
      • **signup** - Returns token for registration
      • **login** - Completes MFA login
      • **password-reset** - Returns reset token
      • **email-verify** - Confirms email ownership
      
      **Security:**
      • One-time use only
      • Expires after 10 minutes
      • Limited verification attempts
      • Invalid after purpose completed
      
      **Note:**
      For login, this is the second factor in 2FA.
      For signup, this validates email before account creation.
    `
  })
  @ApiBody({ 
    type: VerifyOtpDto,
    examples: {
      'Verify OTP': {
        value: {
          email: 'john.doe@example.com',
          code: '123456'
        }
      }
    }
  })
  @ApiQuery({ 
    name: 'purpose', 
    required: true,
    enum: ['signup', 'login', 'password-reset', 'email-verify'],
    description: 'Purpose of the OTP verification'
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verification result',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { 
              $ref: getSchemaPath(VerifyOtpResponseDataDto),
              example: {
                verified: true,
                purpose: 'signup',
                token: 'otp_token_123abc',
                expiresIn: 600
              }
            }
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Query() query: OtpPurposeQueryDto
  ): Promise<BaseResponseDto<VerifyOtpResponseDataDto>> {
    this.logger.log(`🔍 OTP Verification [${query.purpose}] attempt for: ${dto.email}`);
    const response = await this.authService.verifyOtp(dto, query.purpose);
    if (!response.success) {
      this.logger.error(`OTP verification failed for ${dto.email} with purpose ${query.purpose}: ${response.message}`);
      throw response;
    }
    this.logger.log(`OTP verified successfully for ${dto.email} with purpose ${query.purpose}`);
    return response;
  }

  // ===========================================================
  // 🔐 AUTH - PASSWORD MANAGEMENT
  // ===========================================================

  /**
   * Request password reset
   * 
   * Initiates password reset flow by sending OTP to email.
   * 
   * @param dto - Email address
   * @returns Success confirmation
   */
  @Post('password/forgot')
  @Version('1')
  @ApiTags('Auth - Password')
  @ApiOperation({ 
    summary: 'Step 1: Request a password reset OTP',
    description: `
      Initiates password reset flow by sending OTP to email.
      
      **Microservice:** Auth Service
      **Authentication:** Not required
      
      **Password Reset Flow:**
      1. User requests reset (this endpoint)
      2. System sends OTP to email
      3. User submits OTP with new password (/password/reset)
      4. Password is updated
      
      **Security:**
      • Always returns success (even if email not found)
      • Prevents email enumeration
      • Rate limited to prevent abuse
      • OTP expires after 10 minutes
      
      **Note:**
      If email exists, OTP is sent.
      If not, no action taken but success returned.
    `
  })
  @ApiBody({ 
    type: RequestOtpDto,
    examples: {
      'Request password reset': {
        value: {
          email: 'john.doe@example.com'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'If the account exists, a reset code has been sent.',
    schema: {
      example: {
        success: true,
        message: 'If your email exists, you will receive a reset code',
        code: 'OK'
      }
    }
  })
  async requestPasswordReset(
    @Body() dto: RequestOtpDto
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`🔑 Password reset requested for: ${dto.email}`);
    return this.authService.requestPasswordReset(dto);
  }

  /**
   * Reset password using OTP
   * 
   * Completes password reset flow with new password.
   * 
   * @param dto - Email, OTP code, and new password
   * @returns Success confirmation
   */
  @Post('password/reset')
  @Version('1')
  @ApiTags('Auth - Password')
  @ApiOperation({ 
    summary: 'Step 2: Submit new password using the OTP code',
    description: `
      Completes password reset flow with new password.
      
      **Microservice:** Auth Service
      **Authentication:** Not required
      
      **Requirements:**
      • Valid OTP code (from /password/forgot)
      • New password meeting strength requirements
      • OTP must not be expired
      
      **Password Requirements:**
      • Minimum 8 characters
      • At least one uppercase letter
      • At least one lowercase letter
      • At least one number
      • At least one special character
      
      **Process:**
      1. Validate OTP code
      2. Find user by email
      3. Hash new password
      4. Update credential
      5. Invalidate all sessions
      6. Send confirmation email
      
      **After Reset:**
      • User must log in with new password
      • All existing sessions are terminated
      • Email confirmation sent
    `
  })
  @ApiBody({ 
    type: ResetPasswordDto,
    examples: {
      'Reset password': {
        value: {
          email: 'john.doe@example.com',
          code: '123456',
          newPassword: 'NewSecurePass123!'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: {
      example: {
        success: true,
        message: 'Password reset successful',
        code: 'OK'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 422, description: 'Password does not meet requirements' })
  async resetPassword(
    @Body() dto: ResetPasswordDto
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`🔄 Processing password reset for: ${dto.email}`);
    return this.authService.resetPassword(dto);
  }

  // ===========================================================
  // 🔐 AUTH - SESSION MANAGEMENT
  // ===========================================================

  /**
   * Revoke session(s)
   * 
   * Revokes a specific session or all sessions for a user.
   * 
   * @param req - JWT request
   * @param res - Express response
   * @param tokenId - Optional specific session to revoke
   * @param targetUserUuid - Optional target user (admin only)
   * @returns Success confirmation
   */
  @Delete('session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ModuleManager', 'GeneralUser')
  @Version('1')
  @ApiBearerAuth()
  @ApiTags('Auth - Sessions')
  @ApiOperation({ 
    summary: 'Revoke session(s)',
    description: `
      Revokes a specific session or all sessions for a user.
      
      **Microservice:** Auth Service
      **Authentication:** Required (JWT cookie)
      
      **Permission Model:**
      • **Own sessions** - Any user can revoke their own sessions
      • **Other users** - Admin only (SuperAdmin, SystemAdmin, ModuleManager)
      
      **Revocation Types:**
      1. **Single session** - Provide tokenId
      2. **All sessions** - Omit tokenId
      3. **Current device** - tokenId matches current session
      
      **Effects:**
      • Session marked as revoked in database
      • Token becomes invalid immediately
      • User must log in again
      • If revoking current device, cookies are cleared
      
      **Security:**
      • Cannot revoke sessions of other users without admin role
      • All revocations are logged
      • Audit trail maintained
      
      **Use Cases:**
      • Lost device
      • Suspicious activity
      • Employee offboarding
      • Security incident response
    `
  })
  @ApiQuery({
    name: 'tokenId',
    required: false,
    description: 'The unique ID of the session to revoke. Leave empty to revoke ALL sessions.',
    example: 'sess_123abc'
  })
  @ApiQuery({
    name: 'userUuid',
    required: false,
    description: 'Admin only: The UUID of the user whose sessions should be revoked.',
    example: 'usr_123abc'
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions revoked successfully',
    schema: {
      example: {
        success: true,
        message: 'Sessions revoked successfully',
        code: 'OK'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot revoke other users\' sessions' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(
    @Req() req: JwtRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('tokenId') tokenId?: string,
    @Query('userUuid') targetUserUuid?: string,
  ): Promise<BaseResponseDto<null>> {
    const requesterUuid = req.user.userUuid;
    const requesterRole = req.user.role;
    const currentTokenId = req.user.tokenId;

    const finalUserUuid = (targetUserUuid && targetUserUuid.trim() !== '') 
      ? targetUserUuid 
      : requesterUuid;

    if (finalUserUuid !== requesterUuid) {
      const isAdmin = ['SuperAdmin', 'SystemAdmin', 'ModuleManager'].includes(requesterRole);
      if (!isAdmin) {
        return BaseResponseDto.fail('Forbidden: Cannot revoke sessions for other users.', 'FORBIDDEN');
      }
    }

    const isGlobalLogout = !tokenId || tokenId.trim() === '';
    const isRevokingCurrentDevice = tokenId === currentTokenId;
    const isTargetingSelf = finalUserUuid === requesterUuid;

    if (isTargetingSelf && (isGlobalLogout || isRevokingCurrentDevice)) {
      await this.authService.logout(res);
    }

    return this.authService.revokeSessions(finalUserUuid, tokenId);
  }

  /**
   * Get active sessions
   * 
   * Retrieves all active sessions for a user.
   * 
   * @param req - JWT request
   * @param targetUserUuid - Optional target user (admin only)
   * @returns List of active sessions
   */
  @Get('sessions/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ModuleManager', 'GeneralUser')
  @Version('1')
  @ApiBearerAuth()
  @ApiTags('Auth - Sessions')
  @ApiOperation({ 
    summary: 'Retrieve active sessions',
    description: `
      Retrieves all active sessions for a user.
      
      **Microservice:** Auth Service
      **Authentication:** Required (JWT cookie)
      
      **Permission Model:**
      • **Own sessions** - Any user can view their own sessions
      • **Other users** - Admin only (SuperAdmin, SystemAdmin, ModuleManager)
      
      **Session Information:**
      • Device details (model, OS, browser)
      • IP address
      • Login time
      • Last active time
      • Expiration time
      • Current status
      
      **Use Cases:**
      • Security dashboard
      • Device management
      • Suspicious activity detection
      • User support
      
      **Admin Features:**
      • View sessions of any user
      • Monitor user activity
      • Security investigations
      • Compliance reporting
    `
  })
  @ApiQuery({ 
    name: 'userUuid', 
    required: false, 
    description: 'Admin only: The UUID of the user to fetch sessions for. Defaults to current user.',
    example: 'usr_123abc'
  }) 
  @ApiResponse({ 
    status: 200, 
    description: 'Active sessions retrieved',
    type: [SessionDto],
    schema: {
      example: {
        success: true,
        message: 'Active sessions retrieved',
        code: 'OK',
        data: [
          {
            id: 'sess_123abc',
            userUuid: 'usr_123abc',
            tokenId: 'token_456def',
            device: 'iPhone 14',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
            os: 'iOS 16',
            lastActiveAt: '2026-03-05T14:30:00Z',
            createdAt: '2026-03-05T10:30:00Z',
            expiresAt: '2026-03-06T10:30:00Z',
            revoked: false
          },
          {
            id: 'sess_789ghi',
            userUuid: 'usr_123abc',
            tokenId: 'token_456def',
            device: 'MacBook Pro',
            ipAddress: '192.168.1.101',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            os: 'macOS 13',
            lastActiveAt: '2026-03-05T13:15:00Z',
            createdAt: '2026-03-04T18:20:00Z',
            expiresAt: '2026-03-05T18:20:00Z',
            revoked: false
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot view other users\' sessions' })
  async getActiveSessions(
    @Req() req: JwtRequest,
    @Query('userUuid') targetUserUuid?: string, 
  ): Promise<BaseResponseDto<SessionDto[]>> {
    const requesterUuid = req.user.userUuid;
    const requesterRole = req.user.role;

    const hasTarget = targetUserUuid && targetUserUuid.trim().length > 0;
    let finalUserUuid = requesterUuid;

    if (hasTarget && targetUserUuid !== requesterUuid) {
      const isAdmin = ['SuperAdmin', 'SystemAdmin', 'ModuleManager'].includes(requesterRole);
      
      if (!isAdmin) {
        this.logger.warn(`🚫 Unauthorized session view attempt by ${requesterUuid} on ${targetUserUuid}`);
        return BaseResponseDto.fail(
          'You do not have permission to view sessions for other users.',
          'FORBIDDEN',
        );
      }
      finalUserUuid = targetUserUuid;
      this.logger.log(`👮 Admin ${requesterRole} fetching sessions for user: ${finalUserUuid}`);
    } else {
      this.logger.log(`📱 User ${requesterUuid} fetching their own sessions`);
    }

    return this.authService.getActiveSessions(finalUserUuid);
  }
}