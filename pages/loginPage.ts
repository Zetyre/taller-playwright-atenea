import {Page, Locator} from '@playwright/test';

export class LoginPage {
    readonly page: Page;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly loginButton: Locator;  

    constructor(page: Page) {
        this.page = page;
        this.emailInput = page.locator('input[name=email]');
        this.passwordInput = page.locator('input[name=password]');
        this.loginButton = page.getByTestId('boton-login');
    }
    async visitLoginPage() {
        await this.page.goto('http://localhost:3000/login');
        await this.page.waitForLoadState('networkidle');
    }


   async fillLoginForm(usuario: { email: string; password: string }) {
        await this.emailInput.fill(usuario.email);
        await this.passwordInput.fill(usuario.password);
   }
    async clickLoginButton() {
        await this.loginButton.click();
    }

    async completeLogin(usuario: { email: string; password: string }) {
        await this.fillLoginForm(usuario);
        await this.clickLoginButton();
    }
}