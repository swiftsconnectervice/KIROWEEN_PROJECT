/**
 * AS/400 MCP Server Implementation
 * Simulates IBM AS/400 legacy system interactions via TN5250 protocol
 * 
 * Features:
 * - Token Bucket rate limiting (5 req/s)
 * - Winston structured logging with correlation IDs
 * - Typed error hierarchy for proper error handling
 * - Deterministic mocks with seedrandom
 * - Configurable timeout per command
 */

import winston from 'winston';
import seedrandom from 'seedrandom';
import type { MockClaim } from '../mocks/claims.mock';

// ============================================================================
// WINSTON LOGGER SETUP
// ============================================================================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'as400-mcp' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, correlationId, ...meta }) => {
          const corrId = correlationId ? `[${correlationId}]` : '';
          const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level} ${corrId} ${message}${metaStr}`;
        })
      )
    })
  ]
});

// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================

/**
 * Base error class for AS/400 operations
 */
export class AS400Error extends Error {
  constructor(
    message: string,
    public code: 'TIMEOUT' | 'RATE_LIMIT' | 'CONNECTION_LOST' | 'INVALID_CMD' | 'UNKNOWN',
    public recoverable: boolean = false,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AS400Error';
  }
}

/**
 * Timeout error - command took too long
 */
export class AS400TimeoutError extends AS400Error {
  constructor(message: string, public timeout: number, context?: Record<string, unknown>) {
    super(message, 'TIMEOUT', true, context);
    this.name = 'AS400TimeoutError';
  }
}

/**
 * Rate limit error - too many requests
 */
export class AS400RateLimitError extends AS400Error {
  constructor(message: string, public retryAfter: number, context?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT', true, context);
    this.name = 'AS400RateLimitError';
  }
}

/**
 * Connection error - lost connection to AS/400
 */
export class AS400ConnectionError extends AS400Error {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONNECTION_LOST', true, context);
    this.name = 'AS400ConnectionError';
  }
}

// ============================================================================
// TOKEN BUCKET RATE LIMITER
// ============================================================================

/**
 * Token Bucket algorithm for rate limiting
 * Allows burst traffic up to capacity, then enforces rate limit
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second
  private waitingRequests: number = 0;
  private readonly maxWaiting: number = 10;

  constructor(capacity: number = 5, refillRate: number = 5) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
    
    logger.info('TokenBucket initialized', { capacity, refillRate });
  }

  /**
   * Acquire a token, waiting if necessary
   * @throws AS400RateLimitError if queue is full
   */
  async acquire(correlationId?: string): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      logger.debug('Token acquired', { 
        correlationId, 
        remainingTokens: this.tokens 
      });
      return;
    }

    // Check if too many requests waiting
    if (this.waitingRequests >= this.maxWaiting) {
      throw new AS400RateLimitError(
        'Rate limit exceeded. Too many requests in queue.',
        Math.ceil(1000 / this.refillRate),
        { correlationId, queueSize: this.waitingRequests }
      );
    }

    // Wait for next token
    this.waitingRequests++;
    const waitTime = Math.ceil(1000 / this.refillRate);
    
    logger.debug('Rate limit reached, waiting for token', { 
      correlationId, 
      waitTime,
      queuePosition: this.waitingRequests 
    });

    await new Promise(resolve => setTimeout(resolve, waitTime));
    this.waitingRequests--;
    
    return this.acquire(correlationId);
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getStatus(): { tokens: number; waiting: number } {
    this.refill();
    return { tokens: Math.floor(this.tokens), waiting: this.waitingRequests };
  }
}

// ============================================================================
// DETERMINISTIC MOCK GENERATOR
// ============================================================================


const US_CITIES = [
  'Miami, FL', 'Houston, TX', 'New York, NY', 'Los Angeles, CA',
  'Chicago, IL', 'Phoenix, AZ', 'Dallas, TX', 'Denver, CO',
  'Seattle, WA', 'Boston, MA', 'Atlanta, GA', 'San Francisco, CA'
];

const DAMAGE_TYPES: Array<'Hurricane' | 'Fire' | 'Flood' | 'Theft' | 'Vandalism'> = [
  'Hurricane', 'Fire', 'Flood', 'Theft', 'Vandalism'
];

const FIRST_NAMES = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Ashley'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

/**
 * Deterministic mock data generator using seedrandom
 * Same seed = same data sequence (reproducible tests)
 */
class DeterministicMockGenerator {
  private rng: () => number;
  private claimCounter: number = 0;

  constructor(seed: string = 'frankenstack-2025') {
    this.rng = seedrandom(seed);
    logger.info('DeterministicMockGenerator initialized', { seed });
  }

  /**
   * Generate a mock claim with deterministic values
   */
  generateClaim(): MockClaim {
    const year = new Date().getFullYear();
    this.claimCounter++;
    const sequence = Math.floor(this.rng() * 900) + 100;

    return {
      id: `CLM-${year}-${sequence}`,
      policyNumber: this.generatePolicyNumber(),
      claimantName: this.generateName(),
      location: this.selectFromArray(US_CITIES),
      damageType: this.selectFromArray(DAMAGE_TYPES),
      amount: Math.floor(this.rng() * 49000) + 1000,
      date: this.randomDate(30),
      status: 'PENDING'
    };
  }

  /**
   * Generate multiple claims
   */
  generateClaims(count: number): MockClaim[] {
    return Array.from({ length: count }, () => this.generateClaim());
  }

  private generatePolicyNumber(): string {
    const prefix = this.selectFromArray(['AUTO', 'HOME', 'LIFE', 'COMM']);
    const number = Math.floor(this.rng() * 9000000) + 1000000;
    return `${prefix}-${number}`;
  }

  private generateName(): string {
    const first = this.selectFromArray(FIRST_NAMES);
    const last = this.selectFromArray(LAST_NAMES);
    return `${first} ${last}`;
  }

  private selectFromArray<T>(arr: T[]): T {
    return arr[Math.floor(this.rng() * arr.length)];
  }

  private randomDate(daysBack: number): Date {
    const now = Date.now();
    const daysAgo = Math.floor(this.rng() * daysBack);
    return new Date(now - daysAgo * 24 * 60 * 60 * 1000);
  }
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Response from AS/400 legacy system
 */
export type LegacyResponse = {
  data: unknown[];
  screenBuffer?: string;
  executionTime: number;
  correlationId?: string;
};

/**
 * Command execution options
 */
export interface CommandOptions {
  timeout?: number;
  correlationId?: string;
}

/**
 * AS/400 MCP Server Interface
 */
export interface AS400MCP {
  connect(): Promise<boolean>;
  runCommand(cmd: string, options?: CommandOptions): Promise<LegacyResponse>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

// ============================================================================
// AS/400 MCP SERVER IMPLEMENTATION
// ============================================================================

/**
 * AS/400 MCP Server Implementation
 * Full-featured implementation with rate limiting, logging, and typed errors
 */
export class AS400MCPServer implements AS400MCP {
  private connected: boolean = false;
  private mockClaims: MockClaim[] = [];
  private readonly defaultTimeout: number;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private correlationCounter: number = 0;
  
  private readonly rateLimiter: TokenBucket;
  private readonly mockGenerator: DeterministicMockGenerator;

  constructor(options: { seed?: string; defaultTimeout?: number; rateLimit?: number } = {}) {
    const { seed = 'frankenstack-2025', defaultTimeout = 5000, rateLimit = 5 } = options;
    
    this.defaultTimeout = defaultTimeout;
    this.rateLimiter = new TokenBucket(rateLimit, rateLimit);
    this.mockGenerator = new DeterministicMockGenerator(seed);
    
    // Pre-generate deterministic mock claims
    this.mockClaims = this.mockGenerator.generateClaims(100);

    logger.info('AS400MCPServer initialized', {
      seed,
      defaultTimeout,
      rateLimit,
      mockClaimsCount: this.mockClaims.length
    });
  }

  /**
   * Generate a unique correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `req-${++this.correlationCounter}-${Date.now().toString(36)}`;
  }

  /**
   * Establishes connection to AS/400 system
   */
  async connect(): Promise<boolean> {
    const correlationId = this.generateCorrelationId();
    logger.info('Connecting to AS/400 system...', { correlationId });

    await this.delay(800);

    // Simulate occasional connection failures (5% chance)
    if (Math.random() < 0.05) {
      const error = new AS400ConnectionError(
        'Failed to establish connection to AS/400 host',
        { correlationId }
      );
      logger.error('Connection failed', { correlationId, error: error.message });
      throw error;
    }

    this.connected = true;
    this.resetConnectionTimeout();

    logger.info('Connected to AS/400 successfully', { correlationId });
    return true;
  }

  /**
   * Executes a command on the AS/400 system with full protection
   */
  async runCommand(cmd: string, options: CommandOptions = {}): Promise<LegacyResponse> {
    const timeout = options.timeout || this.defaultTimeout;
    const correlationId = options.correlationId || this.generateCorrelationId();
    const startTime = Date.now();

    logger.info('Command received', { cmd, timeout, correlationId });

    // Check connection
    if (!this.connected) {
      const error = new AS400ConnectionError(
        'Not connected to AS/400 system. Call connect() first.',
        { correlationId }
      );
      logger.error('Command failed - not connected', { correlationId });
      throw error;
    }

    try {
      // Rate limiting
      await this.rateLimiter.acquire(correlationId);
      logger.debug('Rate limit token acquired', { correlationId });

      // Execute with timeout protection
      const result = await Promise.race([
        this.executeCommand(cmd, correlationId),
        this.createTimeoutPromise(timeout, correlationId)
      ]);

      const executionTime = Date.now() - startTime;
      
      logger.info('Command completed successfully', {
        cmd: cmd.substring(0, 50),
        executionTime,
        recordCount: result.data.length,
        correlationId
      });

      return { ...result, executionTime, correlationId };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof AS400Error) {
        logger.error('AS/400 error occurred', {
          errorType: error.name,
          errorCode: error.code,
          message: error.message,
          executionTime,
          correlationId,
          recoverable: error.recoverable
        });
        throw error;
      }

      logger.error('Unexpected error', {
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        correlationId
      });

      throw new AS400Error(
        'Unexpected error during command execution',
        'UNKNOWN',
        false,
        { originalError: String(error), correlationId }
      );
    }
  }

  /**
   * Creates a timeout promise that rejects after specified ms
   */
  private createTimeoutPromise(ms: number, correlationId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new AS400TimeoutError(
          `Command execution timed out after ${ms}ms`,
          ms,
          { correlationId }
        ));
      }, ms);
    });
  }

  /**
   * Execute the actual command (internal)
   */
  private async executeCommand(cmd: string, correlationId: string): Promise<Omit<LegacyResponse, 'executionTime' | 'correlationId'>> {
    // Reset inactivity timeout
    this.resetConnectionTimeout();

    // Simulate AS/400 processing delay (1-2 seconds)
    const delay = 1000 + Math.random() * 1000;
    await this.delay(delay);

    // Parse and execute command
    const result = this.parseAndExecuteCommand(cmd);
    
    logger.debug('Command executed internally', { 
      correlationId, 
      recordCount: result.data.length 
    });

    return result;
  }

  /**
   * Disconnects from AS/400 system
   */
  async disconnect(): Promise<void> {
    const correlationId = this.generateCorrelationId();
    
    if (!this.connected) {
      logger.info('Already disconnected', { correlationId });
      return;
    }

    logger.info('Disconnecting from AS/400...', { correlationId });

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    await this.delay(300);
    this.connected = false;

    logger.info('Disconnected from AS/400', { correlationId });
  }

  // ... rest of the implementation


  /**
   * Parses SQL-like commands and executes them against mock data
   */
  private parseAndExecuteCommand(cmd: string): { data: unknown[]; screenBuffer: string } {
    const normalizedCmd = cmd.trim().toUpperCase();

    if (normalizedCmd.startsWith('SELECT')) {
      return this.handleSelectQuery(cmd);
    }

    if (normalizedCmd.startsWith('INSERT')) {
      return this.handleInsertCommand(cmd);
    }

    if (normalizedCmd.startsWith('COUNT')) {
      return this.handleCountQuery();
    }

    if (normalizedCmd === 'SHOW TABLES') {
      return this.handleShowTables();
    }

    throw new AS400Error(
      `Unsupported command: ${cmd}`,
      'INVALID_CMD',
      false
    );
  }

  /**
   * Handles SELECT queries with optional WHERE clause
   */
  private handleSelectQuery(cmd: string): { data: unknown[]; screenBuffer: string } {
    const normalizedCmd = cmd.trim().toUpperCase();

    if (!normalizedCmd.includes('FROM CLAIMS')) {
      throw new AS400Error('Only CLAIMS table is supported', 'INVALID_CMD', false);
    }

    let filteredClaims = [...this.mockClaims];

    const whereMatch = cmd.match(/WHERE\s+(.+)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      filteredClaims = this.applyWhereClause(filteredClaims, whereClause);
    }

    const screenBuffer = this.generateScreenBuffer('CLAIM QUERY RESULTS', filteredClaims.length);

    return { data: filteredClaims, screenBuffer };
  }

  /**
   * Applies WHERE clause filtering to claims
   */
  private applyWhereClause(claims: MockClaim[], whereClause: string): MockClaim[] {
    const equalMatch = whereClause.match(/(\w+)\s*=\s*(.+)/);
    const greaterMatch = whereClause.match(/(\w+)\s*>\s*(\d+)/);
    const lessMatch = whereClause.match(/(\w+)\s*<\s*(\d+)/);

    if (equalMatch) {
      const [, field, value] = equalMatch;
      const cleanValue = value.replace(/['"]/g, '').trim();
      return claims.filter(claim => {
        const claimValue = (claim as unknown as Record<string, unknown>)[field];
        return claimValue?.toString().toLowerCase() === cleanValue.toLowerCase();
      });
    }

    if (greaterMatch) {
      const [, field, value] = greaterMatch;
      const numValue = parseInt(value, 10);
      return claims.filter(claim => {
        const claimValue = (claim as unknown as Record<string, unknown>)[field];
        return typeof claimValue === 'number' && claimValue > numValue;
      });
    }

    if (lessMatch) {
      const [, field, value] = lessMatch;
      const numValue = parseInt(value, 10);
      return claims.filter(claim => {
        const claimValue = (claim as unknown as Record<string, unknown>)[field];
        return typeof claimValue === 'number' && claimValue < numValue;
      });
    }

    throw new AS400Error(`Invalid WHERE clause syntax: ${whereClause}`, 'INVALID_CMD', false);
  }

  /**
   * Handles INSERT commands (simulated)
   */
  private handleInsertCommand(cmd: string): { data: unknown[]; screenBuffer: string } {
    const screenBuffer = this.generateScreenBuffer('INSERT SUCCESSFUL', 1);
    return {
      data: [{ success: true, message: 'Record inserted', command: cmd.substring(0, 50) }],
      screenBuffer
    };
  }

  /**
   * Handles COUNT queries
   */
  private handleCountQuery(): { data: unknown[]; screenBuffer: string } {
    const count = this.mockClaims.length;
    const screenBuffer = this.generateScreenBuffer('COUNT QUERY', count);
    return { data: [{ count }], screenBuffer };
  }

  /**
   * Handles SHOW TABLES command
   */
  private handleShowTables(): { data: unknown[]; screenBuffer: string } {
    const tables = [
      { name: 'CLAIMS', records: this.mockClaims.length },
      { name: 'POLICIES', records: 250 },
      { name: 'CUSTOMERS', records: 500 }
    ];
    const screenBuffer = this.generateScreenBuffer('AVAILABLE TABLES', tables.length);
    return { data: tables, screenBuffer };
  }

  /**
   * Generates a mock TN5250 screen buffer
   */
  private generateScreenBuffer(title: string, recordCount: number): string {
    const width = 80;
    const border = '='.repeat(width);
    const timestamp = new Date().toISOString();

    return `
${border}
${this.centerText('IBM AS/400 SYSTEM', width)}
${this.centerText(title, width)}
${border}

  Session: TN5250-MCP-001
  User: MCPUSER
  Time: ${timestamp}
  
  Records Found: ${recordCount}
  Status: SUCCESS
  
${border}
  F3=Exit  F5=Refresh  F12=Cancel
${border}
    `.trim();
  }

  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private resetConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    this.connectionTimeout = setTimeout(() => {
      logger.warn('Connection timed out due to inactivity');
      this.connected = false;
    }, 15 * 60 * 1000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getMockClaims(): MockClaim[] {
    return [...this.mockClaims];
  }

  public getRateLimiterStatus(): { tokens: number; waiting: number } {
    return this.rateLimiter.getStatus();
  }
}
