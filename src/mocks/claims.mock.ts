/**
 * Mock Insurance Claims Generator
 * Generates realistic insurance claim data for testing AS/400 MCP integration
 */

/**
 * Insurance claim structure matching AS/400 legacy format
 */
export interface MockClaim {
  /** Unique claim identifier in format CLM-YYYY-XXX */
  id: string;
  
  /** Claim amount in USD, ranging from $1,000 to $50,000 */
  amount: number;
  
  /** US city where the incident occurred */
  location: string;
  
  /** Type of damage claimed */
  damageType: 'Hurricane' | 'Fire' | 'Theft' | 'Vandalism';
  
  /** Date of loss, randomly generated within last 30 days */
  date: Date;
  
  /** Policy number associated with the claim */
  policyNumber: string;
  
  /** Claimant full name */
  claimantName: string;
  
  /** Current status of the claim */
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'DENIED' | 'SUBMIT_FAILED' | 'ERROR';
}

/**
 * Real US cities for realistic location data
 */
const US_CITIES = [
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
  'San Jose, CA',
  'Austin, TX',
  'Jacksonville, FL',
  'Fort Worth, TX',
  'Columbus, OH',
  'Charlotte, NC',
  'San Francisco, CA',
  'Indianapolis, IN',
  'Seattle, WA',
  'Denver, CO',
  'Boston, MA',
  'Nashville, TN',
  'Miami, FL',
  'Atlanta, GA',
  'Portland, OR',
  'Las Vegas, NV'
];

/**
 * Common first names for claimant generation
 */
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer',
  'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth',
  'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah',
  'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa'
];

/**
 * Common last names for claimant generation
 */
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
  'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez',
  'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore',
  'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White'
];

/**
 * Damage types supported by the system
 */
const DAMAGE_TYPES: Array<'Hurricane' | 'Fire' | 'Theft' | 'Vandalism'> = [
  'Hurricane',
  'Fire',
  'Theft',
  'Vandalism'
];

/**
 * Generates a random integer between min (inclusive) and max (inclusive)
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Selects a random element from an array
 * @param array - Source array
 * @returns Random element
 */
function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/**
 * Generates a claim ID in format CLM-YYYY-XXX
 * @returns Formatted claim ID
 */
function generateClaimId(): string {
  const year = new Date().getFullYear();
  const sequence = randomInt(100, 999);
  return `CLM-${year}-${sequence}`;
}

/**
 * Generates a random date within the last N days
 * @param daysBack - Number of days to look back
 * @returns Random date
 */
function randomDateInLastDays(daysBack: number): Date {
  const now = new Date();
  const millisecondsBack = daysBack * 24 * 60 * 60 * 1000;
  const randomMs = Math.random() * millisecondsBack;
  return new Date(now.getTime() - randomMs);
}

/**
 * Generates a policy number in format TYPE-XXXXXXX
 * @returns Formatted policy number
 */
function generatePolicyNumber(): string {
  const types = ['AUTO', 'HOME', 'PROP', 'LIFE'];
  const type = randomElement(types);
  const number = randomInt(1000000, 9999999);
  return `${type}-${number}`;
}

/**
 * Generates a random claimant name
 * @returns Full name
 */
function generateClaimantName(): string {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  return `${firstName} ${lastName}`;
}

/**
 * Generates a single mock insurance claim
 * @returns Mock claim object
 */
function generateSingleClaim(): MockClaim {
  return {
    id: generateClaimId(),
    amount: randomInt(1000, 50000),
    location: randomElement(US_CITIES),
    damageType: randomElement(DAMAGE_TYPES),
    date: randomDateInLastDays(30),
    policyNumber: generatePolicyNumber(),
    claimantName: generateClaimantName(),
    status: 'PENDING'
  };
}

/**
 * Generates multiple mock insurance claims for testing
 * 
 * @param count - Number of claims to generate
 * @returns Array of mock insurance claims
 * 
 * @example
 * ```typescript
 * // Generate 10 test claims
 * const claims = generateMockClaims(10);
 * 
 * // Use in tests
 * claims.forEach(claim => {
 *   console.log(`${claim.id}: $${claim.amount} - ${claim.damageType}`);
 * });
 * ```
 */
export function generateMockClaims(count: number): MockClaim[] {
  if (count < 1) {
    throw new Error('Count must be at least 1');
  }
  
  if (count > 10000) {
    throw new Error('Count exceeds maximum limit of 10,000 claims');
  }
  
  const claims: MockClaim[] = [];
  const usedIds = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    let claim = generateSingleClaim();
    
    // Ensure unique claim IDs
    while (usedIds.has(claim.id)) {
      claim = generateSingleClaim();
    }
    
    usedIds.add(claim.id);
    claims.push(claim);
  }
  
  return claims;
}

/**
 * Generates a single mock claim (exported for convenience)
 * @returns Single mock claim
 */
export function generateMockClaim(): MockClaim {
  return generateSingleClaim();
}
