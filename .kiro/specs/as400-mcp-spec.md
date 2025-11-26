# AS/400 MCP Server Technical Specification

## Overview
This specification defines the architecture for an MCP (Model Context Protocol) server that bridges AI agents with IBM AS/400 legacy systems via TN5250 protocol, enabling automated insurance claim processing and data extraction.

## 1. TypeScript Interfaces

### 1.1 TN5250 Protocol Interface

```typescript
/**
 * TN5250 Session Configuration
 */
interface TN5250Config {
  host: string;
  port: number;
  deviceName?: string;
  timeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

/**
 * Screen Field Definition
 */
interface ScreenField {
  row: number;
  col: number;
  length: number;
  value: string;
  protected: boolean;
  hidden: boolean;
  fieldId?: string;
}

/**
 * TN5250 Screen State
 */
interface ScreenState {
  rows: number;
  cols: number;
  cursorRow: number;
  cursorCol: number;
  fields: ScreenField[];
  rawBuffer: Buffer;
  screenId?: string;
  timestamp: Date;
}

/**
 * TN5250 Command
 */
interface TN5250Command {
  type: 'sendKeys' | 'setField' | 'pressKey' | 'waitForScreen';
  data: {
    keys?: string;
    fieldId?: string;
    value?: string;
    keyCode?: KeyCode;
    screenPattern?: string;
    timeout?: number;
  };
}

/**
 * Function Keys and Special Keys
 */
enum KeyCode {
  ENTER = 0xF001,
  F1 = 0xF101,
  F3 = 0xF103,
  F12 = 0xF112,
  CLEAR = 0xF0BD,
  HELP = 0xF17C,
  PAGEUP = 0xF184,
  PAGEDOWN = 0xF185
}

/**
 * TN5250 Session Interface
 */
interface ITN5250Session {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getScreen(): Promise<ScreenState>;
  sendCommand(command: TN5250Command): Promise<ScreenState>;
  waitForScreen(pattern: string, timeout: number): Promise<ScreenState>;
  isConnected(): boolean;
}
```

### 1.2 Insurance Claim Data Models

```typescript
/**
 * Insurance Claim Structure
 */
interface InsuranceClaim {
  claimId: string;
  policyNumber: string;
  claimantInfo: ClaimantInfo;
  incidentDetails: IncidentDetails;
  damageAssessment: DamageAssessment;
  status: ClaimStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface ClaimantInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: Address;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

interface IncidentDetails {
  dateOfLoss: Date;
  location: Address;
  description: string;
  weatherConditions?: WeatherData;
  policeReportNumber?: string;
}

interface DamageAssessment {
  estimatedCost: number;
  category: 'property' | 'auto' | 'liability' | 'other';
  severity: 'minor' | 'moderate' | 'severe' | 'total';
  photos?: string[];
}

enum ClaimStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  PAID = 'PAID'
}

interface WeatherData {
  temperature: number;
  conditions: string;
  windSpeed: number;
  precipitation: number;
  source: 'NOAA' | 'manual';
}
```

### 1.3 MCP Server Interface

```typescript
/**
 * MCP Tool Definitions
 */
interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

/**
 * AS/400 MCP Server Tools
 */
const AS400_MCP_TOOLS: MCPTool[] = [
  {
    name: 'as400_submit_claim',
    description: 'Submit insurance claim to AS/400 system',
    inputSchema: {
      type: 'object',
      properties: {
        claim: { type: 'object' },
        autoNavigate: { type: 'boolean', default: true }
      },
      required: ['claim']
    }
  },
  {
    name: 'as400_query_claim',
    description: 'Query claim status from AS/400',
    inputSchema: {
      type: 'object',
      properties: {
        claimId: { type: 'string' },
        policyNumber: { type: 'string' }
      }
    }
  },
  {
    name: 'as400_generate_report',
    description: 'Generate Excel report from AS/400 data',
    inputSchema: {
      type: 'object',
      properties: {
        reportType: { type: 'string', enum: ['claims', 'policies', 'payments'] },
        dateRange: { type: 'object' },
        filters: { type: 'object' }
      },
      required: ['reportType']
    }
  }
];
```

