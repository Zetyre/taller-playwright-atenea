import { test as setup, expect, type Page } from '@playwright/test';
import { BackendUtils } from '../utils/backendUtils';
import TestData from '../data/testData.json';
import { LoginPage } from '../pages/loginPage';
import { DashboardPage } from '../pages/dashboardPage';
import { ModalCreateAccount } from '../pages/modalCreateAccount';
import fs from 'node:fs/promises';
import path from 'node:path';

let loginPage: LoginPage;
let dashboardPage: DashboardPage;
let modalCreateAccount: ModalCreateAccount;

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

setup.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  dashboardPage = new DashboardPage(page);
  modalCreateAccount = new ModalCreateAccount(page);
  await setup.step('Open the login page for test-user setup', async () => {
    await loginPage.visitLoginPage();
  });
});

async function createUserWithAccount(
  page: Page,
  user: { email: string; password: string },
  authFile: string,
) {
  await setup.step('Log in and create a savings account', async () => {
    await loginPage.completeLogin({ email: user.email, password: user.password });
    await expect(dashboardPage.dashboardTitle).toBeVisible();
    await dashboardPage.addAccountButton.click();
    await modalCreateAccount.selectAccountType('Ahorros');
    await modalCreateAccount.fillMountInput('1000');
    await modalCreateAccount.createAccountButton.click();
    await expect(page.getByText('Cuenta creada exitosamente')).toBeVisible();
  });
  await setup.step('Save the authenticated browser state', async () => {
    await page.context().storageState({ path: authFile });
  });
}

setup('Create sender with an account', async ({ page, request }) => {
  await setup.step('Create the sender user through the backend API', async () => {
    await fs.mkdir(authDirectory, { recursive: true });
    const sender = await BackendUtils.registerUserwithAPI(request, TestData.usuarioValido);
    await fs.writeFile(userSendsDataFile, JSON.stringify({ email: sender.email }, null, 2));
    await createUserWithAccount(page, sender, userSendsAuthFile);
  });
});

setup('Create receiver with an account', async ({ page, request }) => {
  await setup.step('Create the receiver user through the backend API', async () => {
    await fs.mkdir(authDirectory, { recursive: true });
    const receiver = await BackendUtils.registerUserwithAPI(request, TestData.usuarioValido);
    await fs.writeFile(userReceivesDataFile, JSON.stringify({ email: receiver.email }, null, 2));
    await createUserWithAccount(page, receiver, userReceivesAuthFile);
  });
});

setup('Create UI transaction sender with an account', async ({ page, request }) => {
  await setup.step('Create an isolated sender for the UI transaction', async () => {
    await fs.mkdir(authDirectory, { recursive: true });
    const sender = await BackendUtils.registerUserwithAPI(request, TestData.usuarioValido);
    await fs.writeFile(userUiSendsDataFile, JSON.stringify({ email: sender.email }, null, 2));
    await createUserWithAccount(page, sender, userUiSendsAuthFile);
  });
});

setup('Create UI transaction receiver with an account', async ({ page, request }) => {
  await setup.step('Create an isolated receiver for the UI transaction', async () => {
    await fs.mkdir(authDirectory, { recursive: true });
    const receiver = await BackendUtils.registerUserwithAPI(request, TestData.usuarioValido);
    await fs.writeFile(userUiReceivesDataFile, JSON.stringify({ email: receiver.email }, null, 2));
    await createUserWithAccount(page, receiver, userUiReceivesAuthFile);
  });
});

setup('Create recipient without an account', async ({ request }) => {
  await setup.step('Create a recipient user without creating a bank account', async () => {
    await fs.mkdir(authDirectory, { recursive: true });
    const user = await BackendUtils.registerUserwithAPI(request, TestData.usuarioValido);
    await fs.writeFile(userWithoutAccountDataFile, JSON.stringify({ email: user.email }, null, 2));
  });
});
