/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/auth-service/src/consumers/account.consumer.ts

import { Controller, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka, EventPattern, Payload } from '@nestjs/microservices';
import { ExtendedPrismaClient, PrismaService } from '../prisma/prisma.service';

@Controller()
export class AccountConsumer implements OnModuleInit {
  private readonly logger = new Logger(AccountConsumer.name);
  private readonly prisma: ExtendedPrismaClient;

  constructor(
    private readonly prismaService: PrismaService,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {
    console.log('🔥🔥🔥 AccountConsumer CONSTRUCTOR called 🔥🔥🔥');
    this.logger.log('AccountConsumer constructor - initializing');
    this.prisma = this.prismaService.prisma;
  }

  async onModuleInit() {
    console.log('🔥🔥🔥 AccountConsumer onModuleInit STARTED 🔥🔥🔥');
    this.logger.log('✅ AccountConsumer initialized, listening for events');
    this.logger.log('📡 Subscribed to topics:');
    this.logger.log('   - account.created');
    this.logger.log('   - account.status.updated');
    this.logger.log('   - organization.member.added');
    this.logger.log('   - organization.member.status.updated');
    
    // Subscribe to topics
    this.kafkaClient.subscribeToResponseOf('account.created');
    this.kafkaClient.subscribeToResponseOf('account.status.updated');
    this.kafkaClient.subscribeToResponseOf('organization.member.added');
    this.kafkaClient.subscribeToResponseOf('organization.member.status.updated');
    
    console.log('🔥🔥🔥 AccountConsumer onModuleInit COMPLETED 🔥🔥🔥');
  }

  /**
   * Handle account.created event from Profile Service
   * Creates credential entry for new user accounts
   */
// In account.consumer.ts - update handleAccountCreated


@EventPattern('account.created')
async handleAccountCreated(@Payload() message: any) {
  this.logger.log(`📥 Received account.created event`);
  this.logger.debug(`Event payload: ${JSON.stringify(message)}`);
  
  try {
    // Extract data from message
    let data = message;
    if (message && message.data) {
      data = message.data;
    }
    
    if (!data || !data.userUuid) {
      this.logger.error('Invalid account.created event: missing userUuid');
      return;
    }

    this.logger.log(`Processing account creation for user: ${data.userUuid}, email: ${data.email}`);

    // Check if credential already exists
    const existingCredential = await this.prisma.credential.findUnique({
      where: { userUuid: data.userUuid }
    });

    if (existingCredential) {
      // Update existing credential
      await this.prisma.credential.update({
        where: { userUuid: data.userUuid },
        data: {
          accountUuid: data.accountUuid,
          email: data.email,
          phone: data.phone || null,
          accountStatus: data.accountStatus,
          role: data.role || 'GeneralUser',
          memberStatus: data.accountType === 'ORGANIZATION' ? 'ACTIVE' : null,  
          updatedAt: new Date(),
        },
      });
      this.logger.log(`✅ Credential updated for user: ${data.userUuid}`);
    } else {
      // Create new credential
      await this.prisma.credential.create({
        data: {
          userUuid: data.userUuid,
          accountUuid: data.accountUuid,
          email: data.email,
          phone: data.phone || null,
          passwordHash: null,
          mfaEnabled: true,
          accountStatus: data.accountStatus,
          role: data.role || 'GeneralUser',
          memberStatus: data.accountType === 'ORGANIZATION' ? 'ACTIVE' : null,
        },
      });
      this.logger.log(`✅ Credential created for user: ${data.userUuid}`);
    }

  } catch (error) {
    this.logger.error(`Failed to process account.created event: ${error.message}`);
    this.logger.error(error.stack);
  }
}

  /**
   * Handle account.status.updated event from Profile Service
   * Updates account status for all credentials under an account
   */
  @EventPattern('account.status.updated')
  async handleAccountStatusUpdated(@Payload() message: any) {
    this.logger.log(`📥 Received account.status.updated event`);
    this.logger.debug(`Event payload: ${JSON.stringify(message)}`);
    
    try {
      const { data } = message;
      
      if (!data || !data.accountUuid) {
        this.logger.error('Invalid account.status.updated event: missing accountUuid');
        return;
      }

      this.logger.log(`Updating status for account: ${data.accountUuid} to ${data.status}`);

      const result = await this.prisma.credential.updateMany({
        where: { accountUuid: data.accountUuid },
        data: { accountStatus: data.status }
      });
      
      this.logger.log(`✅ Updated ${result.count} credentials for account ${data.accountUuid} to status: ${data.status}`);
      
    } catch (error) {
      this.logger.error(`Failed to process account.status.updated event: ${error.message}`);
    }
  }

  /**
   * Handle organization.member.added event from Profile Service
   * Creates or updates credential for organization member
   */
  @EventPattern('organization.member.added')
  async handleOrganizationMemberAdded(@Payload() message: any) {
    this.logger.log(`📥 Received organization.member.added event`);
    this.logger.debug(`Event payload: ${JSON.stringify(message)}`);
    
    try {
      const { data } = message;
      
      if (!data || !data.userUuid) {
        this.logger.error('Invalid organization.member.added event: missing userUuid');
        return;
      }

      this.logger.log(`Processing organization member addition for user: ${data.userUuid}`);

      const existingCredential = await this.prisma.credential.findUnique({
        where: { userUuid: data.userUuid }
      });

      if (existingCredential) {
        await this.prisma.credential.update({
          where: { userUuid: data.userUuid },
          data: {
            accountUuid: data.accountUuid,
            memberStatus: data.memberStatus || 'ACTIVE',
          }
        });
        this.logger.log(`✅ Credential updated for organization member: ${data.userUuid}`);
      } else {
        await this.prisma.credential.create({
          data: {
            userUuid: data.userUuid,
            accountUuid: data.accountUuid,
            email: data.email,
            phone: data.phone || null,
            passwordHash: null,
            mfaEnabled: true,
            accountStatus: data.accountStatus || 'ACTIVE',
            memberStatus: data.memberStatus || 'ACTIVE',
          }
        });
        this.logger.log(`✅ Credential created for organization member: ${data.userUuid}`);
      }
      
    } catch (error) {
      this.logger.error(`Failed to process organization.member.added event: ${error.message}`);
    }
  }

  /**
   * Handle organization.member.status.updated event from Profile Service
   * Updates member status for organization members
   */
  @EventPattern('organization.member.status.updated')
  async handleOrganizationMemberStatusUpdated(@Payload() message: any) {
    this.logger.log(`📥 Received organization.member.status.updated event`);
    this.logger.debug(`Event payload: ${JSON.stringify(message)}`);
    
    try {
      const { data } = message;
      
      if (!data || !data.userUuid) {
        this.logger.error('Invalid organization.member.status.updated event: missing userUuid');
        return;
      }

      this.logger.log(`Updating member status for user: ${data.userUuid} to ${data.status}`);

      await this.prisma.credential.update({
        where: { userUuid: data.userUuid },
        data: { memberStatus: data.status }
      });
      
      this.logger.log(`✅ Member status updated for user: ${data.userUuid}`);
      
    } catch (error) {
      this.logger.error(`Failed to process organization.member.status.updated event: ${error.message}`);
    }
  }
}