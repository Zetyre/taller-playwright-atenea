import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/registerPage';
import TestData from '../data/testData.json';

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