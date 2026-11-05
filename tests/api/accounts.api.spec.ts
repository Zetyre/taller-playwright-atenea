import { expect, test } from '../../fixtures';
import type { Account, ErrorResponse } from '../../types/api';

test.describe('Accounts API', () => {
  test('TC-026: A new account is returned with its opening balance', { tag: '@smoke' }, async ({ api, createUser }) => {
    const user = await createUser({ initialBalance: null });

    const created = await api.createAccount(user.token, 'savings', 1234);
    expect(created.status()).toBe(201);

    const accounts = await api.getAccounts(user.token);
    expect(accounts.status()).toBe(200);
    expect((await accounts.json()) as Account[]).toEqual([
      expect.objectContaining({
        type: 'savings',
        balance: 1234,
        frozen: false,
        last4: expect.stringMatching(/^\d{4}$/),
      }),
    ]);
  });

  test('TC-027: Accounts cannot be read without a token', { tag: '@regression' }, async ({ api }) => {
    const response = await api.getAccounts();

    expect(response.status()).toBe(401);
    expect((await response.json()) as ErrorResponse).toEqual({ message: 'No token provided' });
  });

  test('TC-028: Accounts cannot be read with an invalid token', { tag: '@regression' }, async ({ api }) => {
    const response = await api.getAccounts('not-a-real-jwt');

    expect(response.status()).toBe(401);
    expect((await response.json()) as ErrorResponse).toEqual({ message: 'Invalid token' });
  });
});
