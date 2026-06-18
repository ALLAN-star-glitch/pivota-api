/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Body,
  Controller,
  Logger,
  Post,
  Version,
  UseGuards,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { OnboardingGatewayService } from './onboarding-gateway.service';
import {
  UserSignupRequestDto,
  BaseResponseDto,
  SignupResponseDto,
  AuthClientInfoDto,
  OrganisationSignupRequestDto,
  OrganizationSignupDataDto,
} from '@pivota-api/dtos';
import { ClientInfo } from '../../decorators/client-info.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiExtraModels,
  ApiHeader,
} from '@nestjs/swagger';
import { Public } from '../../decorators/public.decorator';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { TimeoutInterceptor } from '@pivota-api/interceptors';

@ApiTags('Individual Onboarding')
@ApiExtraModels(
  BaseResponseDto,
  SignupResponseDto,
  UserSignupRequestDto,
  OrganizationSignupDataDto,
  OrganisationSignupRequestDto,
)
@Controller('authentication-onboarding')
@UseInterceptors(TimeoutInterceptor)
export class OnboardingGatewayController {
  private readonly logger = new Logger(OnboardingGatewayController.name);

  constructor(
    private readonly onboardingService: OnboardingGatewayService,
  ) {} 
 
  // ===========================================================
  // 📝 ONBOARDING - INDIVIDUAL SIGNUP
  // ===========================================================

  @Post('signup')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Version('1')
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
      
      **Microservice:** Onboarding Service
      **Authentication:** Not required (public)
      
      **Assigned Role:** Individual users receive the \`Individual\` role.
      
      **Flow:**
      1. User provides registration details + OTP code
      2. System verifies OTP
      3. Creates account and user profile
      4. Creates purpose-specific profile (if provided)
      5. Generates JWT tokens
      6. Returns tokens for auto-login
      
      **Profile Types:**
      - FIND_JOB → JobSeekerProfile
      - OFFER_SKILLED_SERVICES → SkilledProfessionalProfile
      - WORK_AS_AGENT → IntermediaryAgentProfile
      - FIND_HOUSING → HousingSeekerProfile
      - GET_SOCIAL_SUPPORT → SupportBeneficiaryProfile
      - HIRE_EMPLOYEES → EmployerProfile
      - LIST_PROPERTIES → PropertyOwnerProfile
      - JUST_EXPLORING → No profile created
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
          message: 'Signup successful',
          accessToken: 'eyJhbGciOiJIUzI1NiIs...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
          redirectTo: '/dashboard'
        }
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
    description: 'Service Unavailable - Profile service unavailable'
  })
  async signup(
    @Body() signupDto: UserSignupRequestDto,
    @ClientInfo() clientInfo: AuthClientInfoDto,
    @Headers('referer') referer?: string,
  ): Promise<BaseResponseDto<SignupResponseDto>> {
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

    const response = await this.onboardingService.signup(signupDto, clientInfo);

    if (!response.success) {
      this.logger.warn(`⚠️ Signup failed for ${signupDto.email}: ${response.message}`);
      throw response;
    }

    this.logger.log(`✅ Signup successful for: ${signupDto.email}`);
    return response;
  }

  // ===========================================================
  // 📝 ONBOARDING - ORGANIZATION SIGNUP
  // ===========================================================

  @Post('signup/organization')
  @Public()
  @Version('1')
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
  @ApiOperation({
    summary: 'Register a new organisation',
    description: `
      Creates a new organization account in the system.
      
      **Microservice:** Onboarding Service
      **Authentication:** Not required (public)
      
      **Flow:**
      1. User provides organization details + OTP code
      2. System verifies OTP
      3. Creates organization account
      4. Creates admin user profile
      5. Generates JWT tokens for auto-login
      6. Returns tokens and organization details
      
