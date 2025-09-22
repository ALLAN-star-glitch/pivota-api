// Import NestJS utilities for creating custom parameter decorators
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Import request-ip library for extracting client IP addresses
import * as requestIp from 'request-ip';

// Import ua-parser-js library for parsing user-agent strings
import * as UAParser from 'ua-parser-js';

// Define a custom parameter decorator called ClientInfo
export const ClientInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // Get the incoming HTTP request object from the execution context
    const request = ctx.switchToHttp().getRequest();

    // Extract client IP address (fallback to request.ip if library fails)
    const ip = requestIp.getClientIp(request) || request.ip;

    // Extract raw User-Agent string from request headers
    const userAgent = request.headers['user-agent'] || '';

    // Initialize UAParser with the User-Agent string
    const parser = new UAParser.UAParser(userAgent);

    // Return structured client info object
    return {
      ipAddress: ip, // Client's IP address
      userAgent,     // Full User-Agent string
      device: parser.getDevice().model       // Device model if available
              || parser.getDevice().type     // or device type (mobile, tablet, etc.)
              || 'Unknown',                  // fallback if none found
      //browser: parser.getBrowser().name || 'Unknown', // Browser name
      os: parser.getOS().name || 'Unknown',           // Operating system name
    };
  },
);
