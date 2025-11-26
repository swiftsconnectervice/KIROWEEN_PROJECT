/**
 * Jest Tests for AS/400 MCP Server
 * Coverage threshold: 80%
 */

import { AS400MCPServer, AS400Error, type LegacyResponse } from './as400-mcp-server';
import type { MockClaim } from '../mocks/claims.mock';

describe('AS400MCPServer', () => {
  let server: AS400MCPServer;

  beforeEach(() => {
    server = new AS400MCPServer();
    // Mock Math.random to control random behavior
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(async () => {
    if (server.isConnected()) {
      await server.disconnect();
    }
    jest.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('should successfully connect to AS/400', async () => {
      const result = await server.connect();
      
      expect(result).toBe(true);
      expect(server.isConnected()).toBe(true);
    });

    it('should throw CONNECTION_LOST error on connection failure', async () => {
      // Mock random to trigger connection failure (< 0.05)
      jest.spyOn(Math, 'random').mockReturnValue(0.01);
      
      await expect(server.connect()).rejects.toThrow(AS400Error);
      await expect(server.connect()).rejects.toMatchObject({
        code: 'CONNECTION_LOST',
        message: expect.stringContaining('Failed to establish connection')
      });
    });

    it('should disconnect successfully', async () => {
      await server.connect();
      expect(server.isConnected()).toBe(true);
      
      await server.disconnect();
      expect(server.isConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      await expect(server.disconnect()).resolves.not.toThrow();
      expect(server.isConnected()).toBe(false);
    });

    it('should throw CONNECTION_LOST when running command without connection', async () => {
      await expect(server.runCommand('SELECT * FROM CLAIMS'))
        .rejects
        .toMatchObject({
          code: 'CONNECTION_LOST',
          message: expect.stringContaining('Not connected')
        });
    });
  });

  describe('Command Parsing - SELECT Queries', () => {
    beforeEach(async () => {
      await server.connect();
    });

    it('should execute SELECT * FROM CLAIMS successfully', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('screenBuffer');
      expect(response).toHaveProperty('executionTime');
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.executionTime).toBeGreaterThanOrEqual(1500);
    });

    it('should handle case-insensitive commands', async () => {
      const response = await server.runCommand('select * from claims');
      
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should filter by damageType with WHERE clause', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS WHERE damageType=Fire');
      
      expect(Array.isArray(response.data)).toBe(true);
      response.data.forEach((claim: MockClaim) => {
        expect(claim.damageType).toBe('Fire');
      });
    });

    it('should filter by amount greater than value', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS WHERE amount>25000');
      
      expect(Array.isArray(response.data)).toBe(true);
      response.data.forEach((claim: MockClaim) => {
        expect(claim.amount).toBeGreaterThan(25000);
      });
    });

    it('should filter by amount less than value', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS WHERE amount<10000');
      
      expect(Array.isArray(response.data)).toBe(true);
      response.data.forEach((claim: MockClaim) => {
        expect(claim.amount).toBeLessThan(10000);
      });
    });

    it('should return empty array when no records match WHERE clause', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS WHERE damageType=Earthquake');
      
      expect(response.data).toEqual([]);
    });

    it('should throw INVALID_CMD for unsupported table', async () => {
      await expect(server.runCommand('SELECT * FROM INVALID_TABLE'))
        .rejects
        .toMatchObject({
          code: 'INVALID_CMD',
          message: expect.stringContaining('Only CLAIMS table is supported')
        });
    });

    it('should throw INVALID_CMD for invalid WHERE syntax', async () => {
      await expect(server.runCommand('SELECT * FROM CLAIMS WHERE invalid syntax'))
        .rejects
        .toMatchObject({
          code: 'INVALID_CMD'
        });
    });
  });

  describe('Command Parsing - Other Commands', () => {
    beforeEach(async () => {
      await server.connect();
    });

    it('should execute COUNT query', async () => {
      const response = await server.runCommand('COUNT');
      
      expect(response.data).toHaveLength(1);
      expect(response.data[0]).toHaveProperty('count');
      expect(typeof response.data[0].count).toBe('number');
      expect(response.data[0].count).toBeGreaterThan(0);
    });

    it('should execute SHOW TABLES command', async () => {
      const response = await server.runCommand('SHOW TABLES');
      
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      response.data.forEach((table: any) => {
        expect(table).toHaveProperty('name');
        expect(table).toHaveProperty('records');
      });
    });

    it('should execute INSERT command', async () => {
      const response = await server.runCommand('INSERT INTO CLAIMS VALUES (...)');
      
      expect(response.data).toHaveLength(1);
      expect(response.data[0]).toHaveProperty('success');
      expect(response.data[0].success).toBe(true);
    });

    it('should throw INVALID_CMD for unsupported command', async () => {
      await expect(server.runCommand('DELETE FROM CLAIMS'))
        .rejects
        .toMatchObject({
          code: 'INVALID_CMD',
          message: expect.stringContaining('Unsupported command')
        });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await server.connect();
    });

    it('should throw TIMEOUT error randomly', async () => {
      // Mock random to trigger timeout (< 0.02)
      jest.spyOn(Math, 'random').mockReturnValue(0.01);
      
      await expect(server.runCommand('SELECT * FROM CLAIMS'))
        .rejects
        .toMatchObject({
          code: 'TIMEOUT',
          message: expect.stringContaining('timed out')
        });
    });

    it('should handle empty command string', async () => {
      await expect(server.runCommand(''))
        .rejects
        .toThrow(AS400Error);
    });

    it('should handle malformed SQL syntax', async () => {
      await expect(server.runCommand('SELECT FROM'))
        .rejects
        .toMatchObject({
          code: 'INVALID_CMD'
        });
    });
  });

  describe('Data Structure Validation', () => {
    beforeEach(async () => {
      await server.connect();
    });

    it('should return claims matching MockClaim schema', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      const claim = response.data[0] as MockClaim;
      
      // Validate all required fields exist
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

    it('should validate amount is within range ($1,000 - $50,000)', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      
      response.data.forEach((claim: MockClaim) => {
        expect(claim.amount).toBeGreaterThanOrEqual(1000);
        expect(claim.amount).toBeLessThanOrEqual(50000);
      });
    });

    it('should validate damageType is one of allowed values', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      const allowedTypes = ['Hurricane', 'Fire', 'Theft', 'Vandalism'];
      
      response.data.forEach((claim: MockClaim) => {
        expect(allowedTypes).toContain(claim.damageType);
      });
    });

    it('should validate date is within last 30 days', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      response.data.forEach((claim: MockClaim) => {
        const claimDate = new Date(claim.date);
        expect(claimDate.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
        expect(claimDate.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('should validate location is a non-empty string', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      
      response.data.forEach((claim: MockClaim) => {
        expect(typeof claim.location).toBe('string');
        expect(claim.location.length).toBeGreaterThan(0);
      });
    });

    it('should validate policyNumber format', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      
      response.data.forEach((claim: MockClaim) => {
        expect(claim.policyNumber).toMatch(/^[A-Z]+-\d{7}$/);
      });
    });

    it('should validate status is valid enum value', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      const validStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'DENIED'];
      
      response.data.forEach((claim: MockClaim) => {
        expect(validStatuses).toContain(claim.status);
      });
    });
  });

  describe('LegacyResponse Structure', () => {
    beforeEach(async () => {
      await server.connect();
    });

    it('should return response with correct structure', async () => {
      const response: LegacyResponse = await server.runCommand('SELECT * FROM CLAIMS');
      
      expect(response).toMatchObject({
        data: expect.any(Array),
        screenBuffer: expect.any(String),
        executionTime: expect.any(Number)
      });
    });

    it('should include TN5250 screen buffer for debugging', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      
      expect(response.screenBuffer).toBeDefined();
      expect(response.screenBuffer).toContain('IBM AS/400 SYSTEM');
      expect(response.screenBuffer).toContain('Records Found:');
      expect(response.screenBuffer).toContain('F3=Exit');
    });

    it('should track execution time accurately', async () => {
      const startTime = Date.now();
      const response = await server.runCommand('SELECT * FROM CLAIMS');
      const endTime = Date.now();
      
      expect(response.executionTime).toBeGreaterThanOrEqual(1500);
      expect(response.executionTime).toBeLessThanOrEqual(endTime - startTime + 100);
    });

    it('should include record count in screen buffer', async () => {
      const response = await server.runCommand('SELECT * FROM CLAIMS WHERE damageType=Fire');
      
      expect(response.screenBuffer).toContain(`Records Found: ${response.data.length}`);
    });
  });

  describe('Mock Data Access', () => {
    it('should provide access to mock claims database', () => {
      const mockClaims = server.getMockClaims();
      
      expect(Array.isArray(mockClaims)).toBe(true);
      expect(mockClaims.length).toBeGreaterThan(0);
    });

    it('should return copy of mock claims (not reference)', () => {
      const claims1 = server.getMockClaims();
      const claims2 = server.getMockClaims();
      
      expect(claims1).not.toBe(claims2);
      expect(claims1).toEqual(claims2);
    });
  });

  describe('Performance Requirements', () => {
    beforeEach(async () => {
      await server.connect();
    });

    it('should complete query within reasonable time', async () => {
      const startTime = Date.now();
      await server.runCommand('SELECT * FROM CLAIMS');
      const duration = Date.now() - startTime;
      
      // Should complete within 3 seconds (1500ms delay + overhead)
      expect(duration).toBeLessThan(3000);
    });

    it('should simulate AS/400 delay of 1500ms', async () => {
      const startTime = Date.now();
      await server.runCommand('SELECT * FROM CLAIMS');
      const duration = Date.now() - startTime;
      
      expect(duration).toBeGreaterThanOrEqual(1500);
    });
  });
});
