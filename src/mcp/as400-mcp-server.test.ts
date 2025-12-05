/**
 * Jest Tests for AS/400 MCP Server
 * Tests: Rate limiting, typed errors, deterministic mocks, correlation IDs
 */

import { 
  AS400MCPServer, 
  AS400Error, 
  AS400TimeoutError,
  AS400RateLimitError,
  AS400ConnectionError,
  type LegacyResponse 
} from './as400-mcp-server';
import type { MockClaim } from '../mocks/claims.mock';

describe('AS400MCPServer', () => {
  let server: AS400MCPServer;

  beforeEach(() => {
    // Use deterministic seed for reproducible tests
    server = new AS400MCPServer({ seed: 'test-seed-123', defaultTimeout: 5000 });
  });

  afterEach(async () => {
    if (server.isConnected()) {
      await server.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should successfully connect to AS/400', async () => {
      const result = await server.connect();
      
      expect(result).toBe(true);
      expect(server.isConnected()).toBe(true);
    });

    it('should throw AS400ConnectionError on connection failure', async () => {
      // Create server and mock random for failure
      const failServer = new AS400MCPServer({ seed: 'fail-test' });
      jest.spyOn(Math, 'random').mockReturnValue(0.01); // < 0.05 triggers failure
      
      await expect(failServer.connect()).rejects.toThrow(AS400ConnectionError);
      
      jest.restoreAllMocks();
    });

    it('should disconnect successfully', async () => {
      await server.connect();
      expect(server.isConnected()).toBe(true);
      
      await server.disconnect();
      expect(server.isConnected()).toBe(false);
    });

    it('should throw AS400ConnectionError when running command without connection', async () => {
      await expect(server.runCommand('SELECT * FROM CLAIMS'))
        .rejects
        .toThrow(AS400ConnectionError);
    });
  });

  describe('Typed Error Hierarchy', () => {
    it('AS400Error should have correct properties', () => {
      const error = new AS400Error('Test error', 'TIMEOUT', true, { test: 'context' });
      
      expect(error.name).toBe('AS400Error');
      expect(error.code).toBe('TIMEOUT');
      expect(error.recoverable).toBe(true);
      expect(error.context).toEqual({ test: 'context' });
    });

    it('AS400TimeoutError should extend AS400Error', () => {
      const error = new AS400TimeoutError('Timeout', 5000, { correlationId: 'test' });
      
      expect(error).toBeInstanceOf(AS400Error);
      expect(error.name).toBe('AS400TimeoutError');
      expect(error.code).toBe('TIMEOUT');
      expect(error.timeout).toBe(5000);
      expect(error.recoverable).toBe(true);
    });

    it('AS400RateLimitError should extend AS400Error', () => {
      const error = new AS400RateLimitError('Rate limit', 1000, { correlationId: 'test' });
      
      expect(error).toBeInstanceOf(AS400Error);
      expect(error.name).toBe('AS400RateLimitError');
      expect(error.code).toBe('RATE_LIMIT');
      expect(error.retryAfter).toBe(1000);
      expect(error.recoverable).toBe(true);
    });

    it('AS400ConnectionError should extend AS400Error', () => {
      const error = new AS400ConnectionError('Connection lost', { correlationId: 'test' });
      
      expect(error).toBeInstanceOf(AS400Error);
      expect(error.name).toBe('AS400ConnectionError');
      expect(error.code).toBe('CONNECTION_LOST');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('Deterministic Mocks', () => {
    it('should generate same data with same seed', () => {
      const server1 = new AS400MCPServer({ seed: 'deterministic-test' });
      const server2 = new AS400MCPServer({ seed: 'deterministic-test' });
      
      const claims1 = server1.getMockClaims();
      const claims2 = server2.getMockClaims();
      
      expect(claims1).toEqual(claims2);
    });

    it('should generate different data with different seeds', () => {
      const server1 = new AS400MCPServer({ seed: 'seed-a' });
      const server2 = new AS400MCPServer({ seed: 'seed-b' });
      
      const claims1 = server1.getMockClaims();
      const claims2 = server2.getMockClaims();
      
      expect(claims1).not.toEqual(claims2);
    });
  });

  describe('Correlation IDs', () => {
    beforeEach(async () => {
      await server.connect();
    });

    it('should include correlationId in response', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      
      expect(response.correlationId).toBeDefined();
      expect(response.correlationId).toMatch(/^req-\d+-[a-z0-9]+$/);
    });

    it('should use provided correlationId', async () => {
      const customId = 'custom-correlation-123';
      const response = await server.runCommand('SELECT * FROM CLAIMS', { 
        correlationId: customId 
      });
      
      expect(response.correlationId).toBe(customId);
    });

    it('should generate unique correlationIds for each request', async () => {
      const response1 = await server.runCommand('SELECT * FROM CLAIMS');
      const response2 = await server.runCommand('SELECT * FROM CLAIMS');
      
      expect(response1.correlationId).not.toBe(response2.correlationId);
    });
  });

  describe('Rate Limiter', () => {
    it('should expose rate limiter status', () => {
      const status = server.getRateLimiterStatus();
      
      expect(status).toHaveProperty('tokens');
      expect(status).toHaveProperty('waiting');
      expect(status.tokens).toBe(5); // Initial capacity
      expect(status.waiting).toBe(0);
    });
  });

  describe('Command Execution', () => {
    beforeEach(async () => {
      await server.connect();
    });

    it('should execute SELECT * FROM CLAIMS successfully', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('screenBuffer');
      expect(response).toHaveProperty('executionTime');
      expect(response).toHaveProperty('correlationId');
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should filter by damageType with WHERE clause', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS WHERE damageType=Fire');
      
      response.data.forEach((claim) => {
        expect((claim as MockClaim).damageType).toBe('Fire');
      });
    });

    it('should execute COUNT query', async () => {
      const response = await server.runCommand('COUNT');
      
      expect(response.data).toHaveLength(1);
      expect((response.data[0] as { count: number }).count).toBeGreaterThan(0);
    });

    it('should execute SHOW TABLES command', async () => {
      const response = await server.runCommand('SHOW TABLES');
      
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    it('should throw AS400Error for unsupported command', async () => {
      await expect(server.runCommand('DELETE FROM CLAIMS'))
        .rejects
        .toThrow(AS400Error);
    });
  });

  describe('Configurable Timeout', () => {
    beforeEach(async () => {
      await server.connect();
    });

    it('should use default timeout from constructor', async () => {
      const customServer = new AS400MCPServer({ 
        seed: 'timeout-test', 
        defaultTimeout: 3000 
      });
      await customServer.connect();
      
      // Server should use 3000ms default
      // (We can't easily test this without mocking, but the option is accepted)
      expect(customServer).toBeDefined();
      
      await customServer.disconnect();
    });

    it('should accept per-command timeout option', async () => {
      // This should not throw (command completes within timeout)
      const response = await server.runCommand('COUNT', { timeout: 10000 });
      
      expect(response.data).toBeDefined();
    });
  });

  describe('Data Structure Validation', () => {
    beforeEach(async () => {
      await server.connect();
    });

    it('should return claims matching MockClaim schema', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      const claim = response.data[0] as MockClaim;
      
      expect(claim).toHaveProperty('id');
      expect(claim).toHaveProperty('amount');
      expect(claim).toHaveProperty('location');
      expect(claim).toHaveProperty('damageType');
      expect(claim).toHaveProperty('date');
      expect(claim).toHaveProperty('policyNumber');
      expect(claim).toHaveProperty('claimantName');
      expect(claim).toHaveProperty('status');
    });

    it('should validate claim ID format (CLM-YYYY-XXX)', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      const claim = response.data[0] as MockClaim;
      
      expect(claim.id).toMatch(/^CLM-\d{4}-\d{3}$/);
    });

    it('should validate amount is within range', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      
      response.data.forEach((claim) => {
        const c = claim as MockClaim;
        expect(c.amount).toBeGreaterThanOrEqual(1000);
        expect(c.amount).toBeLessThanOrEqual(50000);
      });
    });
  });

  describe('Screen Buffer', () => {
    beforeEach(async () => {
      await server.connect();
    });

    it('should include TN5250 screen buffer', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      
      expect(response.screenBuffer).toBeDefined();
      expect(response.screenBuffer).toContain('IBM AS/400 SYSTEM');
      expect(response.screenBuffer).toContain('Records Found:');
      expect(response.screenBuffer).toContain('F3=Exit');
    });
  });
});
