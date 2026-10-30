import {Page, Locator} from '@playwright/test';

export class ModalCreateAccount {
    readonly page: Page;
    readonly accountTypeDropdown: Locator;
    readonly mountInput: Locator;
    readonly cancelButton: Locator;
    readonly createAccountButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.accountTypeDropdown = page.getByRole('combobox', { name: 'Tipo de cuenta *' });
        this.mountInput = page.getByRole('spinbutton', { name: 'Monto inicial *' })
        this.cancelButton = page.getByTestId('boton-cancelar-crear-cuenta')
        this.createAccountButton = page.getByTestId('boton-crear-cuenta');
    }

    async selectAccountType(accountType: string) {
        await this.accountTypeDropdown.click();
        await this.page.getByRole('option', { name: accountType }).click();
 }
    async fillMountInput(mount: string) {
        await this.mountInput.fill(mount);
    }
}