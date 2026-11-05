import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { AccountType, Credentials, NewUser, TransferRequest } from '../types/api';
import { apiUrl } from './urls';

/**
 * Thin client for the Athena Bank backend.
 * Methods return the raw APIResponse so tests can assert on status codes and error bodies.
 */
export class AthenaApi {
  constructor(private readonly request: APIRequestContext) {}

  signup(user: Partial<NewUser>): Promise<APIResponse> {
    return this.request.post(apiUrl('/api/auth/signup'), { data: user });
  }

  login(credentials: Partial<Credentials>): Promise<APIResponse> {
    return this.request.post(apiUrl('/api/auth/login'), { data: credentials });
  }

  getAccounts(token?: string): Promise<APIResponse> {
    return this.request.get(apiUrl('/api/accounts'), { headers: authHeader(token) });
  }

  createAccount(token: string, type: AccountType, initialAmount: number): Promise<APIResponse> {
    return this.request.post(apiUrl('/api/accounts'), {
      headers: authHeader(token),
      data: { type, initialAmount },
    });
  }

  transfer(token: string, transfer: TransferRequest): Promise<APIResponse> {
    return this.request.post(apiUrl('/api/transactions/transfer'), {
      headers: authHeader(token),
      data: transfer,
    });
  }
}

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
