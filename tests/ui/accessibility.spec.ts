import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../fixtures';
import type { DashboardPage } from '../../pages/dashboardPage';
import type { LoginPage } from '../../pages/loginPage';
import type { RegisterPage } from '../../pages/registerPage';
import type { BankUser } from '../../types/api';
import { expectNoViolations, expectSufficientContrast, scanAccessibility } from '../../utils/accessibility';

/**
 * "¿Ya tienes cuenta? Iniciar sesión" under the sign-up form. It is covered by the particle background (TC-043),
 * and axe measures it against the page's white base instead, so it is left out of the sign-up scan.
 */
const SIGNUP_LOGIN_PROMPT = '[data-testid="texto-pregunta-cuenta"]';

const knownBug = (description: string) => ({
  tag: ['@regression', '@known-bug'],
  annotation: { type: 'issue', description: `${description} Remove test.fail() once the app is fixed.` },
});

test.describe('Accessibility (WCAG 2.2 AA)', () => {
  // An axe scan or a contrast measurement takes screenshots and runs over the whole DOM; under local parallel
  // load Firefox can need more than 30 s.
  test.slow();

  test.describe('axe-core scans', () => {
    test('TC-037: Login page has no WCAG violations', { tag: '@regression' }, async ({ page, loginPage }) => {
      await loginPage.goto();

      expectNoViolations(await scanAccessibility(page));
    });

    test('TC-038: Sign-up page has no WCAG violations', { tag: '@regression' }, async ({ page, registerPage }) => {
      await registerPage.goto();

      expectNoViolations(await scanAccessibility(page, { exclude: [SIGNUP_LOGIN_PROMPT] }));
    });

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
  });

  test.describe('Keyboard', () => {
    test(
      'TC-042: The login form can be filled in and submitted with the keyboard only',
      { tag: '@regression' },
      async ({ page, loginPage, dashboardPage, createUser }) => {
        const user = await createUser({ initialBalance: null });
        await loginPage.goto();

        // What is under test is focus order and submitting with Enter, not typing speed. Each value goes in as one
        // input event (like pasting): typing key by key can drop a character when the animated background keeps
        // the browser busy, because the form re-renders its state on every keystroke.
        await loginPage.emailInput.focus();
        await page.keyboard.insertText(user.email);
        await page.keyboard.press('Tab');
        await expect(loginPage.passwordInput).toBeFocused();
        await page.keyboard.insertText(user.password);
        await expect(loginPage.emailInput).toHaveValue(user.email);
        await expect(loginPage.passwordInput).toHaveValue(user.password);
        await page.keyboard.press('Enter');

        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(dashboardPage.title).toBeVisible();
      },
    );

    test(
      'TC-047: "Agregar cuenta" can be reached with Tab and opened with Enter',
      knownBug(
        'Zetyre/redux-athena-bank#5. ' +
          'App defect (WCAG 2.1.1, 4.1.2): the "Agregar cuenta" tile is a <div> with an onClick handler and no ' +
          'tabindex or role, so keyboard and screen reader users cannot open a new account.',
      ),
      async ({ page, createUser, loginAs, createAccountModal }) => {
        test.fail();
        const dashboard = await loginAs(await createUser());

        const tabStops: (string | null)[] = [];
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
          tabStops.push(await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null));
        }
        expect(tabStops, 'Elements reached with Tab').toContain('tarjeta-agregar-cuenta');

        await dashboard.addAccountButton.focus();
        await page.keyboard.press('Enter');
        await expect(createAccountModal.accountTypeDropdown).toBeVisible();
      },
    );
  });

  test.describe('Contrast, measured on screen', () => {
    // Each known-bug check is its own test, so fixing one text in the app turns exactly one test from "expected to
    // fail" into a failure that says which test.fail() to remove.

    const signUpPromptBug = knownBug(
      'Zetyre/redux-athena-bank#3. ' +
        'App defect (WCAG 1.4.3, 1.4.10): in SignUp.tsx the prompt sits outside the form card and below the fixed ' +
        'particle canvas (z-index 0), so it is never painted, while its link still receives focus and clicks. It ' +
        'also pushes the page 30px wider than a 320px viewport.',
    );

    for (const [name, target] of [
      ['prompt text', (registerPage: RegisterPage) => registerPage.loginPrompt],
      ['"Iniciar sesión" link', (registerPage: RegisterPage) => registerPage.loginPromptLink],
    ] as const) {
      test(
        `TC-043: The "¿Ya tienes cuenta? Iniciar sesión" prompt on the sign-up page is visible: ${name}`,
        signUpPromptBug,
        async ({ registerPage }) => {
          test.fail();
          await registerPage.goto();

          await expectSufficientContrast(target(registerPage));
        },
      );
    }

    test(
      'TC-043: The sign-up page fits a 320px-wide screen without horizontal scrolling',
      signUpPromptBug,
      async ({ page, registerPage }) => {
        test.fail();
        await page.setViewportSize({ width: 320, height: 640 });
        await registerPage.goto();

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, 'Pixels the page is wider than a 320px viewport').toBe(0);
      },
    );

    const loginAndSignUpBug = knownBug(
      'Zetyre/redux-athena-bank#4. ' +
        'App defect (WCAG 1.4.3): white button text on the blue-to-cyan gradient drops to about 2.4:1 over the cyan ' +
        'end, and the label of a focused field is MUI default blue #1976d2 on a dark card (about 3.7:1).',
    );

    type FormPages = { loginPage: LoginPage; registerPage: RegisterPage; user: BankUser };
    for (const [name, open] of [
      [
        'login button',
        async ({ loginPage }: FormPages) => {
          await loginPage.goto();
          return loginPage.loginButton;
        },
      ],
      [
        'focused field label',
        async ({ loginPage, user }: FormPages) => {
          await loginPage.goto();
          await loginPage.fillForm(user);
          await loginPage.passwordInput.focus();
          return loginPage.passwordLabel;
        },
      ],
      [
        'sign-up button',
        async ({ registerPage, user }: FormPages) => {
          await registerPage.goto();
          // Filled in, so the button is enabled and shows its normal colours.
          await registerPage.fillForm({ ...user, email: `other.${user.email}` });
          return registerPage.registerButton;
        },
      ],
    ] as const) {
      test(
        `TC-044: Text on the login and sign-up pages meets the contrast minimum: ${name}`,
        loginAndSignUpBug,
        async ({ loginPage, registerPage, createUser }) => {
          test.fail();
          const user = await createUser({ initialBalance: null });

          await expectSufficientContrast(await open({ loginPage, registerPage, user }));
        },
      );
    }

    const dashboardBug = knownBug(
      'Zetyre/redux-athena-bank#4. ' +
        'App defect (WCAG 1.4.3): on the teal account card the account type (#a6b1e1) is about 1.7:1 and the ' +
        'balance about 3.5:1; "Agregar fondos" drops to about 1.7:1 over the cyan end of its gradient; ' +
        'transaction rows use #2e7d32 green (incoming) and #d32f2f red (outgoing) on a dark card (about 3.5:1).',
    );

    type DashboardTexts = { dashboard: DashboardPage; incoming: Locator; outgoing: Locator };
    for (const [name, target] of [
      ['account type', ({ dashboard }: DashboardTexts) => dashboard.accountType],
      ['account balance', ({ dashboard }: DashboardTexts) => dashboard.accountBalance],
      ['"Agregar fondos" button', ({ dashboard }: DashboardTexts) => dashboard.addFundsButton],
      ['incoming description', ({ incoming }: DashboardTexts) => incoming.getByTestId('descripcion-transaccion')],
      ['incoming amount', ({ dashboard, incoming }: DashboardTexts) => dashboard.transactionAmount(incoming)],
      ['outgoing description', ({ outgoing }: DashboardTexts) => outgoing.getByTestId('descripcion-transaccion')],
      ['outgoing amount', ({ dashboard, outgoing }: DashboardTexts) => dashboard.transactionAmount(outgoing)],
    ] as const) {
      test(
        `TC-045: Text on the dashboard meets the contrast minimum: ${name}`,
        dashboardBug,
        async ({ api, createUser, loginAs }) => {
          test.fail();
          const [user, recipient] = await Promise.all([createUser(), createUser()]);
          await api.transfer(user.token, { fromAccountId: user.account!._id, toEmail: recipient.email, amount: 50 });
          const dashboard = await loginAs(user);
          // Opening the account records an incoming "Cuenta activada" row; the transfer records an outgoing one.
          const incoming = dashboard.transaction(`Cuenta activada ${user.account!.last4}`);
          const outgoing = dashboard.transaction(`Transferencia a ${recipient.email}`);
          await expect(incoming).toBeVisible();
          await expect(outgoing).toBeVisible();

          await expectSufficientContrast(target({ dashboard, incoming, outgoing }));
        },
      );
    }

    test(
      'TC-046: Readable text passes the on-screen contrast check',
      { tag: '@regression' },
      async ({ loginPage, registerPage, createUser, loginAs }) => {
        // Control for the measurement itself: text that is clearly readable must pass, so the known-bug
        // contrast tests fail because of the app, not because of the check.
        await loginPage.goto();
        await expectSufficientContrast(loginPage.title, { soft: true });
        await expectSufficientContrast(loginPage.signUpLink, { soft: true });

        await registerPage.goto();
        await expectSufficientContrast(registerPage.title, { soft: true });

        const dashboard = await loginAs(await createUser());
        await expectSufficientContrast(dashboard.title, { soft: true });
        await expectSufficientContrast(dashboard.totalBalance, { soft: true });
        await expectSufficientContrast(dashboard.totalBalanceLabel, { soft: true });
      },
    );

    const notificationBug = knownBug(
      'Zetyre/redux-athena-bank#8. ' +
        'App defect (WCAG 1.4.3): toasts use the notistack default colours, white text on #43a047 (success, about ' +
        '3.3:1) and on #2196f3 (info, about 3.1:1). Every confirmation of a completed action is hard to read.',
    );

    test(
      'TC-050: Notifications meet the contrast minimum: success',
      notificationBug,
      async ({ page, createUser, loginAs, createAccountModal }) => {
        test.fail();
        const dashboard = await loginAs(await createUser({ initialBalance: null }));

        await dashboard.addAccountButton.click();
        await createAccountModal.createAccount('Ahorros', 100);
        const success = page.getByRole('alert').filter({ hasText: 'Cuenta creada' });
        await expect(success).toBeVisible();

        await expectSufficientContrast(success);
      },
    );

    test(
      'TC-050: Notifications meet the contrast minimum: info',
      notificationBug,
      async ({ page, createUser, loginAs }) => {
        test.fail();
        const dashboard = await loginAs(await createUser());

        await dashboard.freezeAccountButton.click();
        await page.getByRole('dialog').getByRole('button', { name: 'Congelar' }).click();
        const info = page.getByRole('alert').filter({ hasText: 'Cuenta congelada' });
        await expect(info).toBeVisible();

        await expectSufficientContrast(info);
      },
    );
  });

  test.describe('Page metadata', () => {
    test(
      'TC-048: The page language is declared as Spanish',
      knownBug(
        'Zetyre/redux-athena-bank#6. ' +
          'App defect (WCAG 3.1.1): index.html declares <html lang="en"> but the whole interface is in Spanish, so ' +
          'screen readers read it with English pronunciation.',
      ),
      async ({ page, loginPage }) => {
        test.fail();
        await loginPage.goto();

        await expect(page.locator('html')).toHaveAttribute('lang', /^es\b/);
      },
    );

    test(
      'TC-049: Each page has its own descriptive title',
      knownBug(
        'Zetyre/redux-athena-bank#7. ' +
          'App defect (WCAG 2.4.2): every page keeps the Vite template title "Vite + React + TS", so tabs, history ' +
          'and screen readers cannot tell the pages apart.',
      ),
      async ({ page, loginPage, registerPage, createUser, loginAs }) => {
        test.fail();
        await loginPage.goto();
        const loginTitle = await page.title();
        await registerPage.goto();
        const signupTitle = await page.title();
        await loginAs(await createUser({ initialBalance: null }));
        const dashboardTitle = await page.title();

        const titles = [loginTitle, signupTitle, dashboardTitle];
        expect(titles, 'Page titles').not.toContain('Vite + React + TS');
        expect(new Set(titles).size, `Distinct titles among ${JSON.stringify(titles)}`).toBe(titles.length);
      },
    );
  });

  test.describe('Forms', () => {
    const autofillBug = knownBug(
      'Zetyre/redux-athena-bank#9. ' +
        'App defect (WCAG 1.3.5): no field sets an autocomplete purpose, and the sign-up form sets ' +
        'autocomplete="off", so browsers and assistive tools cannot fill in or label the user\'s own data.',
    );

    /** Every field's autocomplete value, read once: the attributes are static, so retrying assertions would only wait. */
    const autocompleteByField = (page: Page) =>
      page
        .locator('form input[name]')
        .evaluateAll(inputs =>
          Object.fromEntries(
            (inputs as HTMLInputElement[]).map(input => [input.name, input.getAttribute('autocomplete')]),
          ),
        );

    test('TC-051: Form fields identify their purpose for autofill: login', autofillBug, async ({ page, loginPage }) => {
      test.fail();
      await loginPage.goto();
      await expect(loginPage.passwordInput).toBeVisible();

      expect(await autocompleteByField(page)).toEqual({ email: 'email', password: 'current-password' });
    });

    test(
      'TC-051: Form fields identify their purpose for autofill: sign-up',
      autofillBug,
      async ({ page, registerPage }) => {
        test.fail();
        await registerPage.goto();
        await expect(registerPage.passwordInput).toBeVisible();

        expect(await autocompleteByField(page)).toEqual({
          firstName: 'given-name',
          lastName: 'family-name',
          email: 'email',
          password: 'new-password',
        });
      },
    );
  });
});
