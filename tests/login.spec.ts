import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { DashboardPage } from '../pages/dashboardPage';
import TestData from '../data/testData.json';
import { BackendUtils } from '../utils/backendUtils';

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

test('TC-011: Login with backend created user', async ({ page }) => {
  const [emailName, emailDomain] = TestData.usuarioValido.email.split('@');
  const usuario = {
    ...TestData.usuarioValido,
    email: `${emailName}${Date.now()}@${emailDomain}`,
  };
  const backendUtils = new BackendUtils(page);
  const response = await backendUtils.enviarRequestDeBackend('http://localhost:6007/api/auth/signup', usuario);
  expect(response.status()).toBe(201);

  const loginResponsePromise = page.waitForResponse(
    response => response.url() === 'http://localhost:6007/api/auth/login'
      && response.request().method() === 'POST',
  );
  await loginPage.completeLogin({ email: usuario.email, password: usuario.password });
  const loginResponse = await loginResponsePromise;
  const loginResponseBody = await loginResponse.json();

  expect(loginResponse.status()).toBe(200);
  expect(loginResponseBody).toHaveProperty('token');
  expect(typeof loginResponseBody.token).toBe('string');
  expect(loginResponseBody).toHaveProperty('user');
  expect(loginResponseBody.user).toEqual(expect.objectContaining({
    id: expect.any(String),
    firstName: usuario.firstName,
    lastName: usuario.lastName,
    email: usuario.email,
  }));
  expect(loginResponseBody.token).not.toBe('');
  await expect (page.getByText('Inicio de sesión exitoso')).toBeVisible();
  await expect(dashboardPage.dashboardTitle).toBeVisible();
});