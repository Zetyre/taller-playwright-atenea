import { test, expect } from '@playwright/test';


test('TC-001: Verify visual elements in sign-up page', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.locator('input[name=firstName]')).toBeVisible();
  await expect(page.locator('input[name=lastName]')).toBeVisible();
  await expect(page.locator('input[name=email]')).toBeVisible();
  await expect(page.locator('input[name=password]')).toBeVisible();
  await expect(page.getByTestId('boton-registrarse')).toBeVisible();
  // Expect a title "to contain" a substring.
  // await expect(page).toHaveTitle(/Playwright/);
});

test('TC-002: Verify "Register" button is disabled when fields are empty', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.getByTestId('boton-registrarse')).toBeDisabled();
});

test('TC-003: Verify "Register" button is enabled when all mandatory fields are filled', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.locator('input[name=firstName]').fill('Cristian');
  await page.locator('input[name=lastName]').fill('Marrero');
  await page.locator('input[name=email]').fill('cristianmarrero01@example.com');
  await page.locator('input[name=password]').fill('Password123!');
  await expect(page.getByTestId('boton-registrarse')).toBeEnabled();
});

test('TC-004: Verify redirection to login page after successful registration', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByTestId('boton-login-header-signup').click();
  await expect(page).toHaveURL('http://localhost:3000/login');
});

test('TC-005: Verify successful registration with valid data', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.locator('input[name=firstName]').fill('Cristian');
  await page.locator('input[name=lastName]').fill('Marrero');
  await page.locator('input[name=email]').fill('cristianmarrero01'+Date.now().toString()+'@gmail.com');
  await page.locator('input[name=password]').fill('Password123!');
  await page.getByTestId('boton-registrarse').click();
  await expect(page.getByText('Registro exitoso!')).toBeVisible();
});

test('TC-006: Verify users cannot register with an already registered email', async ({ page }) => {
  const email = 'cristianmarrero01' + Date.now().toString() + '@gmail.com';
  await page.goto('http://localhost:3000/');
  await page.locator('input[name=firstName]').fill('Cristian');
  await page.locator('input[name=lastName]').fill('Marrero');
  await page.locator('input[name=email]').fill(email);
  await page.locator('input[name=password]').fill('Password123!');
  await page.getByTestId('boton-registrarse').click();
  await expect(page.getByText('Registro exitoso!')).toBeVisible();
  await page.goto('http://localhost:3000/');
  await page.locator('input[name=firstName]').fill('Cristian');
  await page.locator('input[name=lastName]').fill('Marrero');
  await page.locator('input[name=email]').fill(email);
  await page.locator('input[name=password]').fill('Password123!');
  await page.getByTestId('boton-registrarse').click();
  await expect(page.getByText('Email already in use')).toBeVisible();
  await expect(page.getByText('Registro exitoso!')).not.toBeVisible();
});