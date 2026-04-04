// libs/shared/redis/src/shared-redis.module.ts
import { Module, Global, Logger, DynamicModule } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { QueueService } from './queue.service';

@Global()
@Module({})
export class SharedRedisModule {
  private static readonly logger = new Logger('SharedRedisModule');
  private static redisConnection: Redis | null = null;

  static forRoot(): DynamicModule {
    const config = {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379'),
      password: process.env['REDIS_PASSWORD'],
      db: parseInt(process.env['REDIS_DB'] || '0'),
      tls: process.env['REDIS_TLS'] === 'true' ? {} : undefined,
    };

    SharedRedisModule.logger.log(
      `Connecting to Redis at ${config.host}:${config.port} (DB: ${config.db})`
    );

    // IMPORTANT: For BullMQ workers, maxRetriesPerRequest MUST be null
    const redisConnection = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      tls: config.tls,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        SharedRedisModule.logger.warn(
          `Redis reconnecting... attempt ${times}, delay: ${delay}ms`
        );
        return delay;
      },
      maxRetriesPerRequest: null,  // ← CHANGE THIS from 3 to null
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisConnection.on('connect', () => {
      SharedRedisModule.logger.log('✅ Redis connected successfully');
    });

    redisConnection.on('ready', () => {
      SharedRedisModule.logger.log('✅ Redis is ready');
    });

    redisConnection.on('error', (err) => {
      SharedRedisModule.logger.error(`❌ Redis error: ${err.message}`);
    });

    redisConnection.on('close', () => {
      SharedRedisModule.logger.warn('⚠️ Redis connection closed');
    });

    redisConnection.on('reconnecting', () => {
      SharedRedisModule.logger.warn('🔄 Redis reconnecting...');
    });

    SharedRedisModule.redisConnection = redisConnection;

    return {
      module: SharedRedisModule,
      providers: [
        {
          provide: 'REDIS_CONNECTION',
          useValue: redisConnection,
        },
        RedisService,
        QueueService,
      ],
      exports: ['REDIS_CONNECTION', RedisService, QueueService],
    };
  }

  static getRedisConnection(): Redis | null {
    return SharedRedisModule.redisConnection;
  }

  static async closeConnection(): Promise<void> {
    if (SharedRedisModule.redisConnection) {
      await SharedRedisModule.redisConnection.quit();
      SharedRedisModule.logger.log('🔌 Redis connection closed');
    }
  }
}