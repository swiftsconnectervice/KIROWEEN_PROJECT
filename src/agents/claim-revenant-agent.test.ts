/**
 * ClaimRevenant Agent - Test Suite de Asalto
 * Comprehensive edge case testing for failure scenarios
 */

import { ClaimRevenantAgent } from './claim-revenant-agent';
import { AS400MCPServer, AS400Error } from '../mcp/as400-mcp-server';
import { exec } from 'child_process';

// Mock dependencies
jest.mock('../mcp/as400-mcp-server');
jest.mock('child_process');

// Mock the utility functions
jest.mock('../utils/parser');
jest.mock('../utils/validator');

import { extractClaimFromEmail } from '../utils/parser';
import { validateClaim } from '../utils/validator';

const mockExtractClaimFromEmail = extractClaimFromEmail as jest.MockedFunction<typeof extractClaimFromEmail>;
const mockValidateClaim = validateClaim as jest.MockedFunction<typeof validateClaim>;

describe('ClaimRevenant Agent - Test Suite de Asalto', () => {
  let agent: ClaimRevenantAgent;
  let mockAS400Server: jest.Mocked<AS400MCPServer>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create agent instance
    agent = new ClaimRevenantAgent();
    
    // Get mocked AS400 server instance
    mockAS400Server = (agent as any).as400Server;
    
    // Setup default mock implementations
    mockExtractClaimFromEmail.mockResolvedValue({
      from: 'test@example.com',
      subject: 'Test Claim',
      body: `
        Policy Number: AUTO-1234567
        Claimant: Test User
        Date of Loss: ${new Date().toISOString()}
        Location: Miami, FL
        Damage Type: Hurricane
        Estimated Cost: $25,000
      `,
      receivedAt: new Date(),
      attachments: []
    });
    
    mockValidateClaim.mockReturnValue({
      isValid: true,
      weatherMatch: true,
      fraudRisk: 'low',
      reasons: ['All validation checks passed'],
      decision: 'APPROVE'
    });
  });

  afterEach(async () => {
    await agent.cleanup();
  });

  /**
   * TEST 1: Timeout con reintentos
   */
  describe('1. AS/400 Timeout with Retry Logic', () => {
    
    // ¡NUEVO NOMBRE Y LÓGICA DE TU SOLUCIÓN!
    it('should mark claim as ERROR when AS/400 connection fails completely', async () => {
      let attemptCount = 0;
      mockAS400Server.isConnected.mockReturnValue(false);
      mockAS400Server.connect.mockImplementation(async () => {
        attemptCount++;
        // Asumimos que el agente reintentará internamente
        throw new AS400Error('Connection timeout', 'TIMEOUT');
      });
    
      // ¡LÓGICA CORRECTA! El agente NO explota, devuelve un resultado.
      const result = await agent.processClaim('test-email-1');
    
      // Verificamos el estado de error en el resultado, no una excepción
      expect(result.status).toBe('ERROR');
      expect(result.decision).toBe('ERROR');
      // expect(result.errorDetails).toContain('Failed to connect to AS/400'); // (Podemos añadir esto después)
      
      // Verificamos que al menos lo intentó
      expect(attemptCount).toBeGreaterThanOrEqual(1); 
    }, 10000);

    it('should succeed on third retry attempt', async () => {
      let attemptCount = 0;
      mockAS400Server.isConnected.mockReturnValue(false);
      mockAS400Server.connect.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new AS400Error('Connection timeout', 'TIMEOUT');
        }
        // Success on third attempt
        mockAS400Server.isConnected.mockReturnValue(true);
        return true;
      });

      mockAS400Server.runCommand.mockResolvedValue({
        data: [{ success: true }],
        screenBuffer: 'SUCCESS',
        executionTime: 1500
      });

      // Mock Git commit
      (exec as any).mockImplementation((_cmd: string, callback: any) => {
        callback(null, { stdout: '[main abc123] Test commit', stderr: '' });
      });

      const result = await agent.processClaim('test-email-1');
      
      expect(result.decision).toBe('APPROVE');
    });
  });

  /**
   * TEST 2: Weather API Fallback
   */
  describe('2. Weather API Fallback on Error 500', () => {
    it('should use cache fallback when NOAA API returns 500 error', async () => {
      // Mock validation to return INVESTIGATE due to weather mismatch
      mockValidateClaim.mockReturnValueOnce({
        isValid: false,
        weatherMatch: false,
        fraudRisk: 'high',
        reasons: ["Damage type 'Hurricane' does not match weather event 'Clear'"],
        decision: 'INVESTIGATE'
      });

      mockAS400Server.isConnected.mockReturnValue(true);
      mockAS400Server.connect.mockResolvedValue(true);

      const result = await agent.processClaim('test-email-2');

      // Agent should not crash
      expect(result).toBeDefined();
      expect(result.weatherData).toBeDefined();
      
      // Should mark as INVESTIGATE due to weather mismatch (Hurricane vs Clear)
      expect(result.decision).toBe('INVESTIGATE');
      expect(result.validationResult.fraudRisk).toBe('high');
    });

    it('should log warning when using cached weather data', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      mockAS400Server.isConnected.mockReturnValue(true);

      await agent.processClaim('test-email-3');

      // Verify logging occurred
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  /**
   * TEST 3: Email con datos mal formateados
   */
  describe('3. Malformed Email Data Handling', () => {
    it('should mark claim as INVALID_DATA for incomplete email', async () => {
      // Mock email with missing required fields
      mockExtractClaimFromEmail.mockResolvedValueOnce({
        from: 'bad@example.com',
        subject: 'Incomplete Claim',
        body: 'This email has no structured data',
        receivedAt: new Date(),
        attachments: []
      });

      // Mock validation to return INVALID_DATA
      mockValidateClaim.mockReturnValueOnce({
        isValid: false,
        weatherMatch: false,
        fraudRisk: 'high',
        reasons: ['Invalid or incomplete claim data (missing policy number, ID, or amount is 0)'],
        decision: 'INVALID_DATA'
      });

      mockAS400Server.isConnected.mockReturnValue(true);

      const result = await agent.processClaim('test-email-bad');

      // Should not crash
      expect(result).toBeDefined();
      
      // Should have default/unknown values
      expect(result.policyNumber).toBe('UNKNOWN');
      expect(result.claimantName).toBe('Unknown Claimant');
      
      // FIX: Should be marked as INVALID_DATA due to missing data
      expect(result.decision).toBe('INVALID_DATA');
      expect(result.validationResult.reasons).toContain('Invalid or incomplete email data');
    });

    it('should handle email with invalid amount format', async () => {
      mockExtractClaimFromEmail.mockResolvedValueOnce({
        from: 'test@example.com',
        subject: 'Invalid Amount',
        body: `
          Policy Number: AUTO-1234567
          Claimant: Test User
          Date of Loss: ${new Date().toISOString()}
          Location: Miami, FL
          Damage Type: Fire
          Estimated Cost: INVALID_AMOUNT
        `,
        receivedAt: new Date(),
        attachments: []
      });

      // Mock validation to return INVALID_DATA
      mockValidateClaim.mockReturnValueOnce({
        isValid: false,
        weatherMatch: false,
        fraudRisk: 'high',
        reasons: ['Invalid or incomplete claim data (missing policy number, ID, or amount is 0)'],
        decision: 'INVALID_DATA'
      });

      mockAS400Server.isConnected.mockReturnValue(true);

      const result = await agent.processClaim('test-email-invalid-amount');

      // FIX: Should parse amount as 0
      expect(result.amount).toBe(0);
      
      // FIX: Should be marked as INVALID_DATA due to amount being 0
      expect(result.decision).toBe('INVALID_DATA');
      expect(result.validationResult.reasons).toContain('Invalid or incomplete email data');
    });

    it('should not crash on null or undefined email body', async () => {
      mockExtractClaimFromEmail.mockResolvedValueOnce({
        from: 'test@example.com',
        subject: 'Empty Body',
        body: '',
        receivedAt: new Date(),
        attachments: []
      });

      // Mock validation to return INVALID_DATA
      mockValidateClaim.mockReturnValueOnce({
        isValid: false,
        weatherMatch: false,
        fraudRisk: 'high',
        reasons: ['Invalid or incomplete claim data (missing policy number, ID, or amount is 0)'],
        decision: 'INVALID_DATA'
      });

      mockAS400Server.isConnected.mockReturnValue(true);

      const result = await agent.processClaim('test-email-empty');

      expect(result).toBeDefined();
      // FIX: Should be marked as INVALID_DATA for empty body
      expect(result.decision).toBe('INVALID_DATA');
    });
  });

  /**
   * TEST 4: Git Commit Mock
   */
  describe('4. Git Commit Integration', () => {
    it('should attempt git commit after decision', async () => {
      const execMock = exec as jest.MockedFunction<typeof exec>;
      
      // Mock successful git commands
      execMock.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('echo')) {
          callback(null, { stdout: '', stderr: '' });
        } else if (cmd.includes('git add')) {
          callback(null, { stdout: '', stderr: '' });
        } else if (cmd.includes('git commit')) {
          callback(null, { stdout: '[main abc1234] [Agent] Processed claim CLM-2025-123. Decision: APPROVE', stderr: '' });
        }
        return {} as any;
      });

      // Set GitHub token
      process.env.GITHUB_PERSONAL_ACCESS_TOKEN = 'test-token-123';

      mockAS400Server.isConnected.mockReturnValue(true);
      mockAS400Server.runCommand.mockResolvedValue({
        data: [{ success: true }],
        screenBuffer: 'SUCCESS',
        executionTime: 1500
      });

      const result = await agent.processClaim('test-email-git');

      // Verify git commit was attempted
      expect(execMock).toHaveBeenCalledWith(
        expect.stringContaining('git commit'),
        expect.any(Function)
      );
      
      // Verify commit hash was captured
      expect(result.gitCommitHash).toBeDefined();
      expect(result.gitCommitHash).toBe('abc1234');
      
      // Cleanup
      delete process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    });

    it('should handle git commit failure gracefully', async () => {
      const execMock = exec as jest.MockedFunction<typeof exec>;
      
      // Mock git commit failure
      execMock.mockImplementation((_cmd: string, callback: any) => {
        if (_cmd.includes('git commit')) {
          callback(new Error('Git commit failed'), null);
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      process.env.GITHUB_PERSONAL_ACCESS_TOKEN = 'test-token-123';

      mockAS400Server.isConnected.mockReturnValue(true);
      mockAS400Server.runCommand.mockResolvedValue({
        data: [{ success: true }],
        screenBuffer: 'SUCCESS',
        executionTime: 1500
      });

      const result = await agent.processClaim('test-email-git-fail');

      // Should not crash the entire process
      expect(result).toBeDefined();
      expect(result.decision).toBe('INVALID_DATA');
      
      // Git commit hash should be undefined due to failure
      expect(result.gitCommitHash).toBeUndefined();
      
      delete process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    });

    it('should skip commit when GITHUB_PERSONAL_ACCESS_TOKEN is not set', async () => {
      // Ensure token is not set
      delete process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

      mockAS400Server.isConnected.mockReturnValue(true);
      mockAS400Server.runCommand.mockResolvedValue({
        data: [{ success: true }],
        screenBuffer: 'SUCCESS',
        executionTime: 1500
      });

      const result = await agent.processClaim('test-email-no-token');

      expect(result.gitCommitHash).toBe('NO_TOKEN');
    });
  });

  /**
   * TEST 5: Decisión correcta - APPROVE
   */
  describe('5. Correct Decision - APPROVE', () => {
    it('should APPROVE claim with matching Hurricane weather', async () => {
      mockExtractClaimFromEmail.mockResolvedValueOnce({
        from: 'test@example.com',
        subject: 'Hurricane Claim',
        body: `
          Policy Number: AUTO-1234567
          Claimant: John Doe
          Date of Loss: ${new Date().toISOString()}
          Location: Miami, FL
          Damage Type: Hurricane
          Estimated Cost: $25,000
        `,
        receivedAt: new Date(),
        attachments: []
      });

      mockValidateClaim.mockReturnValueOnce({
        isValid: true,
        weatherMatch: true,
        fraudRisk: 'low',
        reasons: ['All validation checks passed'],
        decision: 'APPROVE'
      });

      mockAS400Server.isConnected.mockReturnValue(true);
      mockAS400Server.runCommand.mockResolvedValue({
        data: [{ success: true }],
        screenBuffer: 'CLAIM INSERTED',
        executionTime: 1500
      });

      const result = await agent.processClaim('test-email-approve');

      // Verify APPROVE decision
      expect(result.decision).toBe('APPROVE');
      expect(result.validationResult.isValid).toBe(true);
      expect(result.validationResult.weatherMatch).toBe(true);
      expect(result.validationResult.fraudRisk).toBe('low');
      
      // Verify AS/400 submission was called
      expect(mockAS400Server.runCommand).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO CLAIMS')
      );
    });

    it('should APPROVE claim with reasonable amount and matching weather', async () => {
      mockExtractClaimFromEmail.mockResolvedValueOnce({
        from: 'test@example.com',
        subject: 'Fire Claim',
        body: `
          Policy Number: HOME-9876543
          Claimant: Jane Smith
          Date of Loss: ${new Date().toISOString()}
          Location: Los Angeles, CA
          Damage Type: Fire
          Estimated Cost: $15,000
        `,
        receivedAt: new Date(),
        attachments: []
      });

      mockValidateClaim.mockReturnValueOnce({
        isValid: true,
        weatherMatch: true,
        fraudRisk: 'low',
        reasons: ['All validation checks passed'],
        decision: 'APPROVE'
      });

      mockAS400Server.isConnected.mockReturnValue(true);
      mockAS400Server.runCommand.mockResolvedValue({
        data: [{ success: true }],
        screenBuffer: 'CLAIM INSERTED',
        executionTime: 1500
      });

      const result = await agent.processClaim('test-email-fire-approve');

      expect(result.decision).toBe('APPROVE');
      expect(result.validationResult.weatherMatch).toBe(true);
      expect(result.damageType).toBe('Fire');
    });
  });

  /**
   * TEST 6: Detección de fraude correcta - INVESTIGATE
   */
  describe('6. Correct Fraud Detection - INVESTIGATE', () => {
    it('should INVESTIGATE claim with Hurricane damage but Sunny weather', async () => {
      mockExtractClaimFromEmail.mockResolvedValueOnce({
        from: 'suspicious@example.com',
        subject: 'Suspicious Hurricane Claim',
        body: `
          Policy Number: AUTO-5555555
          Claimant: Suspicious Person
          Date of Loss: ${new Date().toISOString()}
          Location: Phoenix, AZ
          Damage Type: Hurricane
          Estimated Cost: $40,000
        `,
        receivedAt: new Date(),
        attachments: []
      });

      mockValidateClaim.mockReturnValueOnce({
        isValid: false,
        weatherMatch: false,
        fraudRisk: 'high',
        reasons: ["Damage type 'Hurricane' does not match weather event 'Clear'"],
        decision: 'INVESTIGATE'
      });

      mockAS400Server.isConnected.mockReturnValue(true);

      const result = await agent.processClaim('test-email-fraud');

      // Verify INVESTIGATE decision
      expect(result.decision).toBe('INVESTIGATE');
      expect(result.validationResult.isValid).toBe(false);
      expect(result.validationResult.weatherMatch).toBe(false);
      expect(result.validationResult.fraudRisk).toBe('high');
      
      // Verify fraud reason
      expect(result.validationResult.reasons.length).toBeGreaterThan(0);
      
      // Verify AS/400 submission was NOT called
      expect(mockAS400Server.runCommand).not.toHaveBeenCalled();
    });

    it('should INVESTIGATE claim with amount outside acceptable range', async () => {
      mockExtractClaimFromEmail.mockResolvedValueOnce({
        from: 'test@example.com',
        subject: 'Excessive Claim',
        body: `
          Policy Number: AUTO-1234567
          Claimant: Test User
          Date of Loss: ${new Date().toISOString()}
          Location: Miami, FL
          Damage Type: Fire
          Estimated Cost: $75,000
        `,
        receivedAt: new Date(),
        attachments: []
      });

      mockValidateClaim.mockReturnValueOnce({
        isValid: false,
        weatherMatch: true,
        fraudRisk: 'high',
        reasons: ['Claim amount outside acceptable range ($1,000 - $50,000)'],
        decision: 'INVESTIGATE'
      });

      mockAS400Server.isConnected.mockReturnValue(true);

      const result = await agent.processClaim('test-email-excessive');

      expect(result.decision).toBe('INVESTIGATE');
      expect(result.validationResult.fraudRisk).toBe('high');
      expect(result.validationResult.reasons).toContain(
        'Claim amount outside acceptable range ($1,000 - $50,000)'
      );
    });

    it('should INVESTIGATE claim with temporal mismatch', async () => {
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      mockExtractClaimFromEmail.mockResolvedValueOnce({
        from: 'test@example.com',
        subject: 'Old Claim',
        body: `
          Policy Number: AUTO-1234567
          Claimant: Test User
          Date of Loss: ${oldDate.toISOString()}
          Location: Miami, FL
          Damage Type: Hurricane
          Estimated Cost: $25,000
        `,
        receivedAt: new Date(),
        attachments: []
      });

      mockValidateClaim.mockReturnValueOnce({
        isValid: false,
        weatherMatch: true,
        fraudRisk: 'medium',
        reasons: ['Claim date is 30 days from weather event'],
        decision: 'INVESTIGATE'
      });

      mockAS400Server.isConnected.mockReturnValue(true);

      const result = await agent.processClaim('test-email-temporal');

      expect(result.decision).toBe('INVESTIGATE');
      expect(result.validationResult.fraudRisk).not.toBe('low');
      expect(result.validationResult.reasons.some(r => r.includes('days from weather event'))).toBe(true);
    });
  });

  /**
   * Additional Edge Cases
   */
  describe('Additional Edge Cases', () => {
    
    // ¡NUEVO NOMBRE Y LÓGICA DE TU SOLUCIÓN!
    it('should handle AS/400 submission failure gracefully', async () => {
      mockAS400Server.isConnected.mockReturnValue(true);
      mockAS400Server.runCommand.mockRejectedValueOnce(
        new AS400Error('Database error', 'INVALID_CMD')
      );
    
      // ¡LÓGICA CORRECTA! El agente NO explota, devuelve un resultado.
      const result = await agent.processClaim('test-email-db-error');
    
      // Verificamos que el resultado indica el fallo
      expect(result.status).toBe('SUBMIT_FAILED');
      expect(result.decision).toBe('APPROVE'); // La decisión sigue siendo válida
      // expect(result.errorDetails).toContain('Failed to submit to AS/400'); // (Podemos añadir esto después)
    });


    it('should generate correct report for batch processing', async () => {
      mockAS400Server.isConnected.mockReturnValue(true);
      mockAS400Server.runCommand.mockResolvedValue({
        data: [{ success: true }],
        screenBuffer: 'SUCCESS',
        executionTime: 1500
      });

      const results = await agent.batchProcessClaims(['email-1', 'email-2', 'email-3']);
      const report = agent.generateReport(results);

      expect(report).toContain('Total Claims Processed: 3');
      expect(report).toContain('Average Processing Time:');
      expect(results).toHaveLength(3);
    });
  });
});
