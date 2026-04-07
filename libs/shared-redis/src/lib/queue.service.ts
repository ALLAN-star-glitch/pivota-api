/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, Job, JobsOptions } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection: Redis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor(@Inject('REDIS_CONNECTION') redisConnection: Redis) {
    this.connection = redisConnection;
  }

  // ==================== QUEUE MANAGEMENT ====================
  
  /**
   * Create a new queue or get existing one
   */
  createQueue(
    name: string,
    options?: {
      defaultJobOptions?: {
        attempts?: number;
        backoff?: { type: string; delay: number };
        removeOnComplete?: boolean | number;
        removeOnFail?: boolean | number;
      };
    }
  ): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: options?.defaultJobOptions?.attempts || 3,
        backoff: options?.defaultJobOptions?.backoff || {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: options?.defaultJobOptions?.removeOnComplete ?? true,
        removeOnFail: options?.defaultJobOptions?.removeOnFail ?? false,
      },
    });

    this.queues.set(name, queue);
    this.logger.log(`✅ Queue created: ${name}`);
    return queue;
  }

  /**
   * Create a worker to process jobs from a queue
   */
  createWorker<T = any>(
    queueName: string,
    processor: (job: Job<T>) => Promise<void>,
    options?: {
      concurrency?: number;
    }
  ): Worker {
    if (this.workers.has(queueName)) {
      return this.workers.get(queueName)!;
    }

    const worker = new Worker(queueName, processor, {
      connection: this.connection,
      concurrency: options?.concurrency || 5,
    });

    worker.on('completed', (job) => {
      this.logger.debug(`✅ Job ${job.id} completed in queue ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(`❌ Job ${job?.id} failed in queue ${queueName}: ${err.message}`);
    });

    worker.on('error', (err) => {
      this.logger.error(`❌ Worker error in queue ${queueName}: ${err.message}`);
    });

    this.workers.set(queueName, worker);
    this.logger.log(`✅ Worker created for queue: ${queueName}`);
    return worker;
  }

  /**
   * Add a job to a queue
   */
  async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobsOptions
  ): Promise<Job<T>> {
    let queue = this.queues.get(queueName);
    if (!queue) {
      queue = this.createQueue(queueName);
    }

    const job = await queue.add(jobName, data, {
      delay: options?.delay,
      priority: options?.priority,
      attempts: options?.attempts,
      backoff: options?.backoff,
      removeOnComplete: options?.removeOnComplete,
      removeOnFail: options?.removeOnFail,
    });

    this.logger.debug(`📝 Job ${job.id} added to queue ${queueName}`);
    return job;
  }

  // ==================== RATE LIMITING METHODS ====================
  
  /**
   * CHECK rate limit WITHOUT incrementing
   * Use this to verify if an action is allowed before doing expensive operations
   */
  async checkRateLimit(
    identifier: string,
    type: string,
    maxAttempts: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    attempts: number;
    remaining: number;
    resetInSeconds: number;
  }> {
    const key = `rate_limit:${type}:${identifier}`;
    
    const currentAttempts = await this.connection.get(key);
    const attempts = currentAttempts ? parseInt(currentAttempts, 10) : 0;

    // If attempts exceed max, return not allowed with remaining time
    if (attempts >= maxAttempts) {
      const ttl = await this.connection.ttl(key);
      return {
        allowed: false,
        attempts,
        remaining: 0,
        resetInSeconds: ttl > 0 ? ttl : 0,
      };
    }
    
    return {
      allowed: true,
      attempts,
      remaining: maxAttempts - attempts,
      resetInSeconds: windowSeconds,
    };
  }

  /**
   * INCREMENT rate limit counter after successful operation
   * Call this ONLY after successfully completing the action (e.g., OTP sent, email verified)
   */
  async incrementRateLimit(
    identifier: string,
    type: string,
    maxAttempts: number,
    windowSeconds: number
  ): Promise<{
    attempts: number;
    remaining: number;
  }> {
    const key = `rate_limit:${type}:${identifier}`;
    const newAttempts = await this.connection.incr(key);
    
    if (newAttempts === 1) {
      await this.connection.expire(key, windowSeconds);
    }
    
    return {
      attempts: newAttempts,
      remaining: Math.max(0, maxAttempts - newAttempts),
    };
  }

  /**
   * CONSUME attempt (check AND increment in one operation)
   * Use this for login failures where you want to increment on failure
   */
  async consumeAttempt(
    identifier: string,
    type: string,
    maxAttempts: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    attempts: number;
    remaining: number;
    resetInSeconds: number;
  }> {
    const key = `rate_limit:${type}:${identifier}`;
    
    const currentAttempts = await this.connection.get(key);
    const attempts = currentAttempts ? parseInt(currentAttempts, 10) : 0;

    // If attempts exceed max, return not allowed with remaining time
    if (attempts >= maxAttempts) {
      const ttl = await this.connection.ttl(key);
      return {
        allowed: false,
        attempts,
        remaining: 0,
        resetInSeconds: ttl > 0 ? ttl : 0,
      };
    }
    
    // Increment attempts
    const newAttempts = await this.connection.incr(key);
    if (newAttempts === 1) {
      await this.connection.expire(key, windowSeconds);
    }
    
    return {
      allowed: true,
      attempts: newAttempts,
      remaining: maxAttempts - newAttempts,
      resetInSeconds: windowSeconds,
    };
  }

  /**
   * Reset rate limit for a specific identifier (on successful verification)
   */
  async resetRateLimit(identifier: string, type: string): Promise<void> {
    const key = `rate_limit:${type}:${identifier}`;
    await this.connection.del(key);
    this.logger.debug(`Reset rate limit for ${type}:${identifier}`);
  }

  /**
   * Get current rate limit stats without modifying
   */
  async getRateLimitStats(
    identifier: string,
    type: string
  ): Promise<{
    attempts: number;
    remaining: number;
    resetInSeconds: number;
  }> {
    const key = `rate_limit:${type}:${identifier}`;
    const currentAttempts = await this.connection.get(key);
    const attempts = currentAttempts ? parseInt(currentAttempts, 10) : 0;
    const ttl = await this.connection.ttl(key);
    
    return {
      attempts,
      remaining: 0, // Caller must provide maxAttempts to calculate remaining
      resetInSeconds: ttl > 0 ? ttl : 0,
    };
  }

  // ==================== QUEUE METRICS ====================
  
  /**
   * Get metrics for a queue
   */
  async getQueueMetrics(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      this.logger.log(`⏸️ Queue paused: ${queueName}`);
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      this.logger.log(`▶️ Queue resumed: ${queueName}`);
    }
  }

  /**
   * Clean a queue (remove completed/failed jobs)
   */
  async cleanQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.clean(0, 0, 'completed');
      await queue.clean(0, 0, 'failed');
      this.logger.log(`🧹 Queue cleaned: ${queueName}`);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Closing BullMQ connections...');
    
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logger.debug(`Worker closed: ${name}`);
    }
    
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.debug(`Queue closed: ${name}`);
    }
  }
}