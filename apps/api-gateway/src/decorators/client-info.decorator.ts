import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthClientInfoDto } from '@pivota-api/dtos';
import * as requestIp from 'request-ip';
import * as UAParser from 'ua-parser-js';

export const ClientInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthClientInfoDto => {
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
    
    // Enhanced browser detection
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

    // Android app detection (OkHttp, Retrofit, or custom Android app)
    const isAndroidApp = /okhttp|retrofit|android|nativeapp/i.test(userAgent);
    
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
      // ✅ PRIORITY 1: Check custom headers FIRST (most reliable)
      const deviceTypeHeader = request.headers['x-device-type'];
      const isTabletHeader = request.headers['x-is-tablet'];
      const isMobileHeader = request.headers['x-is-mobile'];
      
      if (deviceTypeHeader) {
        // Use explicit device type from client
        const headerValue = deviceTypeHeader.toString().toUpperCase();
        deviceType = headerValue as any;
        isMobile = deviceType === 'MOBILE';
        isTablet = deviceType === 'TABLET';
        isDesktop = deviceType === 'DESKTOP';
        
        console.log(`✅ Using header device type: ${deviceType}`);
      } 
      else if (isTabletHeader !== undefined) {
        // Use explicit isTablet boolean
        isTablet = isTabletHeader === 'true';
        isMobile = !isTablet;
        deviceType = isTablet ? 'TABLET' : 'MOBILE';
        
        console.log(`✅ Using isTablet header: ${isTablet}`);
      }
      else if (isMobileHeader !== undefined) {
        // Use explicit isMobile boolean
        isMobile = isMobileHeader === 'true';
        isTablet = !isMobile;
        deviceType = isMobile ? 'MOBILE' : 'TABLET';
        
        console.log(`✅ Using isMobile header: ${isMobile}`);
      }
      else if (isAndroidApp) {
        // Only fall back to Android app detection if no device type headers
        deviceType = 'MOBILE';
        isMobile = true;
        
        console.log(`⚠️ No device headers, defaulting Android app to MOBILE`);
      } 
      else {
        // ✅ PRIORITY 2: Fall back to UA parsing for web browsers
        const device = uaResult.device;
        
        // Special handling for Android emulators (often misidentified)
        const isEmulator = userAgent.includes('Android') && 
                          (userAgent.includes('sdk_gphone') || 
                           userAgent.includes('Generic') || 
                           userAgent.includes('Emulator') ||
                           userAgent.includes('Ranchu'));
        
        if (isEmulator) {
          // Emulators are typically phones, not tablets
          deviceType = 'MOBILE';
          isMobile = true;
          console.log(`📱 Detected emulator, setting as MOBILE`);
        }
        else if (device.type === 'mobile') {
          deviceType = 'MOBILE';
          isMobile = true;
          console.log(`📱 UA detected as MOBILE`);
        } 
        else if (device.type === 'tablet') {
          deviceType = 'TABLET';
          isTablet = true;
          console.log(`📱 UA detected as TABLET`);
        } 
        else {
          // Check user agent for mobile indicators
          if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(userAgent)) {
            deviceType = 'MOBILE';
            isMobile = true;
            console.log(`📱 UA regex detected as MOBILE`);
          } else {
            deviceType = 'DESKTOP';
            isDesktop = true;
            console.log(`💻 Detected as DESKTOP`);
          }
        }
      }
    }
    
    // ✅ Android app override: trust client headers completely if present
    const deviceTypeHeader = request.headers['x-device-type'];
    if (isAndroidApp && deviceTypeHeader) {
      const forcedDeviceType = deviceTypeHeader.toString().toUpperCase();
      deviceType = forcedDeviceType as any;
      isMobile = forcedDeviceType === 'MOBILE';
      isTablet = forcedDeviceType === 'TABLET';
      isDesktop = forcedDeviceType === 'DESKTOP';
      
      console.log(`🤖 Android app override: forcing ${forcedDeviceType}`);
    }
    
    // Get device name
    let device = deviceHeader 
      || uaResult.device.model 
      || (deviceType === 'MOBILE' ? 'Mobile Device' 
          : deviceType === 'TABLET' ? 'Tablet' 
          : deviceType === 'DESKTOP' ? 'Computer' 
          : 'Unknown Device');
    
    // Override device name for Android apps
    if (isAndroidApp) {
      if (isTablet) {
        device = deviceHeader || 'Android Tablet';
      } else if (isMobile) {
        device = deviceHeader || 'Android Phone';
      }
    }
    
    // Get OS info - prioritize Android for apps
    let os = osHeader || uaResult.os.name || 'Unknown OS';
    let osVersion = osVersionHeader || uaResult.os.version || undefined;
    
    // If it's an Android app but OS wasn't detected, set it
    if (isAndroidApp && os === 'Unknown OS') {
      os = 'Android';
      // Try to extract Android version from user agent
      const androidVersionMatch = userAgent.match(/Android\s([0-9.]+)/);
      if (androidVersionMatch && !osVersion) {
        osVersion = androidVersionMatch[1];
      }
    }

    // For Android apps, set browser to 'Native App' if no browser detected
    if (isAndroidApp && (!browserName || browserName === 'Unknown')) {
      browserName = 'Native App';
    }

    // Comprehensive debug logging
    console.log(`📊 Client Info Summary:`, {
      deviceType,
      isTablet,
      isMobile,
      isAndroidApp,
      device,
      os,
      browser: browserName,
      hasDeviceTypeHeader: !!request.headers['x-device-type'],
      hasIsTabletHeader: !!request.headers['x-is-tablet'],
      userAgentPreview: userAgent.substring(0, 100)
    });

    return {
      ipAddress: ip,
      userAgent,
      device,
      deviceType,
      os,
      osVersion,
      browser: browserName || 'Unknown',
      browserVersion: browserVersion || undefined,
      isTablet,
      isDesktop,
      isBot,
    };
  },
);