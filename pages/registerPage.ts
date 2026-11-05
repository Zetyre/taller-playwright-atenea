import { expect, type Locator, type Page } from '@playwright/test';
import type { NewUser } from '../types/api';

export class RegisterPage {
  readonly title: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly registerButton: Locator;
  readonly headerLoginButton: Locator;

  constructor(readonly page: Page) {
    this.title = page.getByTestId('titulo-registro');
    this.firstNameInput = page.getByLabel('Nombre');
    this.lastNameInput = page.getByLabel('Apellido');
    this.emailInput = page.getByLabel('Correo electrónico');
    this.passwordInput = page.getByLabel('Contraseña');
    this.registerButton = page.getByTestId('boton-registrarse');
    this.headerLoginButton = page.getByTestId('boton-login-header-signup');
  }

  async goto(): Promise<void> {
    await this.page.goto('/signup');
    await expect(this.title).toBeVisible();
  }

  async fillForm(user: NewUser): Promise<void> {
    await this.firstNameInput.fill(user.firstName);
    await this.lastNameInput.fill(user.lastName);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
  }

  async register(user: NewUser): Promise<void> {
    await this.fillForm(user);
    await this.registerButton.click();
  }
}
