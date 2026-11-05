import type { Locator, Page } from '@playwright/test';

export class CreateAccountModal {
  readonly accountTypeDropdown: Locator;
  readonly initialAmountInput: Locator;
  readonly createButton: Locator;

  constructor(readonly page: Page) {
    this.accountTypeDropdown = page.getByRole('combobox', { name: 'Tipo de cuenta' });
    this.initialAmountInput = page.getByRole('spinbutton', { name: 'Monto inicial' });
    this.createButton = page.getByTestId('boton-crear-cuenta');
  }

  async createAccount(accountType: string, initialAmount: number): Promise<void> {
    await this.accountTypeDropdown.click();
    await this.page.getByRole('option', { name: accountType }).click();
    await this.initialAmountInput.fill(String(initialAmount));
    await this.createButton.click();
  }
}
