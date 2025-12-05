/**
 * ClaimRevenant Agent
 * Resurrects insurance claims from email and processes them through AS/400
 * Reduces claim processing time from 45 minutes to under 5 minutes
 * Now with GitHub MCP integration for automatic commit tracking
 */

import { AS400MCPServer, type LegacyResponse } from '../mcp/as400-mcp-server';
import type { MockClaim } from '../mocks/claims.mock';
import { exec } from 'child_process';
import { promisify } from 'util';
import { extractClaimFromEmail, convertRawToEmailClaim, type EmailClaim, type RawClaimData } from '../utils/parser';
import { validateClaim, type NOAAWeatherData, type ValidationResult } from '../utils/validator';
import axios from 'axios';

const execAsync = promisify(exec);

/**
 * Processed claim ready for AS/400 submission
 */
export interface ProcessedClaim extends MockClaim {
  weatherData: NOAAWeatherData;
  validationResult: ValidationResult;
  processingTime: number;
  decision?: 'APPROVE' | 'INVESTIGATE' | 'INVALID_DATA' | 'ERROR';
  gitCommitHash?: string;
  errorDetails?: string;
}

/**
 * REAL NOAA Weather API Wrapper (Powered by OpenWeatherMap)
 * Fallback to simulation if API key is missing
 */
