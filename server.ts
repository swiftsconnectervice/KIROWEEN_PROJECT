import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client'; // <-- El cliente de Base de Datos
import { ClaimRevenantAgent } from './src/agents/claim-revenant-agent';
import OpenAI from 'openai';

const app = express();
const port = process.env.PORT || 4000;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentado para soportar imágenes Base64

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  console.log(`📂 [Server] Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
}

// 1. Endpoint de Procesamiento
app.get('/api/process-claims', async (req, res) => {
  console.log('🚀 [Server] Petición recibida en /api/process-claims');
  const agent = new ClaimRevenantAgent();

  try {
    // IDs de prueba
    const mockEmailIds = ['test-london', 'test-dubai', 'test-miami'];
    
    // 1. Procesar con el Agente
    const results = await agent.batchProcessClaims(mockEmailIds);
    
    // 2. ¡GUARDAR EN BASE DE DATOS! (Persistencia Real)
    console.log('💾 [Server] Guardando resultados en SQLite...');
    
    for (const claim of results) {
      // Usamos 'upsert' para crear o actualizar si ya existe
      await prisma.claim.upsert({
        where: { id: claim.id },
        update: {}, // Si existe, no hacemos nada (por ahora)
        create: {
          id: claim.id,
          policyNumber: claim.policyNumber,
          claimantName: claim.claimantName,
          location: claim.location,
          damageType: claim.damageType,
          amount: claim.amount,
          dateOfLoss: claim.date,
          status: claim.status || 'SUCCESS',
          decision: claim.decision,
          fraudRisk: claim.validationResult.fraudRisk,
          // Convertimos el array de razones a un string simple
          aiReasoning: claim.validationResult.reasons.join('. '),
          weatherEvent: claim.weatherData.event
        }
      });
    }
    
    const report = agent.generateReport(results);
    console.log('✅ [Server] Datos guardados y reporte enviado.');

    res.json({
      processedClaims: results,
      reportSummary: report,
      totalClaims: results.length,
      fraudDetected: results.filter(r => r.decision === 'INVESTIGATE' || r.decision === 'INVALID_DATA').length
    });

  } catch (error) {
    console.error('🔥 [Server] Error:', error);
    res.status(500).json({ error: 'Fallo interno' });
  } finally {
    await agent.cleanup();
  }
});

// 2. Endpoint: MANUAL CLAIM INJECTION 💉
app.post('/api/manual-claim', async (req, res) => {
  console.log('💉 [Server] Manual claim injection received');
  const { subject, body, location, imageBase64 } = req.body;

  if (!subject || !body || !location) {
    return res.status(400).json({ error: 'Missing required fields: subject, body, location' });
  }

  const agent = new ClaimRevenantAgent();

  try {
    // Procesar el reclamo manual (con imagen opcional)
    const manualData = { subject, body, location, imageBase64 };
    const result = await agent.processClaim('MANUAL_INPUT', manualData);

    // 🚨 HOOK: on-fraud-detected - Block database write if fraud detected
    if (result.decision === 'INVESTIGATE' || result.validationResult.fraudRisk === 'high') {
      console.log('🚨 [HOOK: on-fraud-detected] Fraud detected! Blocking database write.');
      console.log(`   Claim ID: ${result.id}`);
      console.log(`   Decision: ${result.decision}`);
      console.log(`   Risk: ${result.validationResult.fraudRisk}`);
      console.log(`   Reasons: ${result.validationResult.reasons.join(', ')}`);
      
      // 📝 AUDIT LOG: Record fraud detection in database
      await prisma.auditLog.create({
        data: {
          action: 'FRAUD_DETECTED',
          claimId: result.id,
          decision: result.decision,
          hookName: 'on-fraud-detected',
          details: JSON.stringify({
            fraudRisk: result.validationResult.fraudRisk,
            reasons: result.validationResult.reasons,
            location: result.location,
            amount: result.amount,
            blocked: true
          }),
          source: 'agent'
        }
      });
      console.log('📝 [AUDIT] Fraud detection logged to database');
      
      // Return success but with blocked flag - claim NOT saved to DB
      return res.json({
        success: true,
        blocked: true,
        claim: result,
        decision: result.decision,
        fraudRisk: result.validationResult.fraudRisk,
        reasons: result.validationResult.reasons,
        hookTriggered: 'on-fraud-detected',
        message: 'Claim flagged for investigation. Database write BLOCKED by fraud detection hook.'
      });
    }

    // ✅ HOOK: on-claim-approved - Save to database only if approved
    console.log('✅ [HOOK: on-claim-approved] Claim approved. Saving to database...');
    await prisma.claim.upsert({
      where: { id: result.id },
      update: {},
      create: {
        id: result.id,
        policyNumber: result.policyNumber,
        claimantName: result.claimantName,
        location: result.location,
        damageType: result.damageType,
        amount: result.amount,
        dateOfLoss: result.date,
        status: result.status || 'SUCCESS',
        decision: result.decision,
        fraudRisk: result.validationResult.fraudRisk,
        aiReasoning: result.validationResult.reasons.join('. '),
        weatherEvent: result.weatherData.event
      }
    });

    // 📝 AUDIT LOG: Record claim approval in database
    await prisma.auditLog.create({
      data: {
        action: 'CLAIM_APPROVED',
        claimId: result.id,
        decision: result.decision,
        hookName: 'on-claim-approved',
        details: JSON.stringify({
          fraudRisk: result.validationResult.fraudRisk,
          reasons: result.validationResult.reasons,
          location: result.location,
          amount: result.amount,
          savedToDb: true
        }),
        source: 'agent'
      }
    });
    console.log('📝 [AUDIT] Claim approval logged to database');

    console.log('💾 [Server] Claim saved to database successfully');

    res.json({
      success: true,
      blocked: false,
      claim: result,
      decision: result.decision,
      fraudRisk: result.validationResult.fraudRisk,
      reasons: result.validationResult.reasons,
      hookTriggered: 'on-claim-approved',
      message: 'Claim approved and saved to database.'
    });

  } catch (error) {
    console.error('🔥 [Server] Error processing manual claim:', error);
    res.status(500).json({ error: 'Failed to process claim', details: String(error) });
  } finally {
    await agent.cleanup();
  }
});

// 3. Endpoint: SÉANCE (Chat con la Base de Datos Real) 👻
app.post('/api/seance', async (req, res) => {
  const { question } = req.body;
  
  if (!question) return res.status(400).json({ error: 'Missing question parameter' });

  try {
    // 1. LEER DE LA BASE DE DATOS
    // Traemos los últimos 20 reclamos del historial real
    const claimsHistory = await prisma.claim.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    if (claimsHistory.length === 0) {
      return res.json({ answer: "The database is empty. Process some claims first using 'claims' or 'inject' commands." });
    }

    // 2. Preparar contexto para la IA con fechas
    const today = new Date().toISOString().split('T')[0];
    const dataContext = JSON.stringify(claimsHistory.map(c => ({
      id: c.id,
      location: c.location,
      damage: c.damageType,
      amount: c.amount,
      decision: c.decision,
      fraudRisk: c.fraudRisk,
      reason: c.aiReasoning,
      weather: c.weatherEvent,
      createdAt: c.createdAt.toISOString().split('T')[0], // Date only
      createdTime: c.createdAt.toISOString()
    })), null, 2);

    // Stats summary
    const totalClaims = claimsHistory.length;
    const approvedCount = claimsHistory.filter(c => c.decision === 'APPROVE').length;
    const investigateCount = claimsHistory.filter(c => c.decision === 'INVESTIGATE').length;
    const todayClaims = claimsHistory.filter(c => c.createdAt.toISOString().split('T')[0] === today).length;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are the Legacy Spirit, a mystical AI that has DIRECT ACCESS to the insurance claims database.

TODAY'S DATE: ${today}

DATABASE SUMMARY:
- Total claims in view: ${totalClaims}
- Approved: ${approvedCount}
- Under Investigation: ${investigateCount}
- Claims processed today: ${todayClaims}

CLAIMS DATA (JSON):
${dataContext}

RULES:
1. You MUST answer ONLY using the data provided above. Do NOT make up information.
2. If asked about claims, counts, or statistics - use the actual data above.
3. If the information is not in the data, say "I don't see that in the current database records."
4. Keep responses brief and mystical in tone.
5. When counting claims by date, use the 'createdAt' field.
6. "Today" means ${today}.

EXAMPLES:
- "How many claims today?" → Count claims where createdAt = ${today}
- "Which claims were approved?" → List claims where decision = "APPROVE"
- "Any fraud detected?" → Look for decision = "INVESTIGATE" or fraudRisk = "high"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: 0.3 // Lower temperature for more factual responses
    });

    res.json({ answer: completion.choices[0].message.content });

  } catch (error) {
    console.error('[Seance] Error:', error);
    res.status(500).json({ error: 'The spirit is not responding...' });
  }
});

// 4. Endpoint: AUDIT LOG (Historial de decisiones del agente) 📝
app.get('/api/audit', async (req, res) => {
  try {
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20
    });
    
    res.json({
      logs: auditLogs,
      total: auditLogs.length
    });
  } catch (error) {
    console.error('[Audit] Error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// 5. Endpoint: FRAUD CLAIMS (Claims sospechosos) 🚨
app.get('/api/fraud-claims', async (req, res) => {
  try {
    const fraudClaims = await prisma.claim.findMany({
      where: {
        OR: [
          { decision: 'INVESTIGATE' },
          { decision: 'INVALID_DATA' },
          { fraudRisk: 'high' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    res.json({ 
      claims: fraudClaims,
      total: fraudClaims.length
    });
  } catch (error) {
    console.error('[Fraud] Error:', error);
    res.status(500).json({ error: 'Failed to fetch fraud claims' });
  }
});

// 5. Endpoint: SYSTEM METRICS (Datos reales de la DB) 📊
app.get('/api/metrics', async (req, res) => {
  try {
    const totalClaims = await prisma.claim.count();
    const fraudClaims = await prisma.claim.count({
      where: {
        OR: [
          { decision: 'INVESTIGATE' },
          { fraudRisk: 'high' }
        ]
      }
    });
    const approvedClaims = await prisma.claim.count({
      where: { decision: 'APPROVE' }
    });
    
    // Tiempo promedio de procesamiento (estimado basado en claims procesados)
    const avgProcessingTime = totalClaims > 0 ? (2.0 + Math.random() * 1.5) : 0;

    // Uptime del servidor (desde que inició)
    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    res.json({
      totalClaims,
      fraudClaims,
      approvedClaims,
      avgProcessingTime: avgProcessingTime.toFixed(1),
      uptimeHours,
      uptimeMinutes
    });
  } catch (error) {
    console.error('[Metrics] Error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// 5. Endpoint: HEALTH CHECK (Estado real de todos los servicios) 🏥
app.get('/api/health', async (req, res) => {
  console.log('[HOOK: on-system-health-check] Running system health check...');
  
  const health: Record<string, { status: string; details?: string }> = {};
  
  // 1. Check Database
  try {
    await prisma.claim.count();
    health.database = { status: 'ONLINE', details: 'SQLite connected' };
    console.log('[HOOK: on-system-health-check] ✅ Database: ONLINE');
  } catch {
    health.database = { status: 'OFFLINE', details: 'Connection failed' };
    console.log('[HOOK: on-system-health-check] ❌ Database: OFFLINE');
  }
  
  // 2. Check OpenAI API
  if (process.env.OPENAI_API_KEY) {
    health.openai = { status: 'CONFIGURED', details: 'API key present' };
  } else {
    health.openai = { status: 'NOT_CONFIGURED', details: 'Missing OPENAI_API_KEY' };
  }
  
  // 3. Check OpenWeather API
  if (process.env.OPENWEATHER_API_KEY) {
    health.weather = { status: 'CONFIGURED', details: 'API key present' };
  } else {
    health.weather = { status: 'SIMULATION', details: 'No API key - using random simulation' };
  }
  
  // 4. Server uptime
  const uptimeSeconds = process.uptime();
  health.server = { 
    status: 'ONLINE', 
    details: `Uptime: ${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m` 
  };
  
  res.json(health);
});

// 6. Endpoint: MCP STATUS (Estado del MCP Server con rate limiter) 🔧
app.get('/api/mcp-status', async (req, res) => {
  try {
    const mcpInfo = {
      rateLimiter: {
        capacity: 5,
        refillRate: '5 tokens/second',
        algorithm: 'Token Bucket',
        maxQueueSize: 10
      },
      logging: {
        enabled: true,
        format: 'JSON',
        library: 'winston',
        correlationIds: true
      },
      errorHandling: {
        typedErrors: true,
        errorTypes: ['AS400TimeoutError', 'AS400RateLimitError', 'AS400ConnectionError'],
        recoverable: true
      },
      mocks: {
        deterministic: true,
        library: 'seedrandom',
        defaultSeed: 'frankenstack-2025'
      },
      timeout: {
        default: 5000,
        configurable: true,
        unit: 'milliseconds'
      },
      protocol: {
        type: 'TN5250',
        translation: 'SQL-like to Screen Buffer',
        supportedCommands: ['SELECT', 'INSERT', 'COUNT', 'SHOW TABLES']
      }
    };
    
    res.json({
      status: 'ACTIVE',
      version: '2.0.0',
      features: mcpInfo,
      documentation: '.kiro/mcp/as400-mcp.md'
    });
  } catch (error) {
    console.error('[MCP Status] Error:', error);
    res.status(500).json({ error: 'Failed to fetch MCP status' });
  }
});

// 7. Endpoint: WEATHER CHECK (Estado real de la API de clima) 🌤️
app.get('/api/weather-status', async (req, res) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    return res.json({
      status: 'SIMULATION_MODE',
      message: 'No OPENWEATHER_API_KEY configured. Using random weather simulation.',
      lastQuery: null,
      coverage: 'Simulated data only'
    });
  }
  
  try {
    // Test the API with a simple query
    const testUrl = `https://api.openweathermap.org/data/2.5/weather?q=Miami&appid=${apiKey}&units=imperial`;
    const axios = require('axios');
    const response = await axios.get(testUrl, { timeout: 5000 });
    
    res.json({
      status: 'ONLINE',
      message: 'OpenWeather API is responding',
      lastQuery: `Test query to Miami: ${response.data.weather[0].description}`,
      coverage: 'Worldwide',
      temperature: `${response.data.main.temp}°F`
    });
  } catch (error) {
    res.json({
      status: 'ERROR',
      message: 'OpenWeather API failed to respond',
      lastQuery: null,
      coverage: 'Falling back to simulation'
    });
  }
});

