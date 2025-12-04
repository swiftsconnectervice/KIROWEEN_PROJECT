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
  app.use(express.static(path.join(__dirname, '../dist')));
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

    // Guardar en la base de datos
    console.log('💾 [Server] Saving manual claim to database...');
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

    console.log('✅ [Server] Manual claim processed and saved');

    res.json({
      success: true,
      claim: result,
      decision: result.decision,
      fraudRisk: result.validationResult.fraudRisk,
      reasons: result.validationResult.reasons
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
  
  if (!question) return res.status(400).json({ error: 'Falta la pregunta' });

  try {
    // 1. LEER DE LA BASE DE DATOS
    // Traemos los últimos 10 reclamos del historial real
    const claimsHistory = await prisma.claim.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (claimsHistory.length === 0) {
      return res.json({ answer: "La base de datos está vacía. Procesa algunos reclamos primero." });
    }

    // 2. Preparar contexto para la IA
    const dataContext = JSON.stringify(claimsHistory.map(c => ({
      id: c.id,
      location: c.location,
      damage: c.damageType,
      decision: c.decision,
      reason: c.aiReasoning,
      weather: c.weatherEvent
    })), null, 2);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Eres el espíritu del sistema Legacy. Tienes acceso a la base de datos histórica: ${dataContext}. Responde brevemente.` },
        { role: "user", content: question }
      ],
    });

    res.json({ answer: completion.choices[0].message.content });

  } catch (error) {
    console.error('[Seance] Error:', error);
    res.status(500).json({ error: 'El espíritu no responde...' });
  }
});

// 4. Endpoint: SYSTEM LOGS (Híbrido: datos reales + contexto) 📜
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
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(port, () => {
  console.log(`🤖 [Server] Motor + DB encendidos en http://localhost:${port}`);
  console.log(`📦 [Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});