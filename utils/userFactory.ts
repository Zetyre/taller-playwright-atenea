import { randomUUID } from 'node:crypto';
import baseUser from '../data/testData.json';
import type { NewUser } from '../types/api';

/** Returns a sign-up payload with a unique email, so parallel tests never collide. */
export function buildUser(overrides: Partial<NewUser> = {}): NewUser {
  const [localPart, domain] = baseUser.validUser.email.split('@');
  return {
    ...baseUser.validUser,
    email: `${localPart}+${randomUUID()}@${domain}`,
    ...overrides,
  };
}