## 2. Mock Data Generator

### 2.1 Mock Claim Generator

```typescript
/**
 * Generate mock insurance claims for testing
 */
class MockClaimGenerator {
  private faker: any; // Use faker.js or similar
  
  generateClaim(overrides?: Partial<InsuranceClaim>): InsuranceClaim {
    const claimId = this.generateClaimId();
    const dateOfLoss = this.randomDate(30); // Last 30 days
    
    return {
      claimId,
      policyNumber: this.generatePolicyNumber(),
      claimantInfo: this.generateClaimant(),
      incidentDetails: {
        dateOfLoss,
        location: this.generateAddress(),
        description: this.generateIncidentDescription(),
        weatherConditions: this.generateWeatherData(dateOfLoss),
        policeReportNumber: Math.random() > 0.5 ? this.generatePoliceReport() : undefined
      },
      damageAssessment: this.generateDamageAssessment(),
      status: ClaimStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }
  
  generateBatch(count: number): InsuranceClaim[] {
    return Array.from({ length: count }, () => this.generateClaim());
  }
  
  private generateClaimId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CLM-${timestamp}-${random}`;
  }
  
  private generatePolicyNumber(): string {
    const prefix = ['AUTO', 'HOME', 'LIFE'][Math.floor(Math.random() * 3)];
    const number = Math.floor(Math.random() * 9000000) + 1000000;
    return `${prefix}-${number}`;
  }
  
  private generateClaimant(): ClaimantInfo {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
    
    return {
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      email: `user${Math.floor(Math.random() * 1000)}@example.com`,
      phone: this.generatePhone(),
      address: this.generateAddress()
    };
  }
  
  private generateAddress(): Address {
    const cities = ['Springfield', 'Riverside', 'Fairview', 'Madison', 'Georgetown'];
    const states = ['IL', 'CA', 'TX', 'NY', 'FL'];
    
    return {
      street: `${Math.floor(Math.random() * 9999) + 1} Main St`,
      city: cities[Math.floor(Math.random() * cities.length)],
      state: states[Math.floor(Math.random() * states.length)],
      zipCode: String(Math.floor(Math.random() * 90000) + 10000)
    };
  }
  
  private generateIncidentDescription(): string {
    const incidents = [
      'Vehicle collision at intersection during rush hour',
      'Hail damage to roof and windows during storm',
      'Water damage from burst pipe in basement',
      'Fire damage to kitchen from cooking incident',
      'Theft of personal property from vehicle'
    ];
    return incidents[Math.floor(Math.random() * incidents.length)];
  }
  
  private generateWeatherData(date: Date): WeatherData {
    return {
      temperature: Math.floor(Math.random() * 60) + 30,
      conditions: ['Clear', 'Cloudy', 'Rain', 'Snow', 'Hail'][Math.floor(Math.random() * 5)],
      windSpeed: Math.floor(Math.random() * 40),
      precipitation: Math.random() * 2,
      source: 'NOAA'
    };
  }
  
  private generateDamageAssessment(): DamageAssessment {
    const categories: Array<'property' | 'auto' | 'liability' | 'other'> = 
      ['property', 'auto', 'liability', 'other'];
    const severities: Array<'minor' | 'moderate' | 'severe' | 'total'> = 
      ['minor', 'moderate', 'severe', 'total'];
    
    return {
      estimatedCost: Math.floor(Math.random() * 50000) + 500,
      category: categories[Math.floor(Math.random() * categories.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      photos: []
    };
  }
  
  private generatePhone(): string {
    return `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  }
  
  private generatePoliceReport(): string {
    return `PR-${Math.floor(Math.random() * 900000) + 100000}`;
  }
  
  private randomDate(daysBack: number): Date {
    const now = new Date();
    const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
  }
}
```

### 2.2 Mock TN5250 Screen Generator

```typescript
/**
 * Generate mock AS/400 screens for testing
 */
class MockScreenGenerator {
  generateLoginScreen(): ScreenState {
    return {
      rows: 24,
      cols: 80,
      cursorRow: 10,
      cursorCol: 20,
      fields: [
        { row: 5, col: 30, length: 20, value: 'AS/400 LOGIN', protected: true, hidden: false },
        { row: 10, col: 20, length: 10, value: '', protected: false, hidden: false, fieldId: 'username' },
        { row: 12, col: 20, length: 10, value: '', protected: false, hidden: true, fieldId: 'password' }
      ],
      rawBuffer: Buffer.alloc(1920),
      screenId: 'LOGIN',
      timestamp: new Date()
    };
  }
  
  generateClaimEntryScreen(): ScreenState {
    return {
      rows: 24,
      cols: 80,
      cursorRow: 8,
      cursorCol: 20,
      fields: [
        { row: 2, col: 25, length: 30, value: 'CLAIM ENTRY SCREEN', protected: true, hidden: false },
        { row: 8, col: 20, length: 15, value: '', protected: false, hidden: false, fieldId: 'policyNumber' },
        { row: 10, col: 20, length: 30, value: '', protected: false, hidden: false, fieldId: 'claimantName' },
        { row: 12, col: 20, length: 50, value: '', protected: false, hidden: false, fieldId: 'description' },
        { row: 14, col: 20, length: 10, value: '', protected: false, hidden: false, fieldId: 'estimatedCost' }
      ],
      rawBuffer: Buffer.alloc(1920),
      screenId: 'CLAIM_ENTRY',
      timestamp: new Date()
    };
  }
}
```

## 3. Error Handling

### 3.1 Error Types

```typescript
/**
 * Custom Error Classes
 */
class AS400Error extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'AS400Error';
  }
}

class ConnectionTimeoutError extends AS400Error {
  constructor(host: string, timeout: number) {
    super(
      `Connection to ${host} timed out after ${timeout}ms`,
      'CONNECTION_TIMEOUT',
      true
    );
    this.name = 'ConnectionTimeoutError';
  }
}

class ScreenNavigationError extends AS400Error {
  constructor(expectedScreen: string, actualScreen: string) {
    super(
      `Expected screen '${expectedScreen}' but got '${actualScreen}'`,
      'SCREEN_NAVIGATION_ERROR',
      true
    );
    this.name = 'ScreenNavigationError';
  }
}

class AuthenticationError extends AS400Error {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', false);
    this.name = 'AuthenticationError';
  }
}

class DataValidationError extends AS400Error {
  constructor(field: string, reason: string) {
    super(
      `Validation failed for field '${field}': ${reason}`,
      'VALIDATION_ERROR',
      false
    );
    this.name = 'DataValidationError';
  }
}
```

### 3.2 Connection Timeout Handler

```typescript
/**
 * Retry Strategy Configuration
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

/**
 * Connection Manager with Timeout Handling
 */
class ConnectionManager {
  private config: RetryConfig;
  private session: ITN5250Session | null = null;
  
  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      timeoutMs: 30000,
      ...config
    };
  }
  
  async connectWithRetry(sessionConfig: TN5250Config): Promise<ITN5250Session> {
    let lastError: Error | null = null;
    let delay = this.config.initialDelay;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        console.log(`Connection attempt ${attempt}/${this.config.maxAttempts}`);
        
        const session = await this.attemptConnection(sessionConfig);
        this.session = session;
        console.log('Connection established successfully');
        return session;
        
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.maxAttempts) {
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
          delay = Math.min(delay * this.config.backoffMultiplier, this.config.maxDelay);
        }
      }
    }
    
    throw new ConnectionTimeoutError(
      sessionConfig.host,
      this.config.timeoutMs
    );
  }
  
  private async attemptConnection(config: TN5250Config): Promise<ITN5250Session> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new ConnectionTimeoutError(config.host, config.timeout));
      }, config.timeout);
      
      // Actual connection logic would go here
      // For now, simulate connection
      const session: ITN5250Session = {
        connect: async () => {},
        disconnect: async () => {},
        getScreen: async () => new MockScreenGenerator().generateLoginScreen(),
        sendCommand: async (cmd) => new MockScreenGenerator().generateClaimEntryScreen(),
        waitForScreen: async (pattern, timeout) => new MockScreenGenerator().generateClaimEntryScreen(),
        isConnected: () => true
      };
      
      clearTimeout(timeout);
      resolve(session);
    });
  }
  
  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.disconnect();
      this.session = null;
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3.3 Error Recovery Strategy

```typescript
/**
 * Error Handler with Recovery Logic
 */
class ErrorRecoveryHandler {
  async handleError(error: Error, context: any): Promise<void> {
    if (error instanceof ConnectionTimeoutError) {
      console.log('Attempting to reconnect...');
      // Trigger reconnection logic
      throw error; // Propagate for retry
    }
    
    if (error instanceof ScreenNavigationError) {
      console.log('Screen navigation failed, attempting to reset...');
      // Send F3 or F12 to return to main menu
      throw error;
    }
    
    if (error instanceof AuthenticationError) {
      console.error('Authentication failed - manual intervention required');
      throw error; // Not recoverable
    }
    
    if (error instanceof DataValidationError) {
      console.error('Data validation failed:', error.message);
      throw error; // Not recoverable
    }
    
    // Unknown error
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

## 4. Unit Test Plan

### 4.1 Test Structure

```typescript
/**
 * Test Suite Organization
 */
describe('AS/400 MCP Server', () => {
  
  describe('TN5250 Protocol', () => {
    describe('Connection Management', () => {
      it('should connect to AS/400 host successfully');
      it('should handle connection timeout');
      it('should retry connection on failure');
      it('should respect max retry attempts');
      it('should use exponential backoff');
      it('should disconnect cleanly');
    });
    
    describe('Screen Parsing', () => {
      it('should parse screen fields correctly');
      it('should identify protected fields');
      it('should identify hidden fields');
      it('should extract field values');
      it('should detect screen ID');
      it('should handle cursor position');
    });
    
    describe('Command Execution', () => {
      it('should send keys to session');
      it('should set field values');
      it('should press function keys');
      it('should wait for screen changes');
      it('should timeout on screen wait');
    });
  });
  
  describe('Claim Processing', () => {
    describe('Claim Submission', () => {
      it('should submit valid claim');
      it('should validate required fields');
      it('should handle missing policy number');
      it('should format currency correctly');
      it('should navigate claim entry screens');
      it('should confirm submission');
    });
    
    describe('Claim Query', () => {
      it('should query claim by ID');
      it('should query claim by policy number');
      it('should return claim status');
      it('should handle claim not found');
      it('should parse claim details');
    });
  });
  
  describe('Mock Data Generator', () => {
    describe('Claim Generation', () => {
      it('should generate valid claim');
      it('should generate unique claim IDs');
      it('should generate valid policy numbers');
      it('should generate realistic dates');
      it('should generate batch of claims');
      it('should apply overrides');
    });
    
    describe('Screen Generation', () => {
      it('should generate login screen');
      it('should generate claim entry screen');
      it('should set correct field positions');
      it('should mark protected fields');
    });
  });
  
  describe('Error Handling', () => {
    describe('Connection Errors', () => {
      it('should throw ConnectionTimeoutError on timeout');
      it('should mark timeout as recoverable');
      it('should include host in error message');
    });
    
    describe('Navigation Errors', () => {
      it('should throw ScreenNavigationError on wrong screen');
      it('should include expected and actual screens');
      it('should mark navigation error as recoverable');
    });
    
    describe('Authentication Errors', () => {
      it('should throw AuthenticationError on bad credentials');
      it('should mark auth error as non-recoverable');
    });
    
    describe('Validation Errors', () => {
      it('should throw DataValidationError on invalid data');
      it('should include field name and reason');
      it('should mark validation error as non-recoverable');
    });
  });
  
  describe('MCP Integration', () => {
    describe('Tool Registration', () => {
      it('should register as400_submit_claim tool');
      it('should register as400_query_claim tool');
      it('should register as400_generate_report tool');
      it('should validate tool schemas');
    });
    
    describe('Tool Execution', () => {
      it('should execute submit_claim with valid input');
      it('should execute query_claim with claim ID');
      it('should execute generate_report with filters');
      it('should return JSON responses');
      it('should handle tool errors gracefully');
    });
  });
});
```

### 4.2 Test Implementation Examples

```typescript
/**
 * Sample Test Cases
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  
  beforeEach(() => {
    connectionManager = new ConnectionManager({
      maxAttempts: 3,
      initialDelay: 100,
      timeoutMs: 5000
    });
  });
  
  afterEach(async () => {
    await connectionManager.disconnect();
  });
  
  it('should connect successfully on first attempt', async () => {
    const config: TN5250Config = {
      host: 'localhost',
      port: 23,
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    };
    
    const session = await connectionManager.connectWithRetry(config);
    expect(session.isConnected()).toBe(true);
  });
  
  it('should throw ConnectionTimeoutError after max retries', async () => {
    const config: TN5250Config = {
      host: 'invalid-host',
      port: 23,
      timeout: 100,
      retryAttempts: 2,
      retryDelay: 50
    };
    
    await expect(connectionManager.connectWithRetry(config))
      .rejects
      .toThrow(ConnectionTimeoutError);
  });
});

describe('MockClaimGenerator', () => {
  let generator: MockClaimGenerator;
  
  beforeEach(() => {
    generator = new MockClaimGenerator();
  });
  
  it('should generate claim with unique ID', () => {
    const claim1 = generator.generateClaim();
    const claim2 = generator.generateClaim();
    
    expect(claim1.claimId).not.toBe(claim2.claimId);
    expect(claim1.claimId).toMatch(/^CLM-/);
  });
  
  it('should generate batch of claims', () => {
    const claims = generator.generateBatch(10);
    
    expect(claims).toHaveLength(10);
    expect(new Set(claims.map(c => c.claimId)).size).toBe(10);
  });
  
  it('should apply overrides', () => {
    const claim = generator.generateClaim({
      policyNumber: 'TEST-12345',
      status: ClaimStatus.APPROVED
    });
    
    expect(claim.policyNumber).toBe('TEST-12345');
    expect(claim.status).toBe(ClaimStatus.APPROVED);
  });
});
```

### 4.3 Integration Test Plan

```typescript
/**
 * Integration Tests
 */
describe('AS/400 Integration Tests', () => {
  it('should complete full claim submission workflow', async () => {
    // 1. Connect to AS/400
    // 2. Navigate to claim entry screen
    // 3. Fill in claim data
    // 4. Submit claim
    // 5. Verify confirmation
    // 6. Query claim status
    // 7. Verify claim exists
  });
  
  it('should handle concurrent claim submissions', async () => {
    // Test multiple simultaneous claims
  });
  
  it('should recover from connection loss', async () => {
    // Simulate connection drop and recovery
  });
  
  it('should generate Excel report from AS/400 data', async () => {
    // Query data and generate report
  });
});
```

## 5. Performance Requirements

- Connection establishment: < 5 seconds
- Screen navigation: < 2 seconds per screen
- Claim submission: < 30 seconds end-to-end
- Query response: < 3 seconds
- Report generation: < 60 seconds for 1000 records
- Concurrent sessions: Support 5+ simultaneous connections

## 6. Security Considerations

- Credentials stored in environment variables
- TLS/SSL encryption for network traffic
- Session timeout after 15 minutes of inactivity
- Audit logging for all claim operations
- Input sanitization to prevent injection attacks
- Rate limiting on API endpoints

## 7. Dependencies

```json
{
  "dependencies": {
    "tn5250": "^1.0.0",
    "exceljs": "^4.3.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 8. Implementation Phases

### Phase 1: Core Protocol (Week 1)
- TN5250 connection management
- Screen parsing and navigation
- Basic error handling

### Phase 2: Claim Processing (Week 2)
- Claim submission workflow
- Claim query functionality
- Data validation

### Phase 3: MCP Integration (Week 3)
- MCP server implementation
- Tool registration
- JSON serialization

### Phase 4: Testing & Polish (Week 4)
- Unit test implementation
- Integration testing
- Performance optimization
- Documentation

## 9. Success Metrics

- 95% reduction in claim processing time (45min → <5min)
- 99.9% connection reliability
- Zero data loss during transmission
- 100% test coverage for critical paths
- < 1% error rate in production
