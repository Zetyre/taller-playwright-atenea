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
- **Reusable authentication state.** A `setup` project logs users in once and saves their session (`storageState`), so transaction tests start already authenticated.
- **Data-driven inputs.** Test data lives in `data/testData.json`.
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
| n/a | Transactions | Send money from one user to another, using saved session state |

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
- A user matching `data/testData.json` must already exist in the app's database (used by TC-007 and by the setup that logs in the receiving user)

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

## Known limitations

Documented here on purpose:

- **CI does not start the application yet.** The workflow installs dependencies and runs the tests, but the app has to be running for them to pass, so the pipeline needs a step that starts it (for example with Docker Compose).
- **The transaction test does not assert the result yet.** It performs the transfer but doesn't verify balances or the confirmation message.
- **URLs are hard-coded** (`localhost:3000` / `localhost:6007`) instead of using `baseURL` and environment variables.
- **TC-005 and TC-006 build their unique email incorrectly** (the `@` is dropped) and mutate the shared test data, which can cause flakiness when tests run in parallel.
- **Setup order is manual.** The `setup` project must be run before the transaction tests.
- `e2e/example.spec.ts` is Playwright's default example and will be removed.

## Roadmap

- [ ] Start the app in CI and publish the HTML report
- [ ] Move URLs to `baseURL` and `.env`
- [ ] Fix the unique-email generation and stop mutating shared test data
- [ ] Add assertions to the transaction flow, including balance checks through the API
- [ ] Declare the `setup` project as a dependency of the browser projects
- [ ] Replace `networkidle` waits with web-first assertions
- [ ] Add accessibility checks and more negative API tests
- [ ] Add `npm` scripts and a status badge

## Tech stack

Playwright (`@playwright/test`), TypeScript/Node.js, GitHub Actions.

## Author

**Cristian Marrero**, QA Engineer. [LinkedIn](https://www.linkedin.com/in/cristian-marrero)
