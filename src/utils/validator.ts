import OpenAI from 'openai';
import type { MockClaim } from '../mocks/claims.mock.js';

// Configuración de interfaces
export interface NOAAWeatherData {
  location: string;
  date: Date;
  event: 'Hurricane' | 'Tornado' | 'Hail' | 'Flood' | 'Clear';
  severity: 'minor' | 'moderate' | 'severe' | 'catastrophic';
  temperature: number;
  windSpeed: number;
  precipitation: number;
}

export interface ValidationResult {
  isValid: boolean;
  weatherMatch: boolean;
  fraudRisk: 'low' | 'medium' | 'high';
  reasons: string[];
  decision: 'APPROVE' | 'INVESTIGATE' | 'INVALID_DATA';
}

// Inicializamos OpenAI
const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

/**
 * CEREBRO REAL: Valida el reclamo usando OpenAI (GPT-4o con Vision)
 */
export async function validateClaim(
  claim: MockClaim, 
  weather: NOAAWeatherData,
  imageBase64?: string
): Promise<ValidationResult> {
  
  // Modo de seguridad: Si no hay API Key, usamos la lógica vieja (simulada)
  if (!openai) {
    console.warn('[Validator] No OPENAI_API_KEY found. Using simulation logic.');
    return simulateValidation(claim, weather);
  }

  try {
    // Construimos el "Prompt" (La instrucción para la IA)
    const textPrompt = `
      Act as a Senior Insurance Claims Adjuster expert in fraud detection.
      Analyze the following insurance claim by comparing it with official weather data${imageBase64 ? ' AND THE ATTACHED IMAGE' : ''}.

      CLAIM DATA:
      - Damage Type: ${claim.damageType}
      - Claimed Amount: $${claim.amount}
      - Location: ${claim.location}
      - Date: ${claim.date.toISOString()}
      - User Description: ${claim.description || 'No description provided'}

      OFFICIAL WEATHER DATA (NOAA):
      - Event: ${weather.event}
      - Severity: ${weather.severity}
      - Precipitation: ${weather.precipitation} in
      - Wind Speed: ${weather.windSpeed} mph

      ${imageBase64 ? `
      VISUAL ANALYSIS REQUIRED:
      - Analyze the attached image of the reported damage.
      - Does the visual damage match the text description?
      - If user claims "Total Loss" or "Explosion" but image shows only a scratch, mark as HIGH FRAUD.
      - If visual damage is consistent with claimed amount, mark as LOW RISK.
      - If there are discrepancies between image and description, mark as HIGH FRAUD.
      ` : ''}

      RULES:
      1. If reported damage type does NOT match the REAL weather event from NOAA, it's suspicious.
         - Example: User reports "Fire" but NOAA shows "Flood" → Real weather was rain, not fire conditions.
         - Example: User reports "Hurricane" but NOAA shows "Clear" → No hurricane that day.
      2. If amount is excessive for the damage type, mark as MEDIUM/HIGH RISK.
      ${imageBase64 ? '3. If image shows minimal damage but text describes severe damage, mark as HIGH FRAUD.' : ''}
      ${imageBase64 ? '4. If image shows no visible damage, mark as HIGH FRAUD.' : ''}

      REASON FORMAT (be specific and clear):
      - Instead of: "Fire doesn't match Flood"
      - Write: "Reported damage type 'Fire' but real weather from NOAA shows 'Flood' (rain conditions) - no fire weather detected"
      - Always explain WHAT is the reported data vs WHAT is the real NOAA data.

      EXPECTED OUTPUT (pure JSON):
      {
        "isValid": boolean,
        "fraudRisk": "low" | "medium" | "high",
        "decision": "APPROVE" | "INVESTIGATE",
        "reasons": ["clear reasons explaining: reported data vs real NOAA data${imageBase64 ? ', INCLUDE visual analysis of the image' : ''}"]
      }
    `;

    // Preparar mensajes según si hay imagen o no
    let messages: any[];
    
    if (imageBase64) {
      // Modo Vision: GPT-4o con imagen
      console.log('[Validator] 🔍 Using GPT-4o VISION mode for image analysis');
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: textPrompt },
            { 
              type: "image_url", 
              image_url: { 
                url: imageBase64,
                detail: "high" // Análisis detallado
              } 
            }
          ]
        }
      ];
    } else {
      // Modo texto normal
      messages = [{ role: "user", content: textPrompt }];
    }

    // Llamamos a la IA (con Vision si hay imagen)
    const completion = await openai.chat.completions.create({
      messages,
      model: imageBase64 ? "gpt-4o" : "gpt-4o-mini", // Vision requiere gpt-4o
      response_format: { type: "json_object" },
      max_tokens: 1000
    });

    // Procesamos la respuesta
    const content = completion.choices[0].message.content;
    if (!content) throw new Error("OpenAI returned empty response");

    const analysis = JSON.parse(content);

    console.log(`[Validator] AI Analysis: ${imageBase64 ? 'WITH VISION 📸' : 'TEXT ONLY'}`);
    console.log(`[Validator] Decision: ${analysis.decision}, Risk: ${analysis.fraudRisk}`);

    return {
      isValid: analysis.isValid,
      weatherMatch: analysis.fraudRisk !== 'high',
      fraudRisk: analysis.fraudRisk,
      reasons: analysis.reasons,
      decision: analysis.decision
    };

  } catch (error) {
    console.error('[Validator] OpenAI failed:', error);
    // Si falla la IA, hacemos fallback a la simulación
    return simulateValidation(claim, weather);
  }
}

// --- Lógica Vieja (Fallback) ---
function simulateValidation(claim: MockClaim, weather: NOAAWeatherData): ValidationResult {
  const reasons: string[] = [];
  let fraudRisk: 'low' | 'medium' | 'high' = 'low';
  let weatherMatch = true;

  // Validación Climática Simple
  if (weather.event === 'Clear' && claim.damageType !== 'Theft' && claim.damageType !== 'Vandalism') {
    weatherMatch = false;
    fraudRisk = 'high';
    reasons.push(`Clima reportado 'Clear' no coincide con daño '${claim.damageType}'`);
  }

  // Validación de Monto Simple
  if (claim.amount > 50000) {
    fraudRisk = 'high';
    reasons.push(`Monto ${claim.amount} excede el límite automático ($50k)`);
  }

  return {
    isValid: fraudRisk === 'low',
    weatherMatch,
    fraudRisk,
    reasons: reasons.length > 0 ? reasons : ['Validación automática exitosa'],
    decision: fraudRisk === 'high' ? 'INVESTIGATE' : 'APPROVE'
  };
}
