import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/dashboardPage';
import { ModalSendMoney } from '../pages/modalSendMoney';
import TestData from '../data/testData.json'

let dashboardPage: DashboardPage;
let modalSendMoney: ModalSendMoney

const testSendingUser = test.extend({
    storageState: 'playwright/.auth/userSends.json',
});

const testReceivingUser = test.extend({
    storageState: 'playwright/.auth/userReceives.json',
});

test.beforeEach(async ({ page }) => {
  dashboardPage = new DashboardPage(page);
  modalSendMoney = new ModalSendMoney(page);
  await dashboardPage.visitDashboard();
});

testSendingUser('Send money from one user to another', async () => {
    await expect(dashboardPage.dashboardTitle).toBeVisible();
    await dashboardPage.sendMoneyButton.click();
    await modalSendMoney.completeandClickSendButton(TestData.usuarioValido.email);
});