# Repo Notes

## Commit Messages

- Use the subject format `type(scope): imperative summary`.
- Allowed `type` values include `fix`, `feat`, `chore`, `refactor`, and similar standard prefixes.
- Keep the scope short and focused on the feature or area being changed.
- Always include a non-empty commit message body.
- The body should explain the concrete changes made and the reason for them, not just restate the subject.

## Playwright Usage

- Use `bunx playwright ...` for ALL Playwright interactions. Do not use `npx`, `npm`, or custom scripts.
- DO NOT create or execute Playwright scripts for testing, screenshots, or page checks.
- ALL Playwright usage must be done via CLI commands only.
- Use the saved authenticated Playwright storage state at `playwright/.auth/user.json` for ALL protected local flows.
- The authenticated testing flow is storage-state-based. Do NOT use persistent Chromium profiles.
- For any authenticated Playwright CLI command, ALWAYS include:
  `--load-storage=playwright/.auth/user.json`
- Example authenticated screenshot command:
  `bunx playwright screenshot --load-storage=playwright/.auth/user.json http://localhost:3000/dashboard .artifacts/screenshots/dashboard.png`
- Store Playwright artifacts in:
  `.artifacts/<type>/<name>.<ext>`
  Example:
  `.artifacts/screenshots/dashboard.png`
- Do NOT attempt Discord or Clerk login via automation.
- If authentication is required and missing, STOP and instruct the user to run:
  `bunx tsx scripts/playwright/save-auth.ts`
- To verify authentication manually, instruct the user to run:
  `bunx tsx scripts/playwright/check-auth.ts`
- Always use:
  `http://localhost:3000`
  Never use `127.0.0.1` (auth is origin-bound).
- If a protected route redirects to sign-in:
  - Assume auth state is invalid first
  - Do NOT debug app logic until auth is confirmed valid
- Do not run multiple Playwright commands in parallel against the same auth state.
- Prefer single-shot CLI commands (e.g. screenshot, open, pdf) over any multi-step automation.
- Any solution that involves writing Playwright scripts instead of using CLI commands is incorrect.
