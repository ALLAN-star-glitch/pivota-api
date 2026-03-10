import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as requestIp from 'request-ip';
import * as UAParser from 'ua-parser-js';

export interface ClientInfoDto {
  ipAddress: string;
  userAgent: string;
  device: string;
  deviceType: 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | 'UNKNOWN';
  os: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isBot: boolean;
}

export const ClientInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClientInfoDto => {
    const request = ctx.switchToHttp().getRequest();

    // IP extraction
    let ip = requestIp.getClientIp(request) || request.ip || request.connection?.remoteAddress;
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
      ip = 'localhost';
    }

    const userAgent = request.headers['user-agent'] || 'Unknown';
    
    // Parse user agent
    const parser = new UAParser.UAParser(userAgent);
    const uaResult = parser.getResult();
    
    // Enhanced browser detection for Chrome
    let browserName = uaResult.browser.name;
    let browserVersion = uaResult.browser.version;
    
    // Manual Chrome detection if parser fails
    if (!browserName && userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      const chromeMatch = userAgent.match(/Chrome\/([0-9.]+)/);
      if (chromeMatch) {
        browserVersion = chromeMatch[1];
      }
    }
    
    // Manual Safari detection
    if (!browserName && userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari';
      const safariMatch = userAgent.match(/Version\/([0-9.]+)/);
      if (safariMatch) {
        browserVersion = safariMatch[1];
      }
    }
    
    // Manual Firefox detection
    if (!browserName && userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      const firefoxMatch = userAgent.match(/Firefox\/([0-9.]+)/);
      if (firefoxMatch) {
        browserVersion = firefoxMatch[1];
      }
    }
    
    // Manual Edge detection
    if (!browserName && userAgent.includes('Edg')) {
      browserName = 'Edge';
      const edgeMatch = userAgent.match(/Edg\/([0-9.]+)/);
      if (edgeMatch) {
        browserVersion = edgeMatch[1];
      }
    }

    // Get device info from headers or parse
    const deviceHeader = request.headers['x-device'] || '';
    const osHeader = request.headers['x-os'] || '';
    const osVersionHeader = request.headers['x-os-version'] || '';
    
    // Determine device type
    let deviceType: 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | 'UNKNOWN' = 'UNKNOWN';
    let isMobile = false;
    let isTablet = false;
    let isDesktop = false;
    let isBot = false;
    
    // Enhanced bot detection
    const botPatterns = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebot|ia_archiver|twitterbot|whatsapp|telegram|postman|insomnia|swagger/i;
    if (botPatterns.test(userAgent)) {
      deviceType = 'BOT';
      isBot = true;
    } else {
      const deviceTypeHeader = request.headers['x-device-type'] || '';
      
      if (deviceTypeHeader) {
        deviceType = deviceTypeHeader.toUpperCase() as any;
        isMobile = deviceType === 'MOBILE';
        isTablet = deviceType === 'TABLET';
        isDesktop = deviceType === 'DESKTOP';
      } else {
        const device = uaResult.device;
        
        if (device.type === 'mobile') {
          deviceType = 'MOBILE';
          isMobile = true;
        } else if (device.type === 'tablet') {
          deviceType = 'TABLET';
          isTablet = true;
        } else {
          // Check user agent for mobile indicators
          if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(userAgent)) {
            deviceType = 'MOBILE';
            isMobile = true;
          } else {
            deviceType = 'DESKTOP';
            isDesktop = true;
          }
        }
      }
    }
    
    // Get device name
    const device = deviceHeader 
      || uaResult.device.model 
      || (deviceType === 'MOBILE' ? 'Mobile Device' 
          : deviceType === 'TABLET' ? 'Tablet' 
          : deviceType === 'DESKTOP' ? 'Computer' 
          : 'Unknown Device');
    
    // Get OS info
    const os = osHeader || uaResult.os.name || 'Unknown OS';
    const osVersion = osVersionHeader || uaResult.os.version || undefined;

    return {
      ipAddress: ip,
      userAgent,
      device,
      deviceType,
      os,
      osVersion,
      browser: browserName || 'Unknown',
      browserVersion: browserVersion || undefined,
      isMobile,
      isTablet,
      isDesktop,
      isBot,
    };
  },
);