/**
 * AS/400 MCP Server Implementation
 * Simulates IBM AS/400 legacy system interactions via TN5250 protocol
 */

import type { MockClaim } from '../mocks/claims.mock';

/**
 * Response from AS/400 legacy system
 */
export type LegacyResponse = {
  /** Parsed data from the AS/400 response */
  data: any[];
  
  /** Raw TN5250 screen buffer for debugging purposes */
  screenBuffer?: string;
  
  /** Command execution time in milliseconds */
  executionTime: number;
};

/**
 * AS/400 MCP Server Interface
 */
export interface AS400MCP {
  /** Establish connection to AS/400 system */
  connect(): Promise<boolean>;
  
  /** Execute a command on the AS/400 system */
  runCommand(cmd: string): Promise<LegacyResponse>;
  
  /** Disconnect from AS/400 system */
  disconnect(): Promise<void>;
}

/**
 * Custom error types for AS/400 operations
 */
export class AS400Error extends Error {
  constructor(
    message: string,
    public code: 'TIMEOUT' | 'INVALID_CMD' | 'CONNECTION_LOST'
  ) {
    super(message);
    this.name = 'AS400Error';
  }
}

/**
 * AS/400 MCP Server Implementation
 * Mocks legacy system behavior with realistic delays and responses
 */
