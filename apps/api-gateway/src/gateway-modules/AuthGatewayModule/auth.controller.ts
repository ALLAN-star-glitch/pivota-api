/* eslint-disable @typescript-eslint/no-explicit-any */
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
  UseInterceptors, 
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
  AuthClientInfoDto,
  SignupResponseDto,
  RequestOtpQueryDto,
} from '@pivota-api/dtos';
import { ClientInfo } from '../../decorators/client-info.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtRequest } from '@pivota-api/interfaces';
import { Public } from '../../decorators/public.decorator';
import { PermissionsGuard } from '../../guards/PermissionGuard.guard';
import { ThrottlerGuard, Throttle} from '@nestjs/throttler';
import { Headers } from '@nestjs/common';
import { OtpPurpose, OtpPurposeEnum } from '@pivota-api/shared-redis';
import { TimeoutInterceptor } from '@pivota-api/interceptors';

@ApiTags('Auth')
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
@UseInterceptors(TimeoutInterceptor)
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
@Public()
@UseGuards(ThrottlerGuard)  // IP-based rate limiting at gateway level
@Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 requests per IP/minute
@Version('1')
@ApiTags('Auth - Registration')
@ApiHeader({
  name: 'referer',
  description: 'Source URL - for traffic source analysis (optional)',
  required: false,
  schema: { type: 'string', example: 'https://google.com/search?q=pivota' }
})
@ApiOperation({ 
  summary: 'Complete registration after OTP verification',
  description: `
    Completes the registration process after OTP verification.
    
    **Access Control:** Public endpoint - no authentication required.
    
    **Assigned Role:** Individual users receive the \`Individual\` role.
  `
})
@ApiBody({ 
  type: UserSignupRequestDto,
  examples: {
    'Job Seeker Registration': {
      summary: 'Complete job seeker registration',
      value: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        password: 'SecurePass123',
        phone: '0712345678',
        planSlug: 'free-forever',
        code: '123456',
        primaryPurpose: 'FIND_JOB',
        jobSeekerData: {
          headline: 'Senior Full Stack Developer',
          isActivelySeeking: true,
          skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
          industries: ['FinTech', 'HealthTech'],
          jobTypes: ['FULL_TIME', 'REMOTE'],
          seniorityLevel: 'SENIOR',
          expectedSalary: 250000,
          workAuthorization: ['Citizen', 'Work Permit'],
          linkedInUrl: 'linkedin.com/in/janedoe',
          githubUrl: 'github.com/janedoe'
        }
      }
    },
    'Skilled Professional Registration': {
      summary: 'Complete skilled professional registration',
      value: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        password: 'SecurePass123',
        phone: '0723456789',
        code: '123456',
        primaryPurpose: 'OFFER_SKILLED_SERVICES',
        skilledProfessionalData: {
          title: 'Master Electrician',
          profession: 'ELECTRICIAN',
          specialties: ['Wiring', 'Solar Installation', 'Security Systems'],
          serviceAreas: ['Nairobi', 'Kiambu', 'Machakos'],
          yearsExperience: 8,
          licenseNumber: 'EBK/1234/2020',
          hourlyRate: 800,
          availableToday: true,
          availableWeekends: true
        }
      }
    },
    'Agent Registration': {
      summary: 'Complete agent registration',
      value: {
        firstName: 'Mary',
        lastName: 'Njeri',
        email: 'mary.njeri@example.com',
        password: 'SecurePass123',
        phone: '0734567890',
        code: '123456',
        primaryPurpose: 'WORK_AS_AGENT',
        intermediaryAgentData: {
          agentType: 'HOUSING_AGENT',
          specializations: ['RESIDENTIAL', 'COMMERCIAL', 'LUXURY'],
          serviceAreas: ['Nairobi', 'Kiambu', 'Mombasa'],
          licenseNumber: 'ERB/5678/2021',
          yearsExperience: 5,
          agencyName: 'Prime Properties Agency',
          commissionRate: 5.0,
          about: 'Specializing in luxury apartments in Nairobi'
        }
      }
    },
    'Housing Seeker Registration - Looking to Rent': {
      summary: 'Housing seeker looking to rent',
      value: {
        firstName: 'Peter',
        lastName: 'Omondi',
        email: 'peter.omondi@example.com',
        password: 'SecurePass123',
        phone: '0745678901',
        code: '123456',
        primaryPurpose: 'FIND_HOUSING',
        housingSeekerData: {
          searchType: 'RENT',
          isLookingForRental: true,
          isLookingToBuy: false,
          minBedrooms: 2,
          maxBedrooms: 4,
          minBudget: 25000,
          maxBudget: 60000,
          preferredTypes: ['APARTMENT', 'HOUSE'],
          preferredCities: ['Nairobi', 'Kiambu'],
          preferredNeighborhoods: ['Kilimani', 'Lavington', 'Westlands'],
          moveInDate: '2026-04-15',
          leaseDuration: '1_YEAR',
          householdSize: 4,
          hasPets: true,
          petDetails: 'One dog',
          searchRadiusKm: 15
        }
      }
    },
    'Housing Seeker Registration - Looking to Buy': {
      summary: 'Housing seeker looking to buy property',
      value: {
        firstName: 'James',
        lastName: 'Mwangi',
        email: 'james.mwangi@example.com',
        password: 'SecurePass123',
        phone: '0756789012',
        code: '123456',
        primaryPurpose: 'FIND_HOUSING',
        housingSeekerData: {
          searchType: 'BUY',
          isLookingForRental: false,
          isLookingToBuy: true,
          minBedrooms: 3,
          maxBedrooms: 5,
          minBudget: 5000000,
          maxBudget: 10000000,
          preferredTypes: ['HOUSE', 'VILLA'],
          preferredCities: ['Nairobi', 'Kiambu'],
          preferredNeighborhoods: ['Runda', 'Karen', 'Lavington'],
          householdSize: 5,
          searchRadiusKm: 20
        }
      }
    },
    'Housing Seeker Registration - Both Rent and Buy': {
      summary: 'Housing seeker open to both rent and buy',
      value: {
        firstName: 'Lucy',
        lastName: 'Wanjiku',
        email: 'lucy.wanjiku@example.com',
        password: 'SecurePass123',
        phone: '0767890123',
        code: '123456',
        primaryPurpose: 'FIND_HOUSING',
        housingSeekerData: {
          searchType: 'BOTH',
          isLookingForRental: true,
          isLookingToBuy: true,
          minBedrooms: 2,
          maxBedrooms: 3,
          minBudget: 30000,
          maxBudget: 50000,
          preferredTypes: ['APARTMENT', 'CONDO'],
          preferredCities: ['Nairobi'],
          preferredNeighborhoods: ['Kilimani', 'Westlands'],
          householdSize: 3,
          searchRadiusKm: 10
        }
      }
    },
    'Support Beneficiary Registration': {
      summary: 'Complete support beneficiary registration',
      value: {
        firstName: 'Grace',
        lastName: 'Atieno',
        email: 'grace.atieno@example.com',
        password: 'SecurePass123',
        phone: '0756789012',
        code: '123456',
        primaryPurpose: 'GET_SOCIAL_SUPPORT',
        supportBeneficiaryData: {
          needs: ['FOOD', 'SHELTER', 'MEDICAL'],
          urgentNeeds: ['FOOD'],
          familySize: 4,
          city: 'Nairobi',
          neighborhood: 'Kawangware',
          prefersAnonymity: true,
          consentToShare: false,
          languagePreference: ['ENGLISH', 'SWAHILI']
        }
      }
    },
    'Employer Registration': {
      summary: 'Complete employer registration (hiring employees)',
      value: {
        firstName: 'Michael',
        lastName: 'Njenga',
        email: 'michael.njenga@example.com',
        password: 'SecurePass123',
        phone: '0767890123',
        code: '123456',
        primaryPurpose: 'HIRE_EMPLOYEES',
        employerData: {
          businessName: 'Njenga Tech Solutions',
          isRegistered: true,
          yearsExperience: 5,
          industry: 'Technology',
          companySize: '11-50',
          description: 'Software development and IT consulting',
          preferredSkills: ['JavaScript', 'Python', 'React', 'Node.js'],
          remotePolicy: 'HYBRID'
        }
      }
    },
    'Property Owner Registration - Rental Listings': {
      summary: 'Property owner listing properties for rent',
      value: {
        firstName: 'Grace',
        lastName: 'Wanjiku',
        email: 'grace.wanjiku@example.com',
        password: 'SecurePass123',
        phone: '0778901234',
        code: '123456',
        primaryPurpose: 'LIST_PROPERTIES',
        propertyOwnerData: {
          listingType: 'RENT',
          isListingForRent: true,
          isListingForSale: false,
          isProfessional: false,
          propertyCount: 3,
          propertyTypes: ['APARTMENT', 'HOUSE'],
          propertyPurpose: 'INVESTMENT',
          preferredPropertyTypes: ['APARTMENT', 'HOUSE'],
          serviceAreas: ['Nairobi', 'Kiambu']
        }
      }
    },
    'Property Owner Registration - Sale Listings': {
      summary: 'Property owner listing properties for sale',
      value: {
        firstName: 'David',
        lastName: 'Kimani',
        email: 'david.kimani@example.com',
        password: 'SecurePass123',
        phone: '0789012345',
        code: '123456',
        primaryPurpose: 'LIST_PROPERTIES',
        propertyOwnerData: {
          listingType: 'SALE',
          isListingForRent: false,
          isListingForSale: true,
          isProfessional: true,
          licenseNumber: 'ERB/12345/2023',
          companyName: 'Kimani Properties Ltd',
          yearsInBusiness: 8,
          preferredPropertyTypes: ['HOUSE', 'COMMERCIAL', 'LAND'],
          serviceAreas: ['Nairobi', 'Kiambu', 'Machakos']
        }
      }
    },
    'Property Owner Registration - Both Rent and Sale': {
      summary: 'Property owner listing both rentals and sales',
      value: {
        firstName: 'Esther',
        lastName: 'Muthoni',
        email: 'esther.muthoni@example.com',
        password: 'SecurePass123',
        phone: '0790123456',
        code: '123456',
        primaryPurpose: 'LIST_PROPERTIES',
        propertyOwnerData: {
          listingType: 'BOTH',
          isListingForRent: true,
          isListingForSale: true,
          isProfessional: false,
          propertyCount: 5,
          propertyTypes: ['APARTMENT', 'HOUSE', 'COMMERCIAL'],
          propertyPurpose: 'BOTH',
          preferredPropertyTypes: ['APARTMENT', 'HOUSE', 'COMMERCIAL'],
          serviceAreas: ['Nairobi', 'Kiambu']
        }
      }
    },
    'Just Exploring Registration': {
      summary: 'Just exploring (no profile created)',
      value: {
        firstName: 'Sarah',
        lastName: 'Kamau',
        email: 'sarah.kamau@example.com',
        password: 'SecurePass123',
        phone: '0789012345',
        code: '123456',
        primaryPurpose: 'JUST_EXPLORING'
      }
    },
    'Minimal Registration': {
      summary: 'Minimal registration with only required fields',
      value: {
        firstName: 'James',
        lastName: 'Kariuki',
        email: 'james.kariuki@example.com',
        password: 'SecurePass123',
        phone: '0790123456',
        code: '123456'
      }
    }
  }
})
@ApiResponse({ 
  status: 201, 
  description: 'Registration successful - Account and profiles created',
  schema: {
    example: {
      success: true,
      message: 'Signup successful',
      code: 'CREATED',
      data: {
        account: {
          uuid: '123e4567-e89b-12d3-a456-426614174000',
          accountCode: 'ACC123456789',
          type: 'INDIVIDUAL'
        },
        user: {
          uuid: '123e4567-e89b-12d3-a456-426614174001',
          userCode: 'USR123456789',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@example.com',
          phone: '0712345678',
          status: 'ACTIVE',
          roleName: 'Individual'
        },
        profile: {
          bio: null,
          gender: null,
          dateOfBirth: null,
          nationalId: null,
          profileImage: null
        },
        completion: {
          accountCompleted: true,
          profileCompleted: 30,
          documentsCompleted: 0
        }
      },
      error: null
    }
  }
})
@ApiResponse({ 
  status: 400, 
  description: 'Bad Request - Validation errors'
})
@ApiResponse({ 
  status: 401, 
  description: 'Unauthorized - Invalid or expired OTP'
})
@ApiResponse({ 
  status: 409, 
  description: 'Conflict - Email already registered'
})
@ApiResponse({ 
  status: 429, 
  description: 'Too Many Requests - OTP rate limit exceeded'
})
@ApiResponse({ 
  status: 500, 
  description: 'Internal Server Error - Unexpected system error'
})
@ApiResponse({ 
  status: 503, 
  description: 'Service Unavailable - Profile or RBAC service unavailable'
})
async signup(
  @Body() signupDto: UserSignupRequestDto,
  @ClientInfo() clientInfo: AuthClientInfoDto,
  @Headers('referer') referer?: string,  
): Promise<BaseResponseDto<SignupResponseDto>> {
  // ... existing implementation remains exactly the same
  this.logger.log(`📩 Signup request: ${signupDto.email}`);
   
  this.logger.debug(`[GATEWAY] Client info received for signup:`);
  this.logger.debug(`📱 Device: ${clientInfo.device} (${clientInfo.deviceType})`);
  this.logger.debug(`💻 OS: ${clientInfo.os} ${clientInfo.osVersion || ''}`);
  this.logger.debug(`🌐 Browser: ${clientInfo.browser} ${clientInfo.browserVersion || ''}`);
  this.logger.debug(`📍 IP: ${clientInfo.ipAddress}`);
  this.logger.debug(`🤖 Is Bot: ${clientInfo.isBot}`);
  this.logger.debug(`🔗 Referer: ${referer || 'Direct'}`);
  this.logger.debug(`🎯 Primary Purpose: ${signupDto.primaryPurpose || 'Not specified'}`);
  
  if (signupDto.jobSeekerData) {
    this.logger.debug(`📝 Using jobSeekerData for FIND_JOB`);
  } else if (signupDto.skilledProfessionalData) {
    this.logger.debug(`📝 Using skilledProfessionalData for OFFER_SKILLED_SERVICES`);
  } else if (signupDto.intermediaryAgentData) {
    this.logger.debug(`📝 Using intermediaryAgentData for WORK_AS_AGENT`);
  } else if (signupDto.housingSeekerData) {
    this.logger.debug(`📝 Using housingSeekerData for FIND_HOUSING`);
    this.logger.debug(`   Search Type: ${signupDto.housingSeekerData.searchType || 'Not specified'}`);
    this.logger.debug(`   Looking for Rental: ${signupDto.housingSeekerData.isLookingForRental}`);
    this.logger.debug(`   Looking to Buy: ${signupDto.housingSeekerData.isLookingToBuy}`);
  } else if (signupDto.supportBeneficiaryData) {
    this.logger.debug(`📝 Using supportBeneficiaryData for GET_SOCIAL_SUPPORT`);
  } else if (signupDto.employerData) {
    this.logger.debug(`📝 Using employerData for HIRE_EMPLOYEES`);
  } else if (signupDto.propertyOwnerData) {
    this.logger.debug(`📝 Using propertyOwnerData for LIST_PROPERTIES`);
    this.logger.debug(`   Listing Type: ${signupDto.propertyOwnerData.listingType || 'Not specified'}`);
    this.logger.debug(`   Listing for Rent: ${signupDto.propertyOwnerData.isListingForRent}`);
    this.logger.debug(`   Listing for Sale: ${signupDto.propertyOwnerData.isListingForSale}`);
  } else if (signupDto.profileData) {
    this.logger.debug(`⚠️ Deprecated profileData field used - please update to use specific fields`);
  }
  
  const response = await this.authService.signup(signupDto, clientInfo);
  
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
  @Public()
  @Version('1')
  @ApiTags('Auth - Registration')
  @ApiOperation({ 
    summary: 'Register a new organisation',
    description: `
      Creates a new organization account in the system.
      
      **Microservice:** Auth Service
      **Authentication:** Not required (public)
      
      ... (rest of existing documentation) ...
    `
  })
  @ApiBody({ type: OrganisationSignupRequestDto })
  @ApiHeader({
    name: 'x-platform',
    description: 'Platform identifier (web/mobile/api) - used for platform-specific behavior analysis',
    required: false,
    enum: ['web', 'mobile', 'api']
  })
  @ApiHeader({
    name: 'x-device',
    description: 'Custom device identifier (for mobile apps)',
    required: false,
    example: 'iPhone15,3'
  })
  @ApiHeader({
    name: 'x-device-type',
    description: 'Custom device type (MOBILE/TABLET/DESKTOP)',
    required: false,
    enum: ['MOBILE', 'TABLET', 'DESKTOP']
  })
  @ApiHeader({
    name: 'x-os',
    description: 'Custom OS identifier',
    required: false,
    example: 'iOS'
  })
  @ApiHeader({
    name: 'x-os-version',
    description: 'Custom OS version',
    required: false,
    example: '17.2'
  })
  @ApiHeader({
    name: 'referer',
    description: 'Source URL - for traffic source analysis',
    required: false
  })
  @ApiResponse({ status: 201, description: 'Organisation signed up successfully' })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input data' })
  @ApiResponse({ status: 409, description: 'Conflict - Organization with same email already exists' })
  @ApiResponse({ status: 410, description: 'OTP expired or invalid' })
  @ApiResponse({ status: 429, description: 'Too many attempts - Rate limited' })
  async signupOrganisation(
    @Body() dto: OrganisationSignupRequestDto,
    @ClientInfo() clientInfo: AuthClientInfoDto,
    @Headers('x-platform') platform?: string,
    @Headers('referer') referer?: string,
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
    // ... existing implementation remains exactly the same
    this.logger.log(`🏢 Organisation signup request: ${dto.name}`);
    
    this.logger.debug(`[GATEWAY] Organization signup - Client info received:`);
    this.logger.debug(`📱 Device: ${clientInfo.device} (${clientInfo.deviceType})`);
    this.logger.debug(`💻 OS: ${clientInfo.os} ${clientInfo.osVersion || ''}`);
    this.logger.debug(`🌐 Browser: ${clientInfo.browser} ${clientInfo.browserVersion || ''}`);
    this.logger.debug(`📍 IP: ${clientInfo.ipAddress}`);
    this.logger.debug(`🤖 Is Bot: ${clientInfo.isBot}`);
    this.logger.debug(`📊 Platform: ${platform || 'Not specified'}`);
    this.logger.debug(`🔗 Referer: ${referer || 'Direct'}`);
    this.logger.debug(`🏢 Organization: ${dto.name}`);
    this.logger.debug(`👤 Admin: ${dto.adminFirstName} ${dto.adminLastName} (${dto.email})`);
    
    if (platform) {
      clientInfo.deviceType = platform.toUpperCase() as any;
    }
    
    const response = await this.authService.signupOrganisation(dto, clientInfo);
    
    if (!response.success) {
      this.logger.warn(`⚠️ Organization signup failed for ${dto.name}: ${response.message}`);
      throw response;
    } else {
      this.logger.log(`✅ Organization signup successful for: ${dto.name}`);
      this.logger.debug(`[ANALYTICS] Organization registered event will include device info:`, {
        organizationUuid: response.data?.organization?.uuid,
        adminUuid: response.data?.admin?.uuid,
        deviceType: clientInfo.deviceType,
        os: clientInfo.os,
        browser: clientInfo.browser
      });
    }
    
    return response;
  }

  // ===========================================================
  // 🔐 AUTH - LOGIN
  // ===========================================================

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)  // IP-based rate limiting at gateway level
  @Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 requests per IP/minute
  @Version('1')
  @ApiTags('Auth - Login')
  @ApiOperation({ 
    summary: 'Step 1: Verify password and trigger MFA OTP',
    description: `
      First step of two-factor authentication login.
      
      **Microservice:** Auth Service
      **Authentication:** Not required
      
      ... (rest of existing documentation) ...
    `
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({ status: 200, description: 'Password correct. MFA REQUIRED.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts - rate limited' })
  async login(
    @Body() loginDto: LoginRequestDto,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`🔑 Login Stage 1 for: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  @Post('login/verify-mfa')
  @Public()
  @UseGuards(ThrottlerGuard)  // IP-based rate limiting at gateway level
@Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 requests per IP/minute
  @Version('1')
  @ApiTags('Auth - Login')
  @ApiOperation({ 
    summary: 'Step 2: Verify OTP and issue JWT cookies',
    description: `
      Completes the two-factor authentication process.
       
      **Microservice:** Auth Service
      **Authentication:** Not required (completes login)
      
      ... (rest of existing documentation) ...
    `
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'MFA Verified. User logged in and cookies issued.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async verifyMfaLogin(
    @Body() dto: VerifyOtpDto,
    @ClientInfo() clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`🛡️ MFA Login Verification for: ${dto.email}`);
    
    this.logger.log('\n🔍 VERIFY-MFA ENDPOINT - CLIENT INFO DEBUG');
    this.logger.debug('Email:', dto.email);
    this.logger.debug('Code:', dto.code);
    this.logger.debug('ClientInfo received:', JSON.stringify({
      device: clientInfo?.device,
      ipAddress: clientInfo?.ipAddress,
      userAgent: clientInfo?.userAgent,
      os: clientInfo?.os
    }, null, 2)); 
    console.log('Raw clientInfo object:', clientInfo);
    console.log('=========================================\n');
    
    const resp = await this.authService.verifyMfaLogin(dto, clientInfo, res);
    if (!resp.success) {
      this.logger.warn(`⚠️ MFA Login failed for ${dto.email}: ${resp.message}`);
      throw resp;
    } else {
      this.logger.log(`✅ MFA Login successful for: ${dto.email}`);
    }
    return resp;  
  }

  @Post('google')
@Public()
@Version('1')
@ApiTags('Auth - Login')
@ApiOperation({ 
  summary: 'Login or Register using Google OAuth token',
  description: `
    Authenticates user with Google OAuth token.
    
    **Microservice:** Auth Service
    **Authentication:** Not required (uses Google token)
    
    **Onboarding Data:**
    If the user is signing up for the first time, you can pass onboarding data 
    collected from previous screens to create a complete user profile.
    
    **Supported Onboarding Data:**
    - primaryPurpose: The user's main goal (FIND_JOB, FIND_HOUSING, etc.)
    - jobSeekerData: Profile data for job seekers
    - housingSeekerData: Profile data for housing seekers (with searchType, isLookingForRental, isLookingToBuy)
    - skilledProfessionalData: Profile data for skilled professionals
    - intermediaryAgentData: Profile data for agents
    - supportBeneficiaryData: Profile data for support beneficiaries
    - employerData: Profile data for employers
    - propertyOwnerData: Profile data for property owners (with listingType, isListingForRent, isListingForSale)
    
    **Example with Onboarding Data:**
    {
      "token": "google_id_token_here",
      "onboardingData": {
        "primaryPurpose": "FIND_HOUSING",
        "housingSeekerData": {
          "searchType": "RENT",
          "isLookingForRental": true,
          "isLookingToBuy": false,
          "minBudget": 25000,
          "maxBudget": 60000,
          "preferredCities": ["Nairobi", "Kiambu"],
          "preferredTypes": ["APARTMENT", "HOUSE"]
        }
      }
    }
  `
})
@ApiBody({ 
  type: GoogleLoginRequestDto,
  examples: {
    'Login Only': {
      summary: 'Simple login (no onboarding data)',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...'
      }
    },
    'Login with Job Seeker Onboarding': {
      summary: 'Login with job seeker profile data',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'FIND_JOB',
          jobSeekerData: {
            headline: 'Senior Full Stack Developer',
            isActivelySeeking: true,
            skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
            industries: ['FinTech', 'HealthTech'],
            jobTypes: ['FULL_TIME', 'REMOTE'],
            seniorityLevel: 'SENIOR',
            expectedSalary: 250000,
            workAuthorization: ['Citizen'],
            linkedInUrl: 'linkedin.com/in/janedoe'
          }
        }
      }
    },
    'Login with Housing Seeker Onboarding (Rent)': {
      summary: 'Login with housing seeker - looking to rent',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'FIND_HOUSING',
          housingSeekerData: {
            searchType: 'RENT',
            isLookingForRental: true,
            isLookingToBuy: false,
            minBedrooms: 2,
            maxBedrooms: 4,
            minBudget: 25000,
            maxBudget: 60000,
            preferredTypes: ['APARTMENT', 'HOUSE'],
            preferredCities: ['Nairobi', 'Kiambu'],
            preferredNeighborhoods: ['Kilimani', 'Lavington', 'Westlands'],
            moveInDate: '2026-04-15',
            householdSize: 4,
            hasPets: true,
            petDetails: 'One dog'
          }
        }
      }
    },
    'Login with Housing Seeker Onboarding (Buy)': {
      summary: 'Login with housing seeker - looking to buy',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'FIND_HOUSING',
          housingSeekerData: {
            searchType: 'BUY',
            isLookingForRental: false,
            isLookingToBuy: true,
            minBedrooms: 3,
            maxBedrooms: 5,
            minBudget: 5000000,
            maxBudget: 10000000,
            preferredTypes: ['HOUSE', 'VILLA'],
            preferredCities: ['Nairobi', 'Kiambu'],
            preferredNeighborhoods: ['Runda', 'Karen', 'Lavington'],
            householdSize: 5
          }
        }
      }
    },
    'Login with Housing Seeker Onboarding (Both)': {
      summary: 'Login with housing seeker - both rent and buy',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'FIND_HOUSING',
          housingSeekerData: {
            searchType: 'BOTH',
            isLookingForRental: true,
            isLookingToBuy: true,
            minBedrooms: 2,
            maxBedrooms: 3,
            minBudget: 30000,
            maxBudget: 50000,
            preferredTypes: ['APARTMENT', 'CONDO'],
            preferredCities: ['Nairobi'],
            preferredNeighborhoods: ['Kilimani', 'Westlands'],
            householdSize: 3
          }
        }
      }
    },
    'Login with Skilled Professional Onboarding': {
      summary: 'Login with skilled professional profile data',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'OFFER_SKILLED_SERVICES',
          skilledProfessionalData: {
            title: 'Master Electrician',
            profession: 'ELECTRICIAN',
            specialties: ['Wiring', 'Solar Installation', 'Security Systems'],
            serviceAreas: ['Nairobi', 'Kiambu', 'Machakos'],
            yearsExperience: 8,
            licenseNumber: 'EBK/1234/2020',
            hourlyRate: 800,
            availableToday: true,
            availableWeekends: true
          }
        }
      }
    },
    'Login with Agent Onboarding': {
      summary: 'Login with agent profile data',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'WORK_AS_AGENT',
          intermediaryAgentData: {
            agentType: 'HOUSING_AGENT',
            specializations: ['RESIDENTIAL', 'COMMERCIAL', 'LUXURY'],
            serviceAreas: ['Nairobi', 'Kiambu', 'Mombasa'],
            licenseNumber: 'ERB/5678/2021',
            yearsExperience: 5,
            agencyName: 'Prime Properties Agency',
            commissionRate: 5.0,
            about: 'Specializing in luxury apartments in Nairobi'
          }
        }
      }
    },
    'Login with Support Beneficiary Onboarding': {
      summary: 'Login with support beneficiary profile data',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'GET_SOCIAL_SUPPORT',
          supportBeneficiaryData: {
            needs: ['FOOD', 'SHELTER', 'MEDICAL'],
            urgentNeeds: ['FOOD'],
            familySize: 4,
            city: 'Nairobi',
            neighborhood: 'Kawangware',
            prefersAnonymity: true,
            consentToShare: false,
            languagePreference: ['ENGLISH', 'SWAHILI']
          }
        }
      }
    },
    'Login with Employer Onboarding': {
      summary: 'Login with employer profile data',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'HIRE_EMPLOYEES',
          employerData: {
            businessName: 'Njenga Tech Solutions',
            isRegistered: true,
            yearsExperience: 5,
            industry: 'Technology',
            companySize: '11-50',
            description: 'Software development and IT consulting',
            preferredSkills: ['JavaScript', 'Python', 'React', 'Node.js'],
            remotePolicy: 'HYBRID'
          }
        }
      }
    },
    'Login with Property Owner Onboarding (Rent)': {
      summary: 'Login with property owner - rental listings',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'LIST_PROPERTIES',
          propertyOwnerData: {
            listingType: 'RENT',
            isListingForRent: true,
            isListingForSale: false,
            isProfessional: false,
            propertyCount: 3,
            propertyTypes: ['APARTMENT', 'HOUSE'],
            propertyPurpose: 'INVESTMENT',
            preferredPropertyTypes: ['APARTMENT', 'HOUSE'],
            serviceAreas: ['Nairobi', 'Kiambu']
          }
        }
      }
    },
    'Login with Property Owner Onboarding (Sale)': {
      summary: 'Login with property owner - sale listings',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'LIST_PROPERTIES',
          propertyOwnerData: {
            listingType: 'SALE',
            isListingForRent: false,
            isListingForSale: true,
            isProfessional: true,
            licenseNumber: 'ERB/12345/2023',
            companyName: 'Kimani Properties Ltd',
            yearsInBusiness: 8,
            preferredPropertyTypes: ['HOUSE', 'COMMERCIAL', 'LAND'],
            serviceAreas: ['Nairobi', 'Kiambu', 'Machakos']
          }
        }
      }
    },
    'Login with Property Owner Onboarding (Both)': {
      summary: 'Login with property owner - both rent and sale',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'LIST_PROPERTIES',
          propertyOwnerData: {
            listingType: 'BOTH',
            isListingForRent: true,
            isListingForSale: true,
            isProfessional: false,
            propertyCount: 5,
            propertyTypes: ['APARTMENT', 'HOUSE', 'COMMERCIAL'],
            propertyPurpose: 'BOTH',
            preferredPropertyTypes: ['APARTMENT', 'HOUSE', 'COMMERCIAL'],
            serviceAreas: ['Nairobi', 'Kiambu']
          }
        }
      }
    },
    'Login with Just Exploring': {
      summary: 'Login with just exploring (no profile created)',
      value: {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...',
        onboardingData: {
          primaryPurpose: 'JUST_EXPLORING'
        }
      }
    }
  }
})
@ApiResponse({ 
  status: 200, 
  description: 'Login successful',
  schema: {
    example: {
      success: true,
      message: 'Authentication successful',
      code: 'OK',
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        userCode: 'USR123456789',
        accountId: '123e4567-e89b-12d3-a456-426614174001',
        email: 'user@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+254712345678',
        status: 'ACTIVE',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIs...'
      },
      error: null
    }
  }
})
@ApiResponse({ 
  status: 400, 
  description: 'Invalid Google token',
  schema: {
    example: {
      success: false,
      message: 'Invalid Google token',
      code: 'UNAUTHORIZED',
      data: null,
      error: { code: 'INVALID_TOKEN', message: 'Google token verification failed' }
    }
  }
})
@ApiResponse({ 
  status: 409, 
  description: 'Conflict - Email already registered with different method',
  schema: {
    example: {
      success: false,
      message: 'This email is already registered. Please login instead.',
      code: 'CONFLICT',
      data: null,
      error: { code: 'EMAIL_EXISTS', userExists: true }
    }
  }
})
@ApiResponse({ 
  status: 500, 
  description: 'Internal server error',
  schema: {
    example: {
      success: false,
      message: 'An error occurred during authentication',
      code: 'INTERNAL_ERROR',
      data: null,
      error: { code: 'INTERNAL', message: 'Unexpected error' }
    }
  }
})
async googleLogin(
  @Body() googleDto: GoogleLoginRequestDto,
  @ClientInfo() clientInfo: AuthClientInfoDto,
  @Res({ passthrough: true }) res: Response
): Promise<BaseResponseDto<LoginResponseDto>> {
  const { token, onboardingData } = googleDto;
  
  // Log the request
  this.logger.log(`🔑 Google Login request received`);
  this.logger.debug(`📱 Device: ${clientInfo?.device || 'Unknown'}`);
  this.logger.debug(`📍 IP: ${clientInfo?.ipAddress || 'Unknown'}`);
  
  if (onboardingData?.primaryPurpose) {
    this.logger.log(`📝 Google Login with onboarding data - Purpose: ${onboardingData.primaryPurpose}`);
    this.logger.debug(`Onboarding data: ${JSON.stringify(onboardingData, null, 2)}`);
  } else {
    this.logger.log(`📝 Google Login without onboarding data (existing user or just login)`);
  }
  
  // Call the auth service with token, client info, and onboarding data
  return this.authService.googleLogin(token, clientInfo, res, onboardingData);
}

  @Post('logout')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Version('1')
  @ApiBearerAuth()
  @ApiTags('Auth - Login')
  @ApiOperation({ 
    summary: 'Logout user and clear JWT cookies',
    description: `
      Terminates current session and clears authentication cookies.
      
      **Microservice:** Auth Service
      **Authentication:** Required (JWT cookie)
      
      ... (rest of existing documentation) ...
    `
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Res({ passthrough: true }) res: Response) {
    await this.authService.logout(res);
    return { success: true, message: 'Logged out successfully' };
  }

  // ===========================================================
  // 🔐 AUTH - TOKEN MANAGEMENT
  // ===========================================================

  @Post('refreshToken')
  @Public()
  @Version('1')
  @ApiTags('Auth - Tokens')
  @ApiOperation({ 
    summary: 'Refresh access token using refresh token',
    description: `
      Uses refresh token to obtain a new access token.
      
      **Microservice:** Auth Service
      **Authentication:** Not required (uses refresh token)
      
      ... (rest of existing documentation) ...
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
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
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

@Post('otp/request')
@Public()
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Version('1')
@ApiTags('Auth - OTP')
@ApiOperation({ 
  summary: 'Request a security code (OTP) via email',
  description: `
    Sends a verification code to the user's email for various purposes.
    
    **Microservice:** Auth Service
    **Authentication:** Not required
    
    **Purpose Types:**
    - EMAIL_VERIFICATION: Sign up new account (requires phone number)
    - ORGANIZATION_EMAIL_VERIFICATION: Organization sign up
    - LOGIN_2FA: Two-factor authentication during login
    - PASSWORD_RESET: Reset forgotten password
    - CHANGE_EMAIL: Change email address
    - CHANGE_PHONE: Change phone number
    - WITHDRAWAL: Withdraw money from wallet
    - ESCROW_RELEASE: Release escrow funds
    - PAYMENT_CONFIRM: Confirm payment
    - JOB_ACCEPT: Accept job offer
    - CONTRACT_SIGN: Sign employment contract
    - LEASE_SIGN: Sign lease agreement
    - DEPOSIT_CONFIRM: Confirm deposit payment
    - AID_RECEIPT: Confirm aid receipt
    - CASH_DISBURSEMENT: Receive cash aid
    - DELETE_ACCOUNT: Delete account confirmation
    - MFA_RECOVERY: Recover from lost MFA
    
    **Rate Limits:**
    - IP-based: 10 requests per minute (ThrottlerGuard at gateway)
    - Email-based: Purpose-specific limits (3-10 attempts per time window)
    
    **Security:**
    - No user enumeration: Returns same response for existing/non-existing emails
    - Timing attack protection: Random delays on error paths
  `
})
@ApiBody({ type: RequestOtpDto })
// ✅ REMOVE this line - don't use @ApiQuery decorator
// @ApiQuery({ type: RequestOtpQueryDto })
@ApiResponse({ 
  status: 200, 
  description: 'OTP sent successfully (or appears sent for security reasons)',
  schema: {
    example: {
      success: true,
      message: 'Verification code sent to your email',
      code: 'OK',
      data: null
    }
  }
})
@ApiResponse({ 
  status: 400, 
  description: 'Invalid purpose or request',
  schema: {
    example: {
      success: false,
      message: 'Purpose must be one of: EMAIL_VERIFICATION, ORGANIZATION_EMAIL_VERIFICATION, LOGIN_2FA, ...',
      code: 'BAD_REQUEST'
    }
  }
})
@ApiResponse({ 
  status: 429, 
  description: 'Rate limit exceeded (IP or email based)',
  schema: {
    example: {
      success: false,
      message: 'Too many attempts. Try again in 5 minutes.',
      code: 'TOO_MANY_REQUESTS'
    }
  }
})
@ApiResponse({ 
  status: 500, 
  description: 'Internal server error',
  schema: {
    example: {
      success: false,
      message: 'An error occurred while processing your request',
      code: 'INTERNAL_ERROR'
    }
  }
})
async requestOtp(
  @Body() body: RequestOtpDto,
  @Query() query: RequestOtpQueryDto  // Keep this for functionality
): Promise<BaseResponseDto<null>> {
  const { email, phone } = body;
  const { purpose } = query;
   
  this.logger.log(`📩 OTP Request [${purpose}] for: ${email}${phone ? ` with phone: ${phone}` : ''}`);
   
  try {  
    const result = await this.authService.requestOtp(
      { email, phone },   
      purpose            
    );
    
    if (!result.success) {
      this.logger.warn(`⚠️ OTP Request failed for ${email} [${purpose}]: ${result.message}`);
      return result;
    } 
    
    this.logger.log(`✅ OTP Request successful for ${email} [${purpose}]`);
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`❌ OTP Request error for ${email} [${purpose}]: ${errorMessage}`);
    
    return BaseResponseDto.fail(
      'An error occurred while processing your request',
      'INTERNAL_ERROR',
      { code: 'INTERNAL', message: errorMessage }
    );
  }
}

  @Post('otp/verify')
  @Public()
  @Version('1')
  @ApiTags('Auth - OTP')
  @ApiOperation({ 
    summary: 'Verify a security code',
    description: `
      Validates an OTP code for a specific purpose.
      
      **Microservice:** Auth Service
      **Authentication:** Not required
      
      ... (rest of existing documentation) ...
    `
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiQuery({ name: 'purpose', required: true, enum: ['signup', 'login', 'password-reset', 'email-verify'] })
  @ApiResponse({ status: 200, description: 'OTP verification result' })
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

  @Post('password/forgot')
  @Public()
  @Version('1')
  @ApiTags('Auth - Password')
  @ApiOperation({ 
    summary: 'Step 1: Request a password reset OTP',
    description: `
      Initiates password reset flow by sending OTP to email.
      
      **Microservice:** Auth Service
      **Authentication:** Not required
      
      ... (rest of existing documentation) ...
    `
  })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({ status: 200, description: 'Reset code sent if account exists' })
  async requestPasswordReset(
    @Body() dto: RequestOtpDto
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`🔑 Password reset requested for: ${dto.email}`);
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password/reset')
  @Public()
  @UseGuards(ThrottlerGuard)  
  @Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 requests per IP/minute
  @Version('1')
  @ApiTags('Auth - Password')
  @ApiOperation({ 
    summary: 'Step 2: Submit new password using the OTP code',
    description: `
      Completes password reset flow with new password.
      
      **Microservice:** Auth Service
      **Authentication:** Not required
      
      ... (rest of existing documentation) ...
    `
  })  
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
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

  @Delete('session')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
      
      ... (rest of existing documentation) ...
    `
  })
  @ApiQuery({ name: 'tokenId', required: false })
  @ApiQuery({ name: 'userUuid', required: false })
  @ApiResponse({ status: 200, description: 'Sessions revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot revoke other users\' sessions' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(
    @Req() req: JwtRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('tokenId') tokenId?: string,
    @Query('userUuid') targetUserUuid?: string,
  ): Promise<BaseResponseDto<null>> {
    // ... existing implementation remains exactly the same
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

  @Get('sessions/active')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
      
      ... (rest of existing documentation) ...
    `
  })
  @ApiQuery({ name: 'userUuid', required: false })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved', type: [SessionDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot view other users\' sessions' })
  async getActiveSessions(
    @Req() req: JwtRequest,
    @Query('userUuid') targetUserUuid?: string, 
  ): Promise<BaseResponseDto<SessionDto[]>> {
    // ... existing implementation remains exactly the same
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