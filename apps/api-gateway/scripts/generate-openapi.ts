// apps/api-gateway/scripts/generate-openapi.ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';

// Use dynamic import for AppModule
async function generate() {
  try {
    console.log('🔄 Generating OpenAPI specification...');
    
    // Import AppModule dynamically
    const { AppModule } = await import('../src/app/app.module');
    
    console.log('✅ AppModule imported successfully');
    
    const app = await NestFactory.create(AppModule, { 
      logger: ['error', 'warn'] 
    });
    
    const config = new DocumentBuilder()
      .setTitle('PivotaConnect API')
      .setDescription('Complete API documentation for all PivotaConnect microservices')
      .setVersion('1.0')
      
      // Add all your tags from main.ts
      .addTag('Housing', 'All housing-related endpoints')
      .addTag('Jobs', 'All job-related endpoints')
      .addTag('Auth', 'Authentication endpoints')
      .addTag('User Profile', 'User profile management')
      .addTag('Organisation', 'Organization management')
      .addTag('Contractors', 'Service provider management')
      .addTag('RBAC', 'Role-Based Access Control')
      .addTag('Plans', 'Subscription plans')
      .addTag('Subscriptions', 'User subscriptions')
      .addTag('Registry', 'Cross-vertical listing registry')
      .addTag('Categories', 'Category management')
      .addTag('Housing - Discovery', 'Public endpoints for searching and viewing house listings')
      .addTag('Housing - Management', 'Create, update, and manage your own listings')
      .addTag('Housing - Admin', 'Administrative controls for all housing data')
      .addTag('Jobs - Management', 'Create, update, and manage your job postings')
      .addTag('Jobs - Applications', 'Submit and track job applications')
      .addTag('Jobs - Admin', 'Administrative controls for all job data')
      .addTag('Jobs - Public', 'Public job search and discovery')
      .addTag('Auth - Registration', 'User and organization registration')
      .addTag('Auth - Login', 'Authentication endpoints')
      .addTag('Auth - OTP', 'One-time password verification')
      .addTag('Auth - Password', 'Password management')
      .addTag('Auth - Sessions', 'Session management')
      .addTag('Profile - My Profile', 'Manage your own profile')
      .addTag('Profile - Admin', 'Administrative profile management')
      .addTag('Profile - Provider', 'Service provider profiles')
      .addTag('Profile - Job Seeker', 'Job seeker profiles')
      .addTag('Organisation - Profile', 'Organization details')
      .addTag('Organisation - Team', 'Team member management')
      .addTag('Organisation - Invitations', 'Invitation management')
      .addTag('Organisation - Provider', 'Organization provider onboarding')
      .addTag('Contractors - Services', 'Create and manage service offerings')
      .addTag('Contractors - Discovery', 'Discover service providers')
      .addTag('RBAC - Roles', 'Role management')
      .addTag('RBAC - Permissions', 'Permission management')
      .addTag('RBAC - Assignments', 'Role assignments')
      .addTag('Plans - Public', 'View available plans')
      .addTag('Plans - Admin', 'Plan management')
      .addTag('Subscriptions - Management', 'Manage subscriptions')
      .addTag('Subscriptions - Access', 'Check module access')
      .addTag('Registry - My Portfolio', 'View your listings across all verticals')
      .addTag('Registry - Admin', 'Administrative registry')
      .addTag('Categories - Public', 'Public category discovery')
      .addTag('Categories - Admin', 'Category management')
      .build();
      
    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
      ignoreGlobalPrefix: true,
    });
    
    // Save to a file
    const outputPath = path.resolve(process.cwd(), 'apps/api-gateway/openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    
    console.log(`✅ OpenAPI JSON generated at: ${outputPath}`);
    
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to generate OpenAPI:', error);
    process.exit(1);
  }
} 

generate();