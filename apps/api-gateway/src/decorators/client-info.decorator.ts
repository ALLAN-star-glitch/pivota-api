import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as requestIp from 'request-ip';
import * as UAParser from 'ua-parser-js';

export const ClientInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // IP extraction
    let ip = requestIp.getClientIp(request) || request.ip;
    if (ip === '::1' || ip === '127.0.0.1') {
      ip = 'localhost';
    }

    // Headers
    const userAgent = request.headers['user-agent'] || 'PostmanRuntime';
    const deviceHeader = request.headers['x-device'] || '';
    const osHeader = request.headers['x-os'] || '';

    const parser = new UAParser.UAParser(userAgent);
    const device = deviceHeader
      || parser.getDevice().model
      || parser.getDevice().type
      || 'Unknown Device';
    const os = osHeader || parser.getOS().name || 'Unknown OS';

    return {
      ipAddress: ip,
      userAgent,
      device,
      os,
    };
  },
);
