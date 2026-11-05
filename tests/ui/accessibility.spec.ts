import { expect, test } from '../../fixtures';
import { expectNoViolations, scanAccessibility } from '../../utils/accessibility';

/** The "Iniciar sesión" link under the sign-up form. Its contrast defect is tracked by TC-043. */
const SIGNUP_LOGIN_LINK = '[data-testid="link-iniciar-sesion-signup"]';

test.describe('Accessibility (WCAG 2.2 AA)', () => {
  // An axe scan runs dozens of rules over the whole DOM; under local parallel load Firefox can need more than 30 s.
  test.slow();

  test('TC-037: Login page has no WCAG violations', { tag: '@regression' }, async ({ page, loginPage }) => {
    await loginPage.goto();

    expectNoViolations(await scanAccessibility(page));
  });

  test(
    'TC-038: Sign-up page has no WCAG violations apart from the known link contrast defect',
    { tag: '@regression' },
    async ({ page, registerPage }) => {
      await registerPage.goto();

      expectNoViolations(await scanAccessibility(page, { exclude: [SIGNUP_LOGIN_LINK] }));
    },
  );

  test('TC-039: Dashboard has no WCAG violations', { tag: '@regression' }, async ({ page, createUser, loginAs }) => {
    await loginAs(await createUser());

    expectNoViolations(await scanAccessibility(page));
  });

  test(
    'TC-040: Create account dialog has no WCAG violations',
    { tag: '@regression' },
    async ({ page, createUser, loginAs, createAccountModal }) => {
      const dashboard = await loginAs(await createUser({ initialBalance: null }));

      await dashboard.addAccountButton.click();
      await expect(createAccountModal.accountTypeDropdown).toBeVisible();

      expectNoViolations(await scanAccessibility(page));
    },
  );

  test(
    'TC-041: Send money dialog has no WCAG violations',
    { tag: '@regression' },
    async ({ page, createUser, loginAs, sendMoneyModal }) => {
      const dashboard = await loginAs(await createUser());

      await dashboard.sendMoneyButton.click();
      await expect(sendMoneyModal.sourceAccountDropdown).toBeVisible();

      expectNoViolations(await scanAccessibility(page));
    },
  );

  test(
    'TC-042: The login form can be filled in and submitted with the keyboard only',
    { tag: '@regression' },
    async ({ page, loginPage, dashboardPage, createUser }) => {
      const user = await createUser({ initialBalance: null });
      await loginPage.goto();

      await loginPage.emailInput.focus();
      await page.keyboard.type(user.email);
      await page.keyboard.press('Tab');
      await expect(loginPage.passwordInput).toBeFocused();
      await page.keyboard.type(user.password);
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(dashboardPage.title).toBeVisible();
    },
  );

  test(
    'TC-043: The "Iniciar sesión" link on the sign-up page meets the minimum text contrast',
    {
      tag: ['@regression', '@known-bug'],
      annotation: {
        type: 'issue',
        description:
          'App defect: the link uses #646cff on white, a contrast ratio of 4.09:1; WCAG 1.4.3 requires 4.5:1 for ' +
          'normal-size text. Remove test.fail() once the link colour is darkened.',
      },
    },
    async ({ page, registerPage }) => {
      test.fail();
      await registerPage.goto();

      expectNoViolations(await scanAccessibility(page, { include: [SIGNUP_LOGIN_LINK], rules: ['color-contrast'] }));
    },
  );
});
