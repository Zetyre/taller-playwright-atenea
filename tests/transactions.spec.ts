import { test, expect, type APIRequestContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DashboardPage } from '../pages/dashboardPage';
import { ModalSendMoney } from '../pages/modalSendMoney';
import { randomUUID } from 'node:crypto';
import { apiUrl } from '../utils/urls';
import { seededInteger } from '../utils/testRandom';

let dashboardPage: DashboardPage;
let modalSendMoney: ModalSendMoney;

const authDirectory = path.resolve(__dirname, '../playwright/.auth');
const userSendsAuthFile = path.join(authDirectory, 'userSends.json');
const userReceivesAuthFile = path.join(authDirectory, 'userReceives.json');
const userUiSendsAuthFile = path.join(authDirectory, 'userUiSends.json');
const userUiReceivesAuthFile = path.join(authDirectory, 'userUiReceives.json');
const userSendsDataFile = path.join(authDirectory, 'userSends.data.json');
const userReceivesDataFile = path.join(authDirectory, 'userReceives.data.json');
const userUiSendsDataFile = path.join(authDirectory, 'userUiSends.data.json');
const userUiReceivesDataFile = path.join(authDirectory, 'userUiReceives.data.json');
const userWithoutAccountDataFile = path.join(authDirectory, 'userWithoutAccount.data.json');

const testSendingUser = test.extend({
  storageState: userSendsAuthFile,
});

const testUiSendingUser = test.extend({
  storageState: userUiSendsAuthFile,
});

test.beforeEach(async ({ page }) => {
  dashboardPage = new DashboardPage(page);
  modalSendMoney = new ModalSendMoney(page);
  await test.step('Open the sender dashboard', async () => {
    await dashboardPage.visitDashboard();
  });
});

testSendingUser('TC-012: Reject transfer to a recipient without an account', async ({ page }) => {
  const recipient = JSON.parse(await readFile(userWithoutAccountDataFile, 'utf-8')) as { email: string };
  await test.step('Verify the sender dashboard is displayed', async () => {
    await expect(dashboardPage.dashboardTitle).toBeVisible();
  });
  await test.step('Attempt to send money to the accountless recipient', async () => {
    await dashboardPage.sendMoneyButton.click();
    await modalSendMoney.completeandClickSendButton(recipient.email);
  });
  await test.step('Verify the account requirement error is displayed', async () => {
    await expect(page.getByText('Recipient has no account')).toBeVisible();
  });
});

async function readJwt(storageStateFile: string): Promise<string> {
  const state = JSON.parse(await readFile(storageStateFile, 'utf-8')) as {
    origins?: { localStorage?: { name: string; value: string }[] }[];
  };
  const token = state.origins
    ?.flatMap(origin => origin.localStorage ?? [])
    .find(item => item.name === 'jwt')?.value;

  if (!token) {
    throw new Error(`JWT not found in storage state: ${storageStateFile}`);
  }
  return token;
}

async function readAccounts(request: APIRequestContext, token: string) {
  const response = await request.get(apiUrl('/api/accounts'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), `Accounts API failed with status ${response.status()}`).toBeTruthy();

  const accounts = await response.json();
  expect(accounts.length, 'No bank account found for test user').toBeGreaterThan(0);
  return accounts;
}

