import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { DashboardPage } from '../pages/dashboardPage';
import TestData from '../data/testData.json';
import { BackendUtils } from '../utils/backendUtils';
import { apiUrl } from '../utils/urls';

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
  await test.step('Submit valid login credentials', async () => {
    await loginPage.completeLogin(TestData.usuarioValido);
  });
  await test.step('Verify successful login and dashboard navigation', async () => {
    await expect (page.getByText('Inicio de sesión exitoso')).toBeVisible();
    await expect(dashboardPage.dashboardTitle).toBeVisible();
  });
});

test('TC-011: Login with backend created user', async ({ page, request }) => {
  const usuario = await test.step('Create a test user through the backend API', async () => {
    return BackendUtils.registerUserwithAPI(request, TestData.usuarioValido);
  });

  const loginResponsePromise = page.waitForResponse(
    response => response.url() === apiUrl('/api/auth/login')
      && response.request().method() === 'POST',
  );
  const loginResponseBody = await test.step('Log in with the API-created user and capture the response', async () => {
    await loginPage.completeLogin({ email: usuario.email, password: usuario.password });
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.status()).toBe(200);
    return loginResponse.json() as Promise<{
      token: string;
      user: { id: string; firstName: string; lastName: string; email: string };
    }>;
  });

  await test.step('Verify the response includes a valid token and expected user', async () => {
    expect(loginResponseBody).toHaveProperty('token');
    expect(typeof loginResponseBody.token).toBe('string');
    expect(loginResponseBody).toHaveProperty('user');
    expect(loginResponseBody.user).toEqual(expect.objectContaining({
      id: expect.any(String),
      firstName: TestData.usuarioValido.firstName,
      lastName: TestData.usuarioValido.lastName,
      email: usuario.email,
    }));
    expect(loginResponseBody.token).not.toBe('');
  });
  await test.step('Verify successful login and dashboard navigation', async () => {
    await expect (page.getByText('Inicio de sesión exitoso')).toBeVisible();
    await expect(dashboardPage.dashboardTitle).toBeVisible();
  });
});