      **Organization Types:**
      - COMPANY: For-profit business
      - NON_PROFIT: Non-profit organization
      - NGO: Non-governmental organization
      - SOCIAL_ENTERPRISE: Social enterprise
      - GOVERNMENT: Government agency
      - OTHER: Other organization type
    `
  })
  @ApiBody({
    type: OrganisationSignupRequestDto,
    examples: {
      'Company Registration': {
        summary: 'Register a company',
        value: {
          name: 'Acme Technologies Ltd',
          officialEmail: 'info@acmetech.com',
          officialPhone: '0201234567',
          physicalAddress: '123 Mombasa Road, Nairobi',
          organizationType: 'COMPANY',
          email: 'admin@acmetech.com',
          password: 'SecurePass123',
          phone: '0712345678',
          adminFirstName: 'John',
          adminLastName: 'Doe',
          code: '123456',
          planSlug: 'free-forever',
          registrationNo: 'CP/2020/12345',
          kraPin: 'A123456789Z',
          website: 'https://acmetech.com',
          about: 'Leading technology solutions provider in East Africa',
          purposes: ['HIRE_EMPLOYEES', 'LIST_PROPERTIES']
        }
      },
      'NGO Registration': {
        summary: 'Register a non-governmental organization',
        value: {
          name: 'Hope Foundation Kenya',
          officialEmail: 'info@hopefoundation.ke',
          officialPhone: '0209876543',
          physicalAddress: '456 Ngong Road, Nairobi',
          organizationType: 'NGO',
          email: 'admin@hopefoundation.ke',
          password: 'SecurePass123',
          phone: '0723456789',
          adminFirstName: 'Mary',
          adminLastName: 'Njeri',
          code: '123456',
          planSlug: 'free-forever',
          registrationNo: 'NGO/2020/67890',
          kraPin: 'B987654321Z',
          website: 'https://hopefoundation.ke',
          about: 'Empowering communities through education and healthcare',
          purposes: ['GET_SOCIAL_SUPPORT', 'HIRE_EMPLOYEES']
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Organisation signed up successfully',
    schema: {
      example: {
        success: true,
        message: 'Organization and Admin User created successfully',
        code: 'CREATED',
        data: {
          message: 'Organization created successfully',
          accessToken: 'eyJhbGciOiJIUzI1NiIs...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
          redirectTo: '/dashboard',
          organization: {
            id: '1',
            uuid: 'org-123e4567-e89b-12d3-a456-426614174000',
            name: 'Acme Technologies Ltd',
            orgCode: 'ORG123456789',
            verificationStatus: 'PENDING',
            type: 'COMPANY',
            officialEmail: 'info@acmetech.com',
            officialPhone: '0201234567',
            physicalAddress: '123 Mombasa Road, Nairobi',
            website: 'https://acmetech.com',
            about: 'Leading technology solutions provider in East Africa',
            logo: null
          },
          admin: {
            uuid: 'admin-123e4567-e89b-12d3-a456-426614174001',
            email: 'admin@acmetech.com',
            roleName: 'OrganizationAdmin',
            userCode: 'USR123456789',
            firstName: 'John',
            lastName: 'Doe',
            phone: '0712345678'
          },
          account: {
            uuid: 'acc-123e4567-e89b-12d3-a456-426614174002',
            type: 'ORGANIZATION',
            accountCode: 'ACC123456789'
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid input data'
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Organization with same email already exists'
  })
  @ApiResponse({
    status: 410,
    description: 'OTP expired or invalid'
  })
  @ApiResponse({
    status: 429,
    description: 'Too many attempts - Rate limited'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  async signupOrganisation(
    @Body() dto: OrganisationSignupRequestDto,
    @ClientInfo() clientInfo: AuthClientInfoDto,
    @Headers('x-platform') platform?: string,
    @Headers('referer') referer?: string,
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
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
    this.logger.debug(`📋 Organization Type: ${dto.organizationType || 'Not specified'}`);
    this.logger.debug(`🎯 Purposes: ${dto.purposes?.join(', ') || 'None'}`);

    if (platform) {
      clientInfo.deviceType = platform.toUpperCase() as any;
    }

    const response = await this.onboardingService.signupOrganisation(dto, clientInfo);

    if (!response.success) {
      this.logger.warn(`⚠️ Organization signup failed for ${dto.name}: ${response.message}`);
      throw response;
    }

    this.logger.log(`✅ Organization signup successful for: ${dto.name}`);
    this.logger.debug(`[ANALYTICS] Organization registered event will include device info:`, {
      organizationUuid: response.data?.organization?.uuid,
      adminUuid: response.data?.admin?.uuid,
      deviceType: clientInfo.deviceType,
      os: clientInfo.os,
      browser: clientInfo.browser
    });

    return response;
  }
}