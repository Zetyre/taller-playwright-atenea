import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { DashboardPage } from '../pages/dashboardPage';
import TestData from '../data/testData.json';

let loginPage: LoginPage;
let dashboardPage: DashboardPage;

test.beforeEach (async ({ page }) => {
  loginPage = new LoginPage(page);
  dashboardPage = new DashboardPage(page);
  await test.step('Open the login page', async () => {
    await loginPage.visitLoginPage();
  });
});

test('TC-007: Verify login functionality with valid credentials', async ({ page }) => {
    await loginPage.completeLogin(TestData.usuarioValido);
    await expect (page.getByText('Inicio de sesión exitoso')).toBeVisible();
    await expect(dashboardPage.dashboardTitle).toBeVisible();  
});
