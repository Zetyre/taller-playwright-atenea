import { test as setup, expect } from '@playwright/test';
import { BackendUtils } from '../utils/backendUtils';
import TestData from '../data/testData.json';
import { LoginPage } from '../pages/loginPage';
import { DashboardPage } from '../pages/dashboardPage';
import { ModalCreateAccount } from '../pages/modalCreateAccount';

let loginPage: LoginPage;
let dashboardPage: DashboardPage;
let modalCreateAccount: ModalCreateAccount;

const userSendsAuthFile = 'playwright/.auth/userSends.json';
const userReceivesAuthFile = 'playwright/.auth/userReceives.json';

setup.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  dashboardPage = new DashboardPage(page);
  modalCreateAccount = new ModalCreateAccount(page);
  await loginPage.visitLoginPage();
});

setup('Generate user that sends money', async ({ page, request }) => {
  const newUser = await BackendUtils.registerUserwithAPI(request, TestData.usuarioValido);

  await loginPage.completeLogin({ email: newUser.email, password: newUser.password });
  await expect(dashboardPage.dashboardTitle).toBeVisible();
  await dashboardPage.addAccountButton.click();
  await modalCreateAccount.selectAccountType('Ahorros');
  await modalCreateAccount.fillMountInput('1000');
  await modalCreateAccount.createAccountButton.click();
  await expect(page.getByText('Cuenta creada exitosamente')).toBeVisible();
  await page.context().storageState({ path: userSendsAuthFile });
});

setup('Login with user that receives money', async ({ page, request }) => {
  await loginPage.completeLogin({ email: TestData.usuarioValido.email, password: TestData.usuarioValido.password });
  await expect(dashboardPage.dashboardTitle).toBeVisible();
  await page.context().storageState({ path: userReceivesAuthFile });
});
