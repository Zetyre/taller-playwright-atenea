import { expect, test } from '../../fixtures';

test.describe('Accounts and transfers', () => {
  test(
    'TC-019: A user can open a savings account from the dashboard',
    { tag: '@smoke' },
    async ({ page, loginAs, createUser, createAccountModal }) => {
      const user = await createUser({ initialBalance: null });
      const dashboard = await loginAs(user);

      await dashboard.addAccountButton.click();
      await createAccountModal.createAccount('Ahorros', 2500);

      await expect(page.getByText('Cuenta creada exitosamente')).toBeVisible();
      await expect(page.getByTestId('tarjeta-cuenta')).toHaveCount(1);
    },
  );

  test(
    'TC-012: A transfer to a recipient without an account is rejected',
    { tag: '@regression' },
    async ({ page, loginAs, createUser, sendMoneyModal }) => {
      const sender = await createUser();
      const recipientWithoutAccount = await createUser({ initialBalance: null });
      const dashboard = await loginAs(sender);

      await dashboard.sendMoneyButton.click();
      await sendMoneyModal.send(recipientWithoutAccount.email, 100);

      await expect(page.getByText('Recipient has no account')).toBeVisible();
    },
  );

  test(
    'TC-018: The send form blocks a transfer larger than the balance',
    { tag: '@regression' },
    async ({ page, loginAs, createUser, sendMoneyModal }) => {
      const sender = await createUser({ initialBalance: 50 });
      const receiver = await createUser();
      const dashboard = await loginAs(sender);
      const transferRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/transactions/transfer')) transferRequests.push(request.url());
      });

      await dashboard.sendMoneyButton.click();
      await sendMoneyModal.send(receiver.email, 51);

      await expect(sendMoneyModal.insufficientBalanceError).toBeVisible();
      expect(transferRequests, 'The UI should not call the transfer API').toHaveLength(0);
    },
  );

  test(
    'TC-013: A transfer made through the API appears in the receiver dashboard',
    { tag: '@regression' },
    async ({ api, createUser, randomAmount, openDashboardInNewContext }) => {
      // Two users and two browser contexts: allow 3x the default timeout.
      test.slow();
      const sender = await createUser();
      const receiver = await createUser();
      const amount = randomAmount(1, 1000);

      await test.step(`Transfer ${amount} through the API`, async () => {
        const response = await api.transfer(sender.token, {
          fromAccountId: sender.account!._id,
          toEmail: receiver.email,
          amount,
        });
        expect(response.status()).toBe(200);
      });

      await test.step('Verify the incoming transfer in the receiver dashboard', async () => {
        const receiverDashboard = await openDashboardInNewContext(receiver);
        const incoming = receiverDashboard.transaction(`Transferencia de ${sender.email}`);
        await expect(incoming).toHaveCount(1);
        await expect(receiverDashboard.transactionAmount(incoming)).toContainText(amount.toFixed(2));
      });
    },
  );

  test(
    'TC-014: A transfer made through the UI appears for both sender and receiver',
    { tag: '@smoke' },
    async ({ page, loginAs, createUser, randomAmount, sendMoneyModal, openDashboardInNewContext }) => {
      // Two users and two browser contexts: allow 3x the default timeout.
      test.slow();
      const sender = await createUser();
      const receiver = await createUser();
      const amount = randomAmount(1, 1000);
      const senderDashboard = await loginAs(sender);

      await test.step(`Send ${amount} to the receiver through the UI`, async () => {
        await senderDashboard.sendMoneyButton.click();
        await sendMoneyModal.send(receiver.email, amount);
        await expect(page.getByText(`Transferencia enviada a ${receiver.email}`)).toBeVisible();
      });

      await test.step('Verify the outgoing transfer in the sender dashboard', async () => {
        const outgoing = senderDashboard.transaction(`Transferencia a ${receiver.email}`);
        await expect(outgoing).toHaveCount(1);
        await expect(senderDashboard.transactionAmount(outgoing)).toContainText(amount.toFixed(2));
      });

      await test.step('Verify the incoming transfer in the receiver dashboard', async () => {
        const receiverDashboard = await openDashboardInNewContext(receiver);
        const incoming = receiverDashboard.transaction(`Transferencia de ${sender.email}`);
        await expect(incoming).toHaveCount(1);
        await expect(receiverDashboard.transactionAmount(incoming)).toContainText(amount.toFixed(2));
      });
    },
  );
});