testSendingUser('TC-013: Verify successful transaction through API and receiver UI', async ({ browser, request }) => {
  const { sender, receiver } = await test.step('Load generated sender and receiver data', async () => ({
    sender: JSON.parse(await readFile(userSendsDataFile, 'utf-8')) as { email: string },
    receiver: JSON.parse(await readFile(userReceivesDataFile, 'utf-8')) as { email: string },
  }));
  const senderToken = await readJwt(userSendsAuthFile);
  const receiverToken = await readJwt(userReceivesAuthFile);
  const seed = process.env.PLAYWRIGHT_TEST_SEED ?? randomUUID();
  const amount = seededInteger(`${seed}:${test.info().title}`, 1, 1000);
  test.info().annotations.push({ type: 'random-seed', description: seed });

  const { senderAccountBefore, receiverAccountBefore } = await test.step('Read both account balances before transfer', async () => {
    const senderAccountBefore = (await readAccounts(request, senderToken))[0];
    const receiverAccountBefore = (await readAccounts(request, receiverToken))[0];
    expect(senderAccountBefore.balance, 'Sender account does not have enough funds').toBeGreaterThanOrEqual(amount);
    return { senderAccountBefore, receiverAccountBefore };
  });

  await test.step(`Transfer ${amount.toFixed(2)} to the receiver through the API`, async () => {
    const transferResponse = await request.post(apiUrl('/api/transactions/transfer'), {
      headers: { Authorization: `Bearer ${senderToken}` },
      data: {
        fromAccountId: senderAccountBefore._id,
        toEmail: receiver.email,
        amount,
      },
    });
    expect(transferResponse.ok(), `Transfer API failed with status ${transferResponse.status()}`).toBeTruthy();
  });

  await test.step('Verify sender debit and receiver credit through the API', async () => {
    const senderAccountAfter = (await readAccounts(request, senderToken))[0];
    const receiverAccountAfter = (await readAccounts(request, receiverToken))[0];
    expect(senderAccountAfter.balance).toBe(senderAccountBefore.balance - amount);
    expect(receiverAccountAfter.balance).toBe(receiverAccountBefore.balance + amount);
  });

  const receiverContext = await browser.newContext({ storageState: userReceivesAuthFile });
  try {
    const receiverPage = await receiverContext.newPage();
    const receiverDashboard = new DashboardPage(receiverPage);
    await test.step('Verify the incoming transfer in the receiver dashboard', async () => {
      await receiverDashboard.visitDashboard();
      await expect(receiverDashboard.dashboardTitle).toBeVisible();
      const incomingTransfer = receiverDashboard.page.getByTestId('item-transaccion')
        .filter({ hasText: sender.email });
      await expect(incomingTransfer.first()).toContainText(`Transferencia de ${sender.email}`);
      await expect(incomingTransfer.first().getByTestId('monto-transaccion'))
        .toContainText(amount.toFixed(2));
    });
  } finally {
    await receiverContext.close();
  }
});

testUiSendingUser('TC-014: Verify successful transaction through UI', async ({ browser, page }) => {
  const sender = JSON.parse(await readFile(userUiSendsDataFile, 'utf-8')) as { email: string };
  const receiver = JSON.parse(await readFile(userUiReceivesDataFile, 'utf-8')) as { email: string };
  const seed = process.env.PLAYWRIGHT_TEST_SEED ?? randomUUID();
  const amount = seededInteger(`${seed}:${test.info().title}`, 1, 1000);
  test.info().annotations.push({ type: 'random-seed', description: seed });
  const uiDashboard = new DashboardPage(page);
  const sendMoneyModal = new ModalSendMoney(page);

  await test.step('Open the sender dashboard', async () => {
    await uiDashboard.visitDashboard();
    await expect(uiDashboard.dashboardTitle).toBeVisible();
  });
  await test.step(`Send ${amount.toFixed(2)} to the receiver using the UI`, async () => {
    await uiDashboard.sendMoneyButton.click();
    await sendMoneyModal.completeandClickSendButton(receiver.email, String(amount));
    await expect(page.getByText(`Transferencia enviada a ${receiver.email}`)).toBeVisible();
  });

  const receiverContext = await browser.newContext({ storageState: userUiReceivesAuthFile });
  try {
    const receiverPage = await receiverContext.newPage();
    const receiverDashboard = new DashboardPage(receiverPage);
    await test.step('Verify the incoming transfer in the receiver dashboard', async () => {
      await receiverDashboard.visitDashboard();
      await expect(receiverDashboard.dashboardTitle).toBeVisible();
      const incomingTransfer = receiverDashboard.page.getByTestId('item-transaccion')
        .filter({ hasText: sender.email });
      await expect(incomingTransfer.first()).toContainText(`Transferencia de ${sender.email}`);
      await expect(incomingTransfer.first().getByTestId('monto-transaccion'))
        .toContainText(amount.toFixed(2));
    });
  } finally {
    await receiverContext.close();
  }
});
