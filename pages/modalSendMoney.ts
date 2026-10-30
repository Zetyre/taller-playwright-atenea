import {Page, Locator} from '@playwright/test';

export class ModalSendMoney {
    readonly page: Page;
    readonly receiverEmailInput: Locator;
    readonly originAccountDropdown: Locator;
    readonly inputMount: Locator;
    readonly sendMoneyButtton: Locator;
    readonly cancelMoneySendButton: Locator;
    readonly originAccountOption: Locator;

    constructor(page: Page) {
        this.page = page;
        this.receiverEmailInput = page.getByRole('textbox', { name: 'Email del destinatario *' })
        this.originAccountDropdown = page.getByRole('combobox', { name: 'Cuenta origen *' })
        this.inputMount = page.getByRole('spinbutton', { name: 'Monto a enviar *' })
        this.sendMoneyButtton = page.getByRole('button', { name: 'Enviar' })
        this.cancelMoneySendButton = page.getByRole('button', { name: 'Cancelar' })
        this.originAccountOption = page.getByRole('option', { name: '••••' })
    }

    async completeandClickSendButton(userReceives: string) {
        await this.receiverEmailInput.fill(userReceives);
        await this.originAccountDropdown.click();
        await this.originAccountOption.first().click();
        await this.inputMount.fill('100');
        await this.sendMoneyButtton.click();
    }
}