import { expect, type Locator, type Page, type Response } from '@playwright/test';

export class DashboardPage {
  readonly title: Locator;
  readonly addAccountButton: Locator;
  readonly sendMoneyButton: Locator;
  readonly logoutButton: Locator;
  readonly transactionItems: Locator;
  readonly totalBalance: Locator;
  readonly totalBalanceLabel: Locator;
  /** Account card fields and actions. With several accounts these match every card; tests use one account. */
  readonly accountType: Locator;
  readonly accountBalance: Locator;
  readonly freezeAccountButton: Locator;
  readonly addFundsButton: Locator;

  constructor(readonly page: Page) {
    this.title = page.getByTestId('titulo-dashboard');
    this.addAccountButton = page.getByTestId('tarjeta-agregar-cuenta');
    this.sendMoneyButton = page.getByTestId('boton-enviar');
    this.logoutButton = page.getByTestId('boton-logout');
    this.transactionItems = page.getByTestId('item-transaccion');
    this.totalBalance = page.getByTestId('saldo-total-dashboard');
    this.totalBalanceLabel = page.getByTestId('saldo-total-dashboard-label');
    this.accountType = page.getByTestId('tipo-cuenta');
    this.accountBalance = page.getByTestId('saldo-cuenta');
    this.freezeAccountButton = page.getByTestId('boton-congelar-cuenta');
    this.addFundsButton = page.getByTestId('boton-agregar-fondos');
  }

  /**
   * Opens the dashboard and waits until its data has loaded.
   * The app fetches accounts and transactions once on mount and only shows a toast if that fails,
   * so waiting for both responses makes a failed load show up here instead of as a missing row later.
   */
  async goto(): Promise<void> {
    const accountsLoaded = this.waitForApi('/api/accounts');
    const transactionsLoaded = this.waitForApi('/api/transactions');
    await this.page.goto('/dashboard');
    await expect(this.title).toBeVisible();
    for (const [name, response] of [
      ['accounts', await accountsLoaded],
      ['transactions', await transactionsLoaded],
    ] as const) {
      expect(response.status(), `Dashboard failed to load ${name}`).toBe(200);
    }
  }

  private waitForApi(path: string): Promise<Response> {
    return this.page.waitForResponse(
      response => new URL(response.url()).pathname === path && response.request().method() === 'GET',
    );
  }

  /** A transaction row whose description matches exactly, e.g. "Transferencia de a@b.com". */
  transaction(description: string): Locator {
    return this.transactionItems.filter({
      has: this.page.getByTestId('descripcion-transaccion').getByText(description, { exact: true }),
    });
  }

  transactionAmount(transaction: Locator): Locator {
    return transaction.getByTestId('monto-transaccion');
  }
}