async function fetchNOAAWeather(location: string, date: Date): Promise<NOAAWeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  // Si no hay Key, volvemos al modo simulación
  if (!apiKey) {
    console.warn('[Weather] No OPENWEATHER_API_KEY found. Using simulation.');
    return simulateWeather(location, date);
  }

  try {
    console.log(`[Weather] Fetching real data for ${location}...`);
    
    // 1. Llamada a la API (Usamos unidades imperiales para coincidir con tu demo)
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=imperial`;
    const response = await axios.get(url);
    const data = response.data;

    // 2. Mapeo de datos reales a nuestro formato interno
    const weatherId = data.weather[0].id; // ID numérico del clima
    let event: NOAAWeatherData['event'] = 'Clear';
    let severity: NOAAWeatherData['severity'] = 'minor';

    // Lógica de mapeo simplificada
    if (weatherId >= 200 && weatherId < 300) { event = 'Tornado'; severity = 'severe'; } // Tormentas
    else if (weatherId >= 300 && weatherId < 600) { event = 'Flood'; severity = 'moderate'; } // Lluvia
    else if (weatherId >= 600 && weatherId < 700) { event = 'Hail'; severity = 'moderate'; } // Nieve
    else if (weatherId >= 800) { event = 'Clear'; severity = 'minor'; }

    return {
      location: data.name,
      date: new Date(), // OpenWeather gratuito es tiempo real
      event,
      severity,
      temperature: data.main.temp,
      windSpeed: data.wind.speed,
      precipitation: data.rain ? data.rain['1h'] || 0 : 0
    };

  } catch (error) {
    // HOOK: on-weather-api-fail - Fallback to simulation
    console.warn('[HOOK: on-weather-api-fail] Weather API request failed!');
    console.warn(`   Location: ${location}`);
    console.warn(`   Error: ${error}`);
    console.warn(`   Action: Falling back to location-aware simulation`);
    return simulateWeather(location, date);
  }
}

function simulateWeather(location: string, date: Date): NOAAWeatherData {
   // More realistic simulation based on location
   const locationLower = location.toLowerCase();
   
   // Coastal US locations can have hurricanes
   const coastalUS = ['miami', 'florida', 'houston', 'texas', 'new orleans', 'louisiana', 'carolina'];
   const canHaveHurricane = coastalUS.some(c => locationLower.includes(c));
   
   // Midwest US can have tornadoes
   const midwestUS = ['oklahoma', 'kansas', 'nebraska', 'iowa', 'missouri'];
   const canHaveTornado = midwestUS.some(c => locationLower.includes(c));
   
   // Select realistic events based on location
   let possibleEvents: Array<'Hurricane' | 'Tornado' | 'Hail' | 'Flood' | 'Clear'>;
   
   if (canHaveHurricane) {
     possibleEvents = ['Hurricane', 'Flood', 'Clear', 'Clear']; // Higher chance of hurricane
   } else if (canHaveTornado) {
     possibleEvents = ['Tornado', 'Hail', 'Clear', 'Clear'];
   } else {
     // Most locations: no extreme weather, mostly clear or rain
     possibleEvents = ['Clear', 'Clear', 'Clear', 'Flood']; // 75% clear, 25% rain
   }
   
   const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
   
   // Severity based on event
   let severity: 'minor' | 'moderate' | 'severe' | 'catastrophic' = 'minor';
   if (event === 'Hurricane') severity = Math.random() > 0.5 ? 'severe' : 'catastrophic';
   else if (event === 'Tornado') severity = Math.random() > 0.5 ? 'moderate' : 'severe';
   else if (event === 'Flood') severity = 'moderate';
   
   console.log(`[Weather] SIMULATION MODE: ${location} → ${event} (${severity})`);
   
   return {
    location,
    date,
    event,
    severity,
    temperature: Math.floor(Math.random() * 60) + 40,
    windSpeed: event === 'Hurricane' ? 80 + Math.floor(Math.random() * 70) : Math.floor(Math.random() * 30),
    precipitation: event === 'Clear' ? 0 : Math.random() * 3
   };
}

/**
 * ClaimRevenant Agent - Main orchestrator
 * Coordinates email extraction, weather validation, and AS/400 submission
 */
export class ClaimRevenantAgent {
  private as400Server: AS400MCPServer;
  
  constructor(options: { seed?: string; timeout?: number } = {}) {
    this.as400Server = new AS400MCPServer({
      seed: options.seed || 'frankenstack-2025',
      defaultTimeout: options.timeout || 5000,
      rateLimit: 5
    });
  }
  
  /**
   * Processes a claim from email through to AS/400 submission
   * @param emailId - Email identifier or 'MANUAL_INPUT' for manual claims
   * @param manualData - Optional raw claim data for manual injection
   */
  async processClaim(emailId: string, manualData?: RawClaimData): Promise<ProcessedClaim> {
    const startTime = Date.now();
    
    console.log(`[ClaimRevenant] Starting claim processing for: ${emailId}`);
    
    // STEP 1: Extract claim data from email OR use manual data
    let emailClaim: EmailClaim;
    
    if (manualData) {
      console.log(`[ClaimRevenant] Using manual injection data`);
      emailClaim = convertRawToEmailClaim(manualData);
    } else {
      emailClaim = await extractClaimFromEmail(emailId);
    }
    
    console.log(`[ClaimRevenant] Extracted claim from email: ${emailClaim.subject}`);
    
    // STEP 2: Parse email body into structured claim data
    const parsedClaim = this.parseEmailToClaim(emailClaim);
    console.log(`[ClaimRevenant] Parsed claim ID: ${parsedClaim.id}`);
    
    // FIX: Check for invalid data early
    if (parsedClaim.hasInvalidData) {
      console.log('[ClaimRevenant] Invalid or incomplete email data detected');
      const processingTime = Date.now() - startTime;
      
      return {
        ...parsedClaim,
        weatherData: {
          location: parsedClaim.location,
          date: new Date(),
          event: 'Clear',
          severity: 'minor',
          temperature: 0,
          windSpeed: 0,
          precipitation: 0
        },
        validationResult: {
          isValid: false,
          weatherMatch: false,
          fraudRisk: 'high',
          reasons: ['Invalid or incomplete email data'],
          decision: 'INVALID_DATA'
        },
        processingTime,
        decision: 'INVALID_DATA'
      };
    }
    
    // STEP 3: Parallel validation - fetch weather data and check AS/400 connection
    console.log('[ClaimRevenant] Running parallel validations...');
    
    const [weatherData, connectionStatus] = await Promise.all([
      fetchNOAAWeather(parsedClaim.location, parsedClaim.date),
      this.ensureAS400Connection()
    ]);
    
    console.log(`[ClaimRevenant] Weather data retrieved: ${weatherData.event} (${weatherData.severity})`);
    console.log(`[ClaimRevenant] AS/400 connection: ${connectionStatus ? 'OK' : 'FAILED'}`);

    // ✅ GUARD CLAUSE: Fallo de conexión
    if (!connectionStatus) {
      console.log('[ClaimRevenant] AS/400 connection failed, returning ERROR');
      return {
        ...parsedClaim,
        status: 'ERROR',
        decision: 'ERROR',
        processingTime: Date.now() - startTime,
        validationResult: {
          isValid: false,
          weatherMatch: false,
          fraudRisk: 'high',
          reasons: ['Failed to connect to AS/400'],
          decision: 'INVALID_DATA', // Usamos un tipo válido para ValidationResult
        },
        weatherData,
        gitCommitHash: 'NO_TOKEN',
        errorDetails: 'Failed to connect to AS/400 after retry attempts',
      };
    }
    
    // STEP 4: Validate claim against weather data (USING AI + Vision)
    const imageBase64 = manualData?.imageBase64;
    const validationResult = await validateClaim(parsedClaim, weatherData, imageBase64);
    
    console.log(`[ClaimRevenant] Validation result: ${validationResult.isValid ? 'VALID' : 'INVALID'}`);
    console.log(`[ClaimRevenant] Fraud risk: ${validationResult.fraudRisk}`);
    console.log(`[ClaimRevenant] Decision: ${validationResult.decision}`);
    
    // Imprimir razonamiento de la IA
    if (validationResult.reasons && validationResult.reasons.length > 0) {
        console.log('🧠 [AI Reasoning]:');
        validationResult.reasons.forEach(r => console.log(`   - ${r}`));
    }

    // STEP 5: Submit to AS/400 if approved
    let gitCommitHash: string | undefined;
    const decision = validationResult.decision;

    if (decision === 'APPROVE') {
      // Si se aprueba, lo guardamos en el AS/400
      const submitResult = await this.submitToAS400(parsedClaim);
      
      // ✅ GUARD CLAUSE: Fallo de envío
      if (!submitResult) {
        console.log('[ClaimRevenant] AS/400 submission failed, returning error status');
        return {
          ...parsedClaim,
          weatherData,
          validationResult,
          processingTime: Date.now() - startTime,
          decision,
          gitCommitHash,
          status: 'SUBMIT_FAILED',
          errorDetails: 'AS/400 submission returned undefined',
        };
      }
      
      console.log(`[ClaimRevenant] Successfully submitted approved claim to AS/400`);
    } else {
      console.log(`[ClaimRevenant] Claim flagged as ${decision}. Skipping AS/400 submit.`);
    }
    
    // STEP 6: Commit decision to GitHub using MCP
    try {
      gitCommitHash = await this.commitDecisionToGitHub(parsedClaim.id, decision);
      console.log(`[ClaimRevenant] Decision committed to GitHub: ${gitCommitHash}`);
    } catch (error) {
      console.error('[ClaimRevenant] Failed to commit to GitHub:', error);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`[ClaimRevenant] Total processing time: ${processingTime}ms`);
    
    return {
      ...parsedClaim,
      weatherData,
      validationResult,
      processingTime,
      decision,
      gitCommitHash
    };
  }

  /**
   * Parses email body into structured claim data
   */
  private parseEmailToClaim(email: EmailClaim): MockClaim & { hasInvalidData?: boolean } {
    const body = email.body;
    
    const policyMatch = body.match(/Policy Number:\s*([A-Z]+-\d+)/);
    const claimantMatch = body.match(/Claimant:\s*([^\n]+)/);
    const dateMatch = body.match(/Date of Loss:\s*([^\n]+)/);
    const locationMatch = body.match(/Location:\s*([^\n]+)/);
    const damageMatch = body.match(/Damage Type:\s*(Hurricane|Fire|Flood|Theft|Vandalism)/);
    const costMatch = body.match(/Estimated Cost:\s*\$?([\d,]+)/);
    const detailsMatch = body.match(/Details:\s*(.+?)(?:\n|$)/s);
    
    const year = new Date().getFullYear();
    const sequence = Math.floor(Math.random() * 900) + 100;
    const claimId = `CLM-${year}-${sequence}`;
    
    let amount = 0;
    if (costMatch) {
      const parsedAmount = parseInt(costMatch[1].replace(/,/g, ''), 10);
      amount = isNaN(parsedAmount) ? 0 : parsedAmount;
    }
    
    // Extract user description from Details field
    const userDescription = detailsMatch?.[1]?.trim() || email.subject || 'No description provided';
    
    const hasInvalidData = !policyMatch || !claimantMatch || !damageMatch || amount === 0;
    
    return {
      id: claimId,
      policyNumber: policyMatch?.[1] || 'UNKNOWN',
      claimantName: claimantMatch?.[1]?.trim() || 'Unknown Claimant',
      date: dateMatch ? new Date(dateMatch[1]) : new Date(),
      location: locationMatch?.[1]?.trim() || 'Unknown Location',
      damageType: (damageMatch?.[1] as any) || 'Fire',
      amount,
      status: 'PENDING',
      description: userDescription,
      hasInvalidData
    };
  }
  
  /**
   * Ensures AS/400 connection is established with RETRIES
   */
  private async ensureAS400Connection(): Promise<boolean> {
    if (this.as400Server.isConnected()) {
      console.log('[ClaimRevenant] AS/400 already connected');
      return true;
    }
    
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ClaimRevenant] AS/400 Connection attempt ${attempt}...`);
        await this.as400Server.connect();
        return true; // ¡Éxito!
      } catch (error) {
        console.error(`[ClaimRevenant] AS/400 attempt ${attempt} failed:`, (error as Error).message);
        if (attempt === maxRetries) {
          console.error('[ClaimRevenant] Max connection retries reached. Failing.');
          return false; // Falló todas las veces
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return false;
  }

  /**
   * Submits validated claim to AS/400 legacy system
   */
  private async submitToAS400(claim: MockClaim): Promise<LegacyResponse | undefined> {
    const insertCommand = `INSERT INTO CLAIMS VALUES (
      '${claim.id}',
      '${claim.policyNumber}',
      '${claim.claimantName}',
      '${claim.location}',
      '${claim.damageType}',
      ${claim.amount},
      '${claim.date.toISOString()}',
      '${claim.status}'
    )`;
    
    try {
      const queryStart = Date.now();
      const response = await this.as400Server.runCommand(insertCommand);
      const queryDuration = Date.now() - queryStart;
      
      // HOOK: on-legacy-query - Log performance metrics
      console.log(`[HOOK: on-legacy-query] AS/400 query executed`);
      console.log(`   Command: INSERT INTO CLAIMS...`);
      console.log(`   Duration: ${queryDuration}ms`);
      
      if (queryDuration > 3000) {
        console.warn(`[HOOK: on-legacy-query] ⚠️ SLOW QUERY DETECTED (${queryDuration}ms > 3000ms threshold)`);
      }
      
      if (!response) {
        console.warn('[ClaimRevenant] AS/400 returned undefined response. Skipping submit.');
        return undefined;
      }
      
      console.log(`[ClaimRevenant] AS/400 response time: ${response.executionTime}ms`);
      return response;
    } catch (error) {
      console.error('[ClaimRevenant] Failed to submit to AS/400:', error);
      return undefined; // Resiliencia: no lanzar error
    }
  }
  
  async batchProcessClaims(emailIds: string[]): Promise<ProcessedClaim[]> {
    console.log(`[ClaimRevenant] Batch processing ${emailIds.length} claims`);
    
    const results = await Promise.all(
      emailIds.map(emailId => this.processClaim(emailId))
    );
    
    const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    const avgTime = totalTime / results.length;
    
    console.log(`[ClaimRevenant] Batch complete - Average time: ${avgTime.toFixed(0)}ms per claim`);
    
    return results;
  }
  
  generateReport(processedClaims: ProcessedClaim[]): string {
    const total = processedClaims.length;
    const valid = processedClaims.filter(c => c.validationResult.isValid).length;
    const highRisk = processedClaims.filter(c => c.validationResult.fraudRisk === 'high').length;
    const avgTime = processedClaims.reduce((sum, c) => sum + c.processingTime, 0) / total;
    
    return `
=== ClaimRevenant Processing Report ===
Total Claims Processed: ${total}
Valid Claims: ${valid} (${((valid/total)*100).toFixed(1)}%)
High Risk Claims: ${highRisk} (${((highRisk/total)*100).toFixed(1)}%)
Average Processing Time: ${avgTime.toFixed(0)}ms
Target Met: ${avgTime < 300000 ? 'YES (<5min)' : 'NO'}
    `.trim();
  }
  
  private async commitDecisionToGitHub(
    claimId: string,
    decision: 'APPROVE' | 'INVESTIGATE' | 'INVALID_DATA'
  ): Promise<string> {
    const commitMessage = `[Agent] Processed claim ${claimId}. Decision: ${decision}`;
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - Claim ${claimId}: ${decision}`;
    
    console.log(`[HOOK: git-auto-commit] Attempting to commit decision...`);
    console.log(`   Claim: ${claimId}`);
    console.log(`   Decision: ${decision}`);
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Write to log file using Node.js fs (works on all platforms)
      const logPath = path.join(process.cwd(), '.kiro', 'logs', 'agent-decisions.log');
      
      // Ensure directory exists
      const logDir = path.dirname(logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // Append to log file
      fs.appendFileSync(logPath, logEntry + '\n');
      console.log(`[HOOK: git-auto-commit] Log entry written to ${logPath}`);
      
      // Check if we're in a git repository
      try {
        await execAsync('git rev-parse --git-dir');
      } catch {
        console.warn('[HOOK: git-auto-commit] Not in a git repository (production mode). Skipping commit.');
        return `LOG_ONLY_${Date.now().toString(36)}`;
      }
      
      const githubToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
      
      if (!githubToken) {
        console.warn('[HOOK: git-auto-commit] GITHUB_PERSONAL_ACCESS_TOKEN not set. Log saved but not committed.');
        return `NO_TOKEN_${Date.now().toString(36)}`;
      }
      
      // Git add
      await execAsync('git add .kiro/logs/agent-decisions.log');
      
      // Git commit
      const { stdout: commitOutput } = await execAsync(
        `git commit -m "${commitMessage}" --allow-empty`
      );
      
      const hashMatch = commitOutput.match(/\[[\w-]+ ([a-f0-9]+)\]/);
      const commitHash = hashMatch ? hashMatch[1] : `COMMIT_${Date.now().toString(36)}`;
      
      console.log(`[HOOK: git-auto-commit] ✅ Git commit created: ${commitHash}`);
      
      return commitHash;
      
    } catch (error) {
      console.error('[HOOK: git-auto-commit] Git operation failed:', error);
      // Return a mock hash so the flow continues
      return `ERROR_${Date.now().toString(36)}`;
    }
  }
  
  async cleanup(): Promise<void> {
    if (this.as400Server.isConnected()) {
      await this.as400Server.disconnect();
      console.log('[ClaimRevenant] Cleanup complete');
    }
  }
}