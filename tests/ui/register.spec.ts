import { expect, test } from '../../fixtures';
import type { AuthResponse } from '../../types/api';
import { apiUrl } from '../../utils/urls';
import { buildUser } from '../../utils/userFactory';

test.describe('Sign-up', () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test('TC-001: Sign-up form shows every field and the submit button', { tag: '@smoke' }, async ({ registerPage }) => {
    await expect(registerPage.firstNameInput).toBeVisible();
    await expect(registerPage.lastNameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.registerButton).toBeVisible();
  });

  test(
    'TC-002: Register button is disabled while the form is empty',
    { tag: '@regression' },
    async ({ registerPage }) => {
      await expect(registerPage.registerButton).toBeDisabled();
    },
  );

  test(
    'TC-003: Register button is enabled once every field is filled',
    { tag: '@regression' },
    async ({ registerPage }) => {
      await registerPage.fillForm(buildUser());
      await expect(registerPage.registerButton).toBeEnabled();
    },
  );

  test(
    'TC-004: Header sign-in button navigates to the login page',
    { tag: '@regression' },
    async ({ page, registerPage }) => {
      await registerPage.headerLoginButton.click();
      await expect(page).toHaveURL(/\/login$/);
    },
  );

  test(
    'TC-005: Registering with valid data shows the success notification',
    { tag: '@smoke' },
    async ({ page, registerPage }) => {
      await registerPage.register(buildUser());
      await expect(page.getByText('Registro exitoso!')).toBeVisible();
    },
  );

  test(
    'TC-006: Registering with an email that is already in use shows an error',
    { tag: '@regression' },
    async ({ page, registerPage, createUser }) => {
      const existingUser = await test.step('Create a user through the API', () => createUser({ initialBalance: null }));

      await test.step('Register again with the same email through the UI', async () => {
        await registerPage.register(buildUser({ email: existingUser.email }));
      });

      await expect(page.getByText('Email already in use')).toBeVisible();
      await expect(page.getByText('Registro exitoso!')).toBeHidden();
    },
  );

  test(
    'TC-008: Registration through the UI sends the expected sign-up request and response',
    { tag: '@regression' },
    async ({ page, registerPage }) => {
      const newUser = buildUser();
      const signupResponse = page.waitForResponse(
        response => response.url() === apiUrl('/api/auth/signup') && response.request().method() === 'POST',
      );

      await registerPage.register(newUser);

      const response = await signupResponse;
      expect(response.status()).toBe(201);
      expect(response.request().postDataJSON()).toEqual(newUser);
      const body = (await response.json()) as AuthResponse;
      expect(body).toEqual({
        token: expect.stringMatching(/\S+/),
        user: {
          id: expect.stringMatching(/\S+/),
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
        },
      });
      await expect(page.getByText('Registro exitoso!')).toBeVisible();
    },
  );

  test(
    'TC-010: A 500 from the sign-up API is shown to the user',
    { tag: '@regression' },
    async ({ page, registerPage }) => {
      await page.route('**/api/auth/signup', route =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        }),
      );

      await registerPage.register(buildUser());

      await expect(page.getByText('Internal Server Error')).toBeVisible();
      await expect(page.getByText('Registro exitoso!')).toBeHidden();
    },
  );
});
