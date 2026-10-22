import {Page, Locator} from '@playwright/test';

export class RegisterPage {
    readonly page: Page;
    readonly firstNameInput: Locator;
    readonly lastNameInput: Locator;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly registerButton: Locator;
    readonly loginButton: Locator;  

    constructor(page: Page) {
        this.page = page;
        this.firstNameInput = page.locator('input[name=firstName]');
        this.lastNameInput = page.locator('input[name=lastName]');
        this.emailInput = page.locator('input[name=email]');
        this.passwordInput = page.locator('input[name=password]');
        this.registerButton = page.getByTestId('boton-registrarse');
        this.loginButton = page.getByTestId('boton-login-header-signup');
    }
    async visitRegisterPage() {
        await this.page.goto('http://localhost:3000/');
        await this.page.waitForLoadState('networkidle');
    }


   async fillRegistrationForm(usuario: { firstName: string; lastName: string; email: string; password: string }) {
        await this.firstNameInput.fill(usuario.firstName);
        await this.lastNameInput.fill(usuario.lastName);
        await this.emailInput.fill(usuario.email);
        await this.passwordInput.fill(usuario.password);
   }
    async clickRegisterButton() {
        await this.registerButton.click();
    }

    async completeRegistration(usuario: { firstName: string; lastName: string; email: string; password: string }) {
        await this.fillRegistrationForm(usuario);
        await this.clickRegisterButton();
    }
}