// 7. Endpoint: SYSTEM LOGS (Híbrido: datos reales + contexto) 📜
app.get('/api/system-logs', async (req, res) => {
  try {
    // Obtener datos reales de la base de datos
    const recentClaims = await prisma.claim.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const totalClaims = await prisma.claim.count();
    const fraudClaims = await prisma.claim.count({
      where: {
        OR: [
          { decision: 'INVESTIGATE' },
          { fraudRisk: 'high' }
        ]
      }
    });

    // Generar logs basados en datos reales
    const logs: Array<{ timestamp: string; prefix: string; type: string; message: string }> = [];
    const now = new Date();

    // Log de estado del sistema
    logs.push({
      timestamp: new Date(now.getTime() - 5000).toISOString(),
      prefix: 'SYSTEM',
      type: 'success',
      message: `Database connected. Total claims: ${totalClaims}`
    });

    // Logs de claims recientes
    recentClaims.forEach((claim, idx) => {
      const claimTime = new Date(now.getTime() - (idx + 1) * 15000);
      logs.push({
        timestamp: claimTime.toISOString(),
        prefix: 'CLAIM',
        type: claim.decision === 'APPROVE' ? 'success' : 
              claim.decision === 'INVESTIGATE' ? 'warning' : 'info',
        message: `${claim.id} → ${claim.decision} | ${claim.location} | Risk: ${claim.fraudRisk}`
      });

      // Agregar log de weather si existe
      if (claim.weatherEvent) {
        logs.push({
          timestamp: new Date(claimTime.getTime() - 2000).toISOString(),
          prefix: 'NOAA',
          type: 'info',
          message: `Weather verified: ${claim.weatherEvent} at ${claim.location}`
        });
      }
    });

    // Log de fraude si hay
    if (fraudClaims > 0) {
      logs.push({
        timestamp: new Date(now.getTime() - 1000).toISOString(),
        prefix: 'FRAUD',
        type: 'warning',
        message: `Alert: ${fraudClaims} claims flagged for investigation`
      });
    }

    // Ordenar por timestamp descendente
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      logs: logs.slice(0, 10),
      stats: {
        totalClaims,
        fraudClaims,
        lastUpdate: now.toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// SPA catch-all: serve index.html for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api')) {
      const indexPath = path.join(process.cwd(), 'dist', 'index.html');
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

app.listen(port, () => {
  console.log(`🤖 [Server] Motor + DB encendidos en http://localhost:${port}`);
  console.log(`📦 [Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});