/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS_CONNECTION') private readonly redis: Redis) {}

  // ==================== STRING OPERATIONS ====================
  
  /**
   * Get a string value by key
   */
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  /**
   * Get a number value by key
   */
  async getNumber(key: string): Promise<number | null> {
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : null;
  }

  /**
   * Set a string value with optional TTL
   */
  async set(key: string, value: string | number, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, String(value), 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, String(value));
    }
  }

  /**
   * Set with expiration (alias for set with TTL)
   */
  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  // ==================== OBJECT OPERATIONS ====================
  
  /**
   * Store an object as JSON
   */
  async setObject(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.set(key, stringValue, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, stringValue);
    }
  }

  /**
   * Retrieve an object from JSON
   */
  async getObject<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return null;
  }

  // ==================== COUNTER OPERATIONS ====================
  
  /**
   * Increment a key and set expiration on first increment
   * Perfect for rate limiting
   */
  async incrementWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    return count;
  }

  /**
   * Simple increment without expiration
   */
  async increment(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  /**
   * Decrement a key
   */
  async decrement(key: string): Promise<number> {
    return await this.redis.decr(key);
  }

  // ==================== KEY MANAGEMENT ====================
  
  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Delete a single key
   */
  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern = '*'): Promise<string[]> {
    return await this.redis.keys(pattern);
  }

  // ==================== TTL OPERATIONS ====================
  
  /**
   * Set expiration on a key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(key, ttlSeconds);
  }

  /**
   * Get remaining TTL in seconds
   */
  async getTTL(key: string): Promise<number> {
    const ttl = await this.redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  }

  // ==================== HASH OPERATIONS ====================
  
  /**
   * Set a hash field
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    await this.redis.hset(key, field, value);
  }

  /**
   * Set multiple hash fields
   */
  async hmset(key: string, object: Record<string, string>): Promise<void> {
    await this.redis.hmset(key, object);
  }

  /**
   * Get a hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    return await this.redis.hget(key, field);
  }

  /**
   * Get all hash fields
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.redis.hgetall(key);
  }

  /**
   * Increment a hash field
   */
  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return await this.redis.hincrby(key, field, increment);
  }

  // ==================== UTILITY ====================
  
  /**
   * Ping Redis server
   */
  async ping(): Promise<string> {
    return await this.redis.ping();
  }

  /**
   * Flush all data (use with caution!)
   */
  async flushAll(): Promise<void> {
    this.logger.warn('⚠️ Flushing all Redis data');
    await this.redis.flushall();
  }

  /**
   * Get Redis info
   */
  async info(): Promise<string> {
    return await this.redis.info();
  }

  async onModuleDestroy() {
    this.logger.log('Closing Redis connection...');
    await this.redis.quit();
  }
}