export class AS400MCPServer implements AS400MCP {
  private connected: boolean = false;
  private mockClaims: MockClaim[] = [];
  private readonly AS400_DELAY_MS = 1500;
  private connectionTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    // Pre-generate mo...
    // this.mockClaims = generateMockClaims(100);
  }
  
  /**
   * Establishes connection to AS/400 system
   * Simulates network latency and authentication
   * 
   * @returns True if connection successful
   * @throws AS400Error with code CONNECTION_LOST if connection fails
   */
  async connect(): Promise<boolean> {
    console.log('Connecting to AS/400 system...');
    
    // Simulate connection delay
    await this.delay(800);
    
    // Simulate occasional connection failures (5% chance)
    if (Math.random() < 0.05) {
      throw new AS400Error(
        'Failed to establish connection to AS/400 host',
        'CONNECTION_LOST'
      );
    }
    
    this.connected = true;
    console.log('Connected to AS/400 successfully');
    
    // Auto-disconnect after 15 minutes of inactivity
    this.resetConnectionTimeout();
    
    return true;
  }
  
  /**
   * Executes a command on the AS/400 system
   * Supports basic SQL-like syntax for querying claims
   * 
   * @param cmd - Command string to execute
   * @returns Legacy response with data and metadata
   * @throws AS400Error for various error conditions
   * 
   * @example
   * ```typescript
   * // Query all claims
   * await server.runCommand('SELECT * FROM CLAIMS');
   * 
   * // Query by damage type
   * await server.runCommand('SELECT * FROM CLAIMS WHERE damageType=Fire');
   * 
   * // Query by amount range
   * await server.runCommand('SELECT * FROM CLAIMS WHERE amount>10000');
   * ```
   */
  async runCommand(cmd: string): Promise<LegacyResponse> {
    const startTime = Date.now();
    
    // Check connection status
    if (!this.connected) {
      throw new AS400Error(
        'Not connected to AS/400 system. Call connect() first.',
        'CONNECTION_LOST'
      );
    }
    
    // Reset inactivity timeout
    this.resetConnectionTimeout();
    
    // Simulate AS/400 processing delay
    await this.delay(this.AS400_DELAY_MS);
    
    // Simulate random timeouts (2% chance)
    if (Math.random() < 0.02) {
      throw new AS400Error(
        'Command execution timed out after 30 seconds',
        'TIMEOUT'
      );
    }
    
    // Parse and execute command
    let data: any[];
    let screenBuffer: string;
    
    try {
      const result = this.parseAndExecuteCommand(cmd);
      data = result.data;
      screenBuffer = result.screenBuffer;
    } catch (error) {
      if (error instanceof AS400Error) {
        throw error;
      }
      throw new AS400Error(
        `Invalid command syntax: ${cmd}`,
        'INVALID_CMD'
      );
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      data,
      screenBuffer,
      executionTime
    };
  }
  
  /**
   * Disconnects from AS/400 system
   * Cleans up resources and clears connection timeout
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      console.log('Already disconnected');
      return;
    }
    
    console.log('Disconnecting from AS/400...');
    
    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Simulate disconnect delay
    await this.delay(300);
    
    this.connected = false;
    console.log('Disconnected from AS/400');
  }
  
  /**
   * Parses SQL-like commands and executes them against mock data
   * 
   * Supported syntax:
   * - SELECT * FROM CLAIMS
   * - SELECT * FROM CLAIMS WHERE field=value
   * - SELECT * FROM CLAIMS WHERE field>value
   * - SELECT * FROM CLAIMS WHERE field<value
   * 
   * @param cmd - Command to parse
   * @returns Parsed data and screen buffer
   */
  private parseAndExecuteCommand(cmd: string): { data: any[]; screenBuffer: string } {
    const normalizedCmd = cmd.trim().toUpperCase();
    
    // Handle SELECT queries
    if (normalizedCmd.startsWith('SELECT')) {
      return this.handleSelectQuery(cmd);
    }
    
    // Handle INSERT commands
    if (normalizedCmd.startsWith('INSERT')) {
      return this.handleInsertCommand(cmd);
    }
    
    // Handle COUNT queries
    if (normalizedCmd.startsWith('COUNT')) {
      return this.handleCountQuery();
    }
    
    // Handle SHOW TABLES
    if (normalizedCmd === 'SHOW TABLES') {
      return this.handleShowTables();
    }
    
    throw new AS400Error(
      `Unsupported command: ${cmd}`,
      'INVALID_CMD'
    );
  }
  
  /**
   * Handles SELECT queries with optional WHERE clause
   */
  private handleSelectQuery(cmd: string): { data: any[]; screenBuffer: string } {
    const normalizedCmd = cmd.trim().toUpperCase();
    
    // Check if it's a SELECT FROM CLAIMS query
    if (!normalizedCmd.includes('FROM CLAIMS')) {
      throw new AS400Error(
        'Only CLAIMS table is supported',
        'INVALID_CMD'
      );
    }
    
    let filteredClaims = [...this.mockClaims];
    
    // Parse WHERE clause if present
    const whereMatch = cmd.match(/WHERE\s+(.+)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      filteredClaims = this.applyWhereClause(filteredClaims, whereClause);
    }
    
    const screenBuffer = this.generateScreenBuffer(
      'CLAIM QUERY RESULTS',
      filteredClaims.length
    );
    
    return {
      data: filteredClaims,
      screenBuffer
    };
  }
  
  /**
   * Applies WHERE clause filtering to claims
   */
  private applyWhereClause(claims: MockClaim[], whereClause: string): MockClaim[] {
    // Parse condition: field operator value
    const equalMatch = whereClause.match(/(\w+)\s*=\s*(.+)/);
    const greaterMatch = whereClause.match(/(\w+)\s*>\s*(\d+)/);
    const lessMatch = whereClause.match(/(\w+)\s*<\s*(\d+)/);
    
    if (equalMatch) {
      const [, field, value] = equalMatch;
      const cleanValue = value.replace(/['"]/g, '').trim();
      return claims.filter(claim => {
        const claimValue = (claim as any)[field];
        return claimValue?.toString().toLowerCase() === cleanValue.toLowerCase();
      });
    }
    
    if (greaterMatch) {
      const [, field, value] = greaterMatch;
      const numValue = parseInt(value, 10);
      return claims.filter(claim => {
        const claimValue = (claim as any)[field];
        return typeof claimValue === 'number' && claimValue > numValue;
      });
    }
    
    if (lessMatch) {
      const [, field, value] = lessMatch;
      const numValue = parseInt(value, 10);
      return claims.filter(claim => {
        const claimValue = (claim as any)[field];
        return typeof claimValue === 'number' && claimValue < numValue;
      });
    }
    
    throw new AS400Error(
      `Invalid WHERE clause syntax: ${whereClause}`,
      'INVALID_CMD'
    );
  }
  
  /**
   * Handles INSERT commands (simulated)
   */
  private handleInsertCommand(cmd: string): { data: any[]; screenBuffer: string } {
    // For mock purposes, just acknowledge the insert
    const screenBuffer = this.generateScreenBuffer(
      'INSERT SUCCESSFUL',
      1
    );
    
    return {
      data: [{ success: true, message: 'Record inserted' }],
      screenBuffer
    };
  }
  
  /**
   * Handles COUNT queries
   */
  private handleCountQuery(): { data: any[]; screenBuffer: string } {
    const count = this.mockClaims.length;
    const screenBuffer = this.generateScreenBuffer(
      'COUNT QUERY',
      count
    );
    
    return {
      data: [{ count }],
      screenBuffer
    };
  }
  
  /**
   * Handles SHOW TABLES command
   */
  private handleShowTables(): { data: any[]; screenBuffer: string } {
    const tables = [
      { name: 'CLAIMS', records: this.mockClaims.length },
      { name: 'POLICIES', records: 250 },
      { name: 'CUSTOMERS', records: 500 }
    ];
    
    const screenBuffer = this.generateScreenBuffer(
      'AVAILABLE TABLES',
      tables.length
    );
    
    return {
      data: tables,
      screenBuffer
    };
  }
  
  /**
   * Generates a mock TN5250 screen buffer for debugging
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
  
  /**
   * Centers text within a given width
   */
  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }
  
  /**
   * Resets the connection timeout (15 minutes of inactivity)
   */
  private resetConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    this.connectionTimeout = setTimeout(() => {
      console.log('Connection timed out due to inactivity');
      this.connected = false;
    }, 15 * 60 * 1000); // 15 minutes
  }
  
  /**
   * Utility function to simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Gets current connection status
   */
  public isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Gets the current mock claims database (for testing)
   */
  public getMockClaims(): MockClaim[] {
    return [...this.mockClaims];
  }
}
