/**
 * Email claim data extracted from Gmail
 */
export interface EmailClaim {
  from: string;
  subject: string;
  body: string;
  receivedAt: Date;
  attachments: string[];
}

/**
 * Raw claim data from manual injection
 */
export interface RawClaimData {
  subject: string;
  body: string;
  location: string;
  imageBase64?: string;
}

/**
 * Converts raw claim data to EmailClaim format
 */
export function convertRawToEmailClaim(rawData: RawClaimData): EmailClaim {
  return {
    from: 'manual-injector@frankenstack.local',
    subject: rawData.subject,
    body: rawData.body,
    receivedAt: new Date(),
    attachments: []
  };
}

/**
 * Mock Gmail API - Simulates extracting claim data from email
 * In production, this would connect to Gmail API and parse email content
 */
export async function extractClaimFromEmail(emailId: string): Promise<EmailClaim> {
  // Simular latencia
  await new Promise(resolve => setTimeout(resolve, 300));

  // LÓGICA DINÁMICA: Cambiamos la ciudad según el ID del email
  let location = 'Miami, FL'; // Por defecto
  let damage = 'Hurricane';
  
  if (emailId.includes('london')) {
    location = 'London, UK';
    damage = 'Flood'; // En Londres siempre llueve
  } else if (emailId.includes('dubai')) {
    location = 'Dubai, AE';
    damage = 'Sandstorm'; // Ojo: OpenWeather devolverá 'Clear' o 'Dust'
  } else if (emailId.includes('tokyo')) {
    location = 'Tokyo, JP';
    damage = 'Earthquake';
  }

  return {
    from: 'claimant@example.com',
    subject: `Insurance Claim - ${damage} Damage`,
    body: `
      Policy Number: AUTO-1234567
      Claimant: John Smith
      Date of Loss: ${new Date().toISOString()}
      Location: ${location}
      Damage Type: ${damage}
      Estimated Cost: $25,000
    `,
    receivedAt: new Date(),
    attachments: []
  };
}
