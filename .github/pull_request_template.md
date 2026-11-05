## What and why

<!-- What does this change, and why is it needed? Link an issue if there is one. -->

## Type of change

- [ ] New or changed tests
- [ ] Framework (fixtures, page objects, API client, config)
- [ ] CI / tooling
- [ ] Documentation

## Checklist

- [ ] `npm run check` passes (type-check, lint, format)
- [ ] New tests create their own data through fixtures; no shared users or state
- [ ] Locators use roles, labels or test IDs; no fixed waits or `networkidle`
- [ ] New tests are tagged `@smoke` or `@regression`, with a `TC-` ID
- [ ] Ran the affected tests locally with `--retries=0`
- [ ] README updated if behaviour, scripts or coverage changed

## Evidence

<!-- Test output, report screenshots or the CI run link. -->
