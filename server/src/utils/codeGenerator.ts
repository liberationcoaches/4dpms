import { Organization } from '../models/Organization';
import { Team } from '../models/Team';

/**
 * Generate a unique organization code (6-8 characters)
 */
export async function generateOrgCode(): Promise<string> {
  let code: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    // Generate 6-8 character alphanumeric code
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    code = `ORG${randomPart}`.substring(0, 8);
    
    const existing = await Organization.findOne({ code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique organization code');
  }

  return code;
}

/**
 * Generate a unique team code (4-8 characters)
 */
export async function generateTeamCode(): Promise<string> {
  let code: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    // Generate 4-8 character alphanumeric code
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    code = `TEAM${randomPart}`.substring(0, 8);
    
    const existing = await Team.findOne({ code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique team code');
  }

  return code;
}
