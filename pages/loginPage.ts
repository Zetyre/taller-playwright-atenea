import { expect, type Locator, type Page } from '@playwright/test';
import type { Credentials } from '../types/api';

export class LoginPage {
  readonly title: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  /** The floating label of the password field (MUI draws it above the input). */
  readonly passwordLabel: Locator;
  readonly loginButton: Locator;
  readonly signUpLink: Locator;

  constructor(readonly page: Page) {
    this.title = page.getByTestId('titulo-login');
    this.emailInput = page.getByLabel('Correo electrónico');
    this.passwordInput = page.getByLabel('Contraseña');
    this.passwordLabel = page.getByTestId('input-contrasena-login').locator('label');
    this.loginButton = page.getByTestId('boton-login');
    this.signUpLink = page.getByTestId('link-registrarse-login');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.title).toBeVisible();
  }

  async fillForm(credentials: Credentials): Promise<void> {
    await this.emailInput.fill(credentials.email);
    await this.passwordInput.fill(credentials.password);
  }

  async login(credentials: Credentials): Promise<void> {
    await this.fillForm(credentials);
    await this.loginButton.click();
  }
}
