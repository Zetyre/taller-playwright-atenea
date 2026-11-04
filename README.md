# Athena Bank: E2E & API test automation (Playwright + TypeScript)

End-to-end and API test automation for **Athena Bank**, a demo banking web app (React frontend, Node/Express backend, MongoDB). Built with Playwright and TypeScript, using the Page Object Model, API-driven test setup and reusable authentication state.

> **Status: work in progress.** Started during the *Atenea* Playwright workshop and extended on my own. The sections [What's covered](#whats-covered) and [Roadmap](#roadmap) state exactly what exists today and what doesn't.

The application under test is **not included** in this repository (it is excluded in `.gitignore`). It runs locally: frontend on `http://localhost:3000`, backend API on `http://localhost:6007`.

## What this project demonstrates

- **Page Object Model.** Pages and modals are classes with locators and user actions; assertions live in the tests (`pages/`).
- **Accessible, test-id-based locators.** `getByRole`, `getByTestId` and `getByText`, not brittle CSS/XPath.
- **API-driven setup.** Users are created through the backend (`utils/backendUtils.ts`) instead of clicking through the UI, which keeps tests fast and independent.
- **Network validation.** UI actions are checked against the real API response (status code, token, user payload) using `page.waitForResponse`.
- **Failure simulation.** The front end's handling of a `500` response is tested with `page.route` mocking.
- **Reusable authentication state.** A `setup` project creates fresh transaction users, creates their bank accounts, and saves their sessions (`storageState`), so transaction tests start authenticated and ready to transfer.
- **Data-driven inputs.** Test data lives in `data/testData.json`.
- **Reproducible randomized transfers.** Amounts remain random integers from 1 to 1,000, derived from a run/test seed recorded in the report.
- **Cross-browser projects.** Chromium, Firefox and WebKit.
- **CI workflow and reports.** GitHub Actions workflow and Playwright HTML report.

## What's covered

| ID | Area | Scenario |
|---|---|---|
| TC-001 | Sign-up (UI) | Sign-up form shows all fields and the submit button |
| TC-002 | Sign-up (UI) | "Register" is disabled when the form is empty |
| TC-003 | Sign-up (UI) | "Register" is enabled once all fields are filled |
| TC-004 | Navigation | The sign-in link on the sign-up page leads to the login page |
| TC-005 | Sign-up (UI) | Successful registration shows the success notification |
| TC-006 | Sign-up (UI) | Registering with an already-used email shows an error |
| TC-007 | Login (UI) | Login with valid credentials reaches the dashboard |
| TC-008 | Sign-up (UI + API) | Registration is verified against the API response (`201`, token, user payload) |
| TC-009 | Sign-up (API) | Sign-up through the API alone |
| TC-010 | Sign-up (mocked) | Front end behavior when the sign-up API returns `500` |
| TC-011 | Login (UI + API) | Login with a user created through the API, and validation of the login response (`200`, token, user) |
| TC-012 | Transactions | Reject a transfer to a recipient without a bank account |
| TC-013 | Transactions (API + UI) | Transfer a random amount and verify sender/receiver balances and the incoming transfer |
| TC-014 | Transactions (UI) | Transfer a random amount through the UI and verify the incoming transfer |

## Project structure

```
.
├── pages/                 # Page Objects (login, register, dashboard, modals)
├── tests/
│   ├── register.spec.ts   # Sign-up scenarios
│   ├── login.spec.ts      # Login scenarios
│   ├── transactions.spec.ts
│   └── register.setup.ts  # Creates users and saves authenticated sessions
├── utils/backendUtils.ts  # API helpers (create users through the backend)
├── data/testData.json     # Test data
├── playwright.config.ts   # Projects: setup, chromium, firefox, webkit
└── .github/workflows/     # CI workflow
```

## Getting started

**Prerequisites**
- Node.js (LTS)
- The Athena Bank app running locally: frontend on port `3000`, backend on port `6007`, MongoDB available to the backend
- A user matching `data/testData.json` must already exist in the app's database for TC-007. Transaction tests create their own sender, receiver, and accountless recipient.

**Install**
```bash
npm ci
npx playwright install
```

**Generate the saved sessions** (needed by the transaction tests)
```bash
npx playwright test --project=setup
```

**Run the tests**
```bash
npx playwright test                       # all projects
npx playwright test --project=chromium    # one browser
npx playwright test tests/register.spec.ts
npx playwright test --ui                  # interactive mode
```

**Open the report**
```bash
npx playwright show-report
```

## GitHub Actions

The Playwright workflow runs on pushes and pull requests targeting `main`, `master`, or `cicd`, and can also be started manually from the Actions tab. It uses the official Playwright Docker image matching the locked Playwright version, so the browsers and their operating-system dependencies are already present instead of being downloaded and installed on each run. It starts a temporary MongoDB service, checks out the Athena Bank app at a pinned commit, starts the backend and frontend, seeds the login test user, type-checks the test project, and runs the Chromium, Firefox, and WebKit suites. Node.js is pinned to the major version in `.nvmrc`; GitHub Actions are pinned to full commit SHAs and Dependabot checks for updates weekly.

Because this repository is public, workflow artifacts are accessible to repository readers. The workflow removes browser attachments (including traces and screenshots) before uploading the HTML report, which is retained for 14 days. Only a successful run on `main` can publish a sanitized report to the `gh-pages` branch. Public copies omit Playwright attachments, and the archive keeps the 30 most recent reports. The archive is available at [GitHub Pages](https://zetyre.github.io/taller-playwright-atenea/). In repository settings, enable Pages with **Build and deployment → Source → Deploy from a branch**, then select `gh-pages` and `/(root)`. Configure the `github-pages` environment to allow deployment from `main`, and protect `main` with required pull requests and the `test` status check. The workflow uses its `GITHUB_TOKEN`; no personal access token secret is needed.

The Athena Bank app revision is pinned in the workflow. Update the SHA intentionally when you want to test a newer app revision; the app's dependency lockfiles are installed with `npm ci`.

## Known limitations

Documented here on purpose:

- `e2e/example.spec.ts` is Playwright's default example and will be removed.

## Roadmap

- [x] Start the app in CI and publish the HTML report
- [x] Move URLs to Playwright configuration and environment variables
- [x] Fix the unique-email generation and stop mutating shared test data
- [x] Make randomized transaction amounts reproducible from the CI run seed
- [ ] Replace `networkidle` waits with web-first assertions
- [ ] Add accessibility checks and more negative API tests
- [ ] Add `npm` scripts and a status badge

## Tech stack

Playwright (`@playwright/test`), TypeScript/Node.js, GitHub Actions.

## Author

**Cristian Marrero**, QA Engineer. [LinkedIn](https://www.linkedin.com/in/cristian-marrero)
