import {Page, Locator} from '@playwright/test';

export class DashboardPage {
    readonly page: Page;
    readonly dashboardTitle: Locator;
    readonly addAccountButton: Locator;
    readonly sendMoneyButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dashboardTitle = page.getByTestId('titulo-dashboard');
        this.addAccountButton = page.getByTestId('tarjeta-agregar-cuenta');
        this.sendMoneyButton = page.getByTestId('boton-enviar')
    }
    async visitLoginPage() {
        await this.page.goto('http://localhost:3000/dashboard');
        await this.page.waitForLoadState('networkidle');
    }
    async visitDashboard() {
        await this.visitLoginPage();
        await this.page.waitForLoadState('networkidle');
    }

}