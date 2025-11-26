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
      Actúa como un Perito de Seguros Senior experto en detección de fraude.
      Analiza el siguiente reclamo de seguro comparándolo con los datos oficiales del clima${imageBase64 ? ' Y LA IMAGEN ADJUNTA' : ''}.

      DATOS DEL RECLAMO:
      - Tipo: ${claim.damageType}
      - Monto: $${claim.amount}
      - Ubicación: ${claim.location}
      - Fecha: ${claim.date.toISOString()}
      - Descripción del daño: ${claim.damageType}

      DATOS DEL CLIMA OFICIAL (NOAA):
      - Evento: ${weather.event}
      - Severidad: ${weather.severity}
      - Precipitación: ${weather.precipitation} in
      - Viento: ${weather.windSpeed} mph

      ${imageBase64 ? `
      ANÁLISIS VISUAL REQUERIDO:
      - Analiza la imagen adjunta del daño reportado.
      - ¿El daño visual coincide con la descripción del texto?
      - Si el usuario dice "Pérdida Total" o "Explosión" pero solo hay un rasguño, márcalo como FRAUDE ALTO.
      - Si el daño visual es consistente con el monto reclamado, es RIESGO BAJO.
      - Si hay discrepancias entre la imagen y la descripción, es FRAUDE ALTO.
      ` : ''}

      REGLAS:
      1. Si el tipo de daño no coincide con el evento climático (ej. "Hurricane" damage pero clima "Clear"), es FRAUDE ALTO.
      2. Si el monto es excesivo para el tipo de daño, es RIESGO MEDIO/ALTO.
      ${imageBase64 ? '3. Si la imagen muestra daños mínimos pero el texto describe daños severos, es FRAUDE ALTO.' : ''}
      ${imageBase64 ? '4. Si la imagen no muestra ningún daño visible, es FRAUDE ALTO.' : ''}

      SALIDA ESPERADA (JSON puro):
      {
        "isValid": boolean,
        "fraudRisk": "low" | "medium" | "high",
        "decision": "APPROVE" | "INVESTIGATE",
        "reasons": ["lista de razones cortas y técnicas${imageBase64 ? ', INCLUYE análisis visual de la imagen' : ''}"]
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
