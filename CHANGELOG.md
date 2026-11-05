# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Accessibility audit (TC-037 to TC-049): axe-core scans against WCAG 2.2 A and AA for every screen and dialog,
  a keyboard-only login test, and on-screen contrast, keyboard access, page language and page title checks.
- `utils/accessibility.ts`: `scanAccessibility` waits for animations to settle and attaches the axe results to the
  report; `measureTextContrast` and `expectSufficientContrast` measure text contrast against the pixels rendered
  behind it, which axe cannot do over the app's particle canvas and gradients.
- Five accessibility defects documented as `test.fail()` known bugs: the invisible sign-up prompt (TC-043), text
  contrast on the login, sign-up and dashboard pages (TC-044, TC-045), the "Agregar cuenta" tile not reachable by
  keyboard (TC-047), the page language (TC-048) and the page titles (TC-049). TC-046 is a control that proves the
  contrast check passes readable text.

## [1.0.0] - 2026-11-05

First stable version of the framework.

### Added

- Typed Playwright fixtures: page objects, API client, `createUser`, `loginAs`, `openDashboardInNewContext`,
  `randomAmount`. Every test creates its own users and accounts through the API.
- Browserless `api` project with contract and negative tests for auth, accounts and transfers.
- UI coverage for sign-up, login, sessions (route guard, logout), account creation and transfers across Chromium,
  Firefox and WebKit. 36 test cases, 76 executions, tagged `@smoke` / `@regression`.
- TC-036 documents an app defect: a transfer to your own account increases the balance (`test.fail()`).
- ESLint (type-aware `typescript-eslint`, `eslint-plugin-playwright`), Prettier, EditorConfig and VS Code settings.
- CI pipeline: quality gate, one job per browser, merged HTML report with job summary, nightly and manual runs, a
  single `test` gate for branch protection, and a published report archive on GitHub Pages.

### Changed

- Removed `networkidle` waits in favour of web-first assertions, and the shared setup project in favour of per-test
  data.

### Fixed

- Parallel runs no longer race on shared sender and receiver accounts.
- The Pages archive now prunes old reports and also publishes failed runs.
