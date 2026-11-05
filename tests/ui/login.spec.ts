import { expect, test } from '../../fixtures';
import type { AuthResponse } from '../../types/api';
import { apiUrl } from '../../utils/urls';

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test(
    'TC-007: Valid credentials log the user in and open the dashboard',
    { tag: '@smoke' },
    async ({ page, loginPage, dashboardPage, createUser }) => {
      const user = await createUser({ initialBalance: null });

      await loginPage.login(user);

      await expect(page.getByText('Inicio de sesión exitoso')).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(dashboardPage.title).toBeVisible();
    },
  );

  test(
    'TC-011: Login through the UI returns a token and the expected user',
    { tag: '@regression' },
    async ({ page, loginPage, dashboardPage, createUser }) => {
      const user = await createUser({ initialBalance: null });
      const loginResponse = page.waitForResponse(
        response => response.url() === apiUrl('/api/auth/login') && response.request().method() === 'POST',
      );

      await loginPage.login(user);

      const response = await loginResponse;
      expect(response.status()).toBe(200);
      expect((await response.json()) as AuthResponse).toEqual({
        token: expect.stringMatching(/\S+/),
        user: {
          id: expect.stringMatching(/\S+/),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      });
      await expect(dashboardPage.title).toBeVisible();
    },
  );

  test(
    'TC-015: A wrong password shows an error and keeps the user on the login page',
    { tag: '@regression' },
    async ({ page, loginPage, createUser }) => {
      const user = await createUser({ initialBalance: null });

      await loginPage.login({ email: user.email, password: `${user.password}-wrong` });

      await expect(page.getByText('Invalid credentials')).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.evaluate(() => localStorage.getItem('jwt'))).resolves.toBeNull();
    },
  );
});

test.describe('Session', () => {
  test(
    'TC-016: The dashboard redirects anonymous visitors to the login page',
    { tag: '@smoke' },
    async ({ page, loginPage }) => {
      await page.goto('/dashboard');

      await expect(page).toHaveURL(/\/login$/);
      await expect(loginPage.title).toBeVisible();
    },
  );

  test(
    'TC-017: Logging out clears the session and protects the dashboard again',
    { tag: '@regression' },
    async ({ page, loginAs, loginPage, createUser }) => {
      const user = await createUser({ initialBalance: null });
      const dashboard = await loginAs(user);

      await dashboard.logoutButton.click();

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.evaluate(() => localStorage.getItem('jwt'))).resolves.toBeFalsy();
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login$/);
      await expect(loginPage.title).toBeVisible();
    },
  );
});
