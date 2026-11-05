import type { Locator, Page } from '@playwright/test';

export class SendMoneyModal {
  readonly recipientEmailInput: Locator;
  readonly sourceAccountDropdown: Locator;
  readonly amountInput: Locator;
  readonly sendButton: Locator;
  readonly insufficientBalanceError: Locator;

  constructor(readonly page: Page) {
    this.insufficientBalanceError = page.getByText('Saldo insuficiente');
    this.recipientEmailInput = page.getByRole('textbox', { name: 'Email del destinatario' });
    this.sourceAccountDropdown = page.getByRole('combobox', { name: 'Cuenta origen' });
    this.amountInput = page.getByRole('spinbutton', { name: 'Monto a enviar' });
    this.sendButton = page.getByRole('button', { name: 'Enviar', exact: true });
  }

  /** Fills the form using the sender's only account and submits it. */
  async send(recipientEmail: string, amount: number): Promise<void> {
    await this.recipientEmailInput.fill(recipientEmail);
    await this.sourceAccountDropdown.click();
    await this.page.getByRole('option').first().click();
    await this.amountInput.fill(String(amount));
    await this.sendButton.click();
  }
}
