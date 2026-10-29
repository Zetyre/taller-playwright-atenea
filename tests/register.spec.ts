import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/registerPage';
import TestData from '../data/testData.json';
import { BackendUtils } from '../utils/backendUtils';

let registerPage: RegisterPage;

test.beforeEach(async ({ page }) => {
  registerPage = new RegisterPage(page);
  await test.step('Open the registration page', async () => {
    await registerPage.visitRegisterPage();
  });
});


test('TC-001: Verify visual elements in sign-up page', async ({ page }) => {
  await test.step('Verify all registration fields and the submit button are visible', async () => {
    await expect(registerPage.firstNameInput).toBeVisible();
    await expect(registerPage.lastNameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.registerButton).toBeVisible();
  });
});

test('TC-002: Verify "Register" button is disabled when fields are empty', async ({ page }) => {
  await test.step('Verify registration cannot be submitted with empty fields', async () => {
    await expect(registerPage.registerButton).toBeDisabled();
  });
});

test('TC-003: Verify "Register" button is enabled when all mandatory fields are filled', async ({ page }) => {
  await test.step('Fill in all required registration fields', async () => {
    await registerPage.fillRegistrationForm(TestData.usuarioValido);
  });
  await test.step('Verify the registration button is enabled', async () => {
    await expect(registerPage.registerButton).toBeEnabled();
  });
});

test('TC-004: Verify redirection to login page after successful registration', async ({ page }) => {
  await test.step('Select the sign-in link from the registration page', async () => {
    await registerPage.loginButton.click();
  });
  await test.step('Verify navigation to the login page', async () => {
    await expect(page).toHaveURL('http://localhost:3000/login');
  });
});

test('TC-005: Verify successful registration with valid data', async ({ page }) => {
  const email = TestData.usuarioValido.email.split('@')[0] + Date.now().toString() + TestData.usuarioValido.email.split('@')[1];
  TestData.usuarioValido.email = email;
  await test.step('Submit the registration form with valid user details', async () => {
    await registerPage.completeRegistration(TestData.usuarioValido);
  });
  await test.step('Verify the success notification is displayed', async () => {
    await expect(page.getByText('Registro exitoso!')).toBeVisible();
  });
});

test('TC-006: Verify users cannot register with an already registered email', async ({ page }) => {
  const email = TestData.usuarioValido.email.split('@')[0] + Date.now().toString() + TestData.usuarioValido.email.split('@')[1];
  TestData.usuarioValido.email = email;
  await test.step('Register a new user with a unique email address', async () => {
    await registerPage.completeRegistration(TestData.usuarioValido);
    await expect(page.getByText('Registro exitoso!')).toBeVisible();
  });
  await test.step('Try to register again with the same email address', async () => {
    await registerPage.visitRegisterPage();
    await registerPage.completeRegistration(TestData.usuarioValido);
  });
  await test.step('Verify the duplicate-email error is displayed instead of success', async () => {
    await expect(page.getByText('Email already in use')).toBeVisible();
    await expect(page.getByText('Registro exitoso!')).not.toBeVisible();
  });
});

test('TC-008: Verify successful registration with valid data while verifying the API response', async ({ page }) => {
  const [emailName, emailDomain] = TestData.usuarioValido.email.split('@');
  const usuario = {
    ...TestData.usuarioValido,
    email: `${emailName}${Date.now()}@${emailDomain}`,
  };
  const responsePremise = page.waitForResponse(
    response => response.url() === 'http://localhost:6007/api/auth/signup'
      && response.request().method() === 'POST',
  );
  await test.step('Submit the registration form with valid user details', async () => {
    await registerPage.completeRegistration(usuario);
  });
  await test.step('Verify the API response for the registration request', async () => {
    const response = await responsePremise;
    expect(response.status()).toBe(201);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      token: expect.any(String),
      user: {
        id: expect.any(String),
        firstName: usuario.firstName,
        lastName: usuario.lastName,
        email: usuario.email,
      },
    });
    expect(responseBody.token).not.toBe('');
    expect(responseBody.user.id).not.toBe('');
  });
  await test.step('Verify the success notification is displayed', async () => {
    await expect(page.getByText('Registro exitoso!')).toBeVisible();
  });
});

test('TC-009: Generate signup with API request', async ({ page }) => {
  const [emailName, emailDomain] = TestData.usuarioValido.email.split('@');
  const usuario = {
    ...TestData.usuarioValido,
    email: `${emailName}${Date.now()}@${emailDomain}`,
  };
  const backendUtils = new BackendUtils(page);
  const response = await backendUtils.enviarRequestDeBackend('http://localhost:6007/api/auth/signup', usuario);
  expect(response.status()).toBe(201);
  const responseBody = await response.json();
  expect(responseBody).toEqual({
    token: expect.any(String),
    user: {
      id: expect.any(String),
      firstName: usuario.firstName,
      lastName: usuario.lastName,
      email: usuario.email,
    },
  });
});

test ('TC-010: Verify front-end behavior for 500 error response during registration', async ({ page }) => {
  const [emailName, emailDomain] = TestData.usuarioValido.email.split('@');
  const usuario = {
    ...TestData.usuarioValido,
    email: `${emailName}${Date.now()}@${emailDomain}`,
  };
  await test.step('Intercept the registration API request and simulate a 500 error response', async () => {
  await page.route('**/api/auth/signup', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Internal Server Error' }),
    });
  });

  await registerPage.firstNameInput.fill(usuario.firstName);
  await registerPage.lastNameInput.fill(usuario.lastName);
  await registerPage.emailInput.fill(usuario.email);
  await registerPage.passwordInput.fill(usuario.password);
  await registerPage.registerButton.click();

  await expect(page.getByText('Internal Server Error')).toBeVisible();
});
});