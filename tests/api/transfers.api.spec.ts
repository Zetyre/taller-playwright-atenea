import type { APIResponse } from '@playwright/test';
import { expect, test } from '../../fixtures';
import type { Account, BankUser, ErrorResponse } from '../../types/api';
import type { AthenaApi } from '../../utils/athenaApi';
import { buildUser } from '../../utils/userFactory';

async function balanceOf(api: AthenaApi, user: BankUser): Promise<number> {
  const response = await api.getAccounts(user.token);
  expect(response.status()).toBe(200);
  const [account] = (await response.json()) as Account[];
  return account.balance;
}

async function expectError(response: APIResponse, status: number, message: string): Promise<void> {
  expect(response.status()).toBe(status);
  expect((await response.json()) as ErrorResponse).toEqual({ message });
}

test.describe('Transfers API', () => {
  test(
    'TC-029: A transfer debits the sender and credits the receiver by the same amount',
    { tag: '@smoke' },
    async ({ api, createUser, randomAmount }) => {
      const sender = await createUser({ initialBalance: 5000 });
      const receiver = await createUser({ initialBalance: 100 });
      const amount = randomAmount(1, 1000);

      const response = await api.transfer(sender.token, {
        fromAccountId: sender.account!._id,
        toEmail: receiver.email,
        amount,
      });

      expect(response.status()).toBe(200);
      expect(await balanceOf(api, sender)).toBe(5000 - amount);
      expect(await balanceOf(api, receiver)).toBe(100 + amount);
    },
  );

  test(
    'TC-030: A transfer larger than the balance is rejected and nothing moves',
    { tag: '@regression' },
    async ({ api, createUser }) => {
      const sender = await createUser({ initialBalance: 50 });
      const receiver = await createUser({ initialBalance: 0 });

      const response = await api.transfer(sender.token, {
        fromAccountId: sender.account!._id,
        toEmail: receiver.email,
        amount: 51,
      });

      await expectError(response, 400, 'Insufficient funds');
      expect(await balanceOf(api, sender)).toBe(50);
      expect(await balanceOf(api, receiver)).toBe(0);
    },
  );

  for (const amount of [0, -10]) {
    test(`TC-031: A transfer of ${amount} is rejected`, { tag: '@regression' }, async ({ api, createUser }) => {
      const sender = await createUser();
      const receiver = await createUser();

      const response = await api.transfer(sender.token, {
        fromAccountId: sender.account!._id,
        toEmail: receiver.email,
        amount,
      });

      await expectError(response, 400, 'Invalid transfer data');
    });
  }

  test('TC-032: A transfer to an unknown email returns 404', { tag: '@regression' }, async ({ api, createUser }) => {
    const sender = await createUser();

    const response = await api.transfer(sender.token, {
      fromAccountId: sender.account!._id,
      toEmail: buildUser().email,
      amount: 10,
    });

    await expectError(response, 404, 'Recipient user not found');
  });

  test(
    'TC-033: A transfer to a recipient without an account returns 400',
    { tag: '@regression' },
    async ({ api, createUser }) => {
      const sender = await createUser();
      const recipientWithoutAccount = await createUser({ initialBalance: null });

      const response = await api.transfer(sender.token, {
        fromAccountId: sender.account!._id,
        toEmail: recipientWithoutAccount.email,
        amount: 10,
      });

      await expectError(response, 400, 'Recipient has no account');
    },
  );

  test(
    'TC-034: A user cannot transfer from an account they do not own',
    { tag: '@regression' },
    async ({ api, createUser }) => {
      const attacker = await createUser();
      const victim = await createUser({ initialBalance: 1000 });

      const response = await api.transfer(attacker.token, {
        fromAccountId: victim.account!._id,
        toEmail: attacker.email,
        amount: 500,
      });

      await expectError(response, 404, 'Sender account not found');
      expect(await balanceOf(api, victim)).toBe(1000);
    },
  );

  test('TC-035: A transfer without a token returns 401', { tag: '@regression' }, async ({ api, createUser }) => {
    const sender = await createUser();
    const receiver = await createUser();

    const response = await api.transfer('', {
      fromAccountId: sender.account!._id,
      toEmail: receiver.email,
      amount: 10,
    });

    await expectError(response, 401, 'No token provided');
  });

  test(
    'TC-036: A transfer to your own account does not change the balance',
    {
      tag: ['@regression', '@known-bug'],
      annotation: {
        type: 'issue',
        description:
          'App defect: routes/transactions.js loads the same account twice as sender and recipient and saves both, ' +
          'so a self-transfer of X credits the account by X. Remove test.fail() once the backend rejects self-transfers.',
      },
    },
    async ({ api, createUser }) => {
      test.fail();
      const user = await createUser({ initialBalance: 1000 });

      await api.transfer(user.token, { fromAccountId: user.account!._id, toEmail: user.email, amount: 100 });

      expect(await balanceOf(api, user)).toBe(1000);
    },
  );
});
