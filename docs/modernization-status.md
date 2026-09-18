# Modernization working notes

## Baseline

The initial working tree was clean at `5401083` on
`refactor/shadcn-baseui-rebaseline`. Local history contains all commits from
`main` and `origin/feat/stripe-hosted-fx-estimates`, ahead by 18 and 5 respectively.
Issues #27 through #36 were read through GitHub CLI without modifying them.

Initial checks reproduced missing shared UI utility/mobile-hook exports,
TanStack Table v9 generic constraint errors, and a typescript-eslint crash
against the TypeScript 7 API. Feature tests passed five dashboard assertions;
the creator test could not resolve the installed icon dependency.

## Workstreams

- [ ] Stabilize package boundaries and dependency tooling.
- [ ] Complete Base UI + Mira and inspect shared component interactions.
- [ ] Separate presentation flags from backend operational policy.
- [ ] Consolidate request-scoped viewer/access resolution.
- [ ] Consolidate dashboard subscriptions and bound growing reads.
- [ ] Verify existing hosted billing, FX and creator behavior.
- [ ] Replace server viewport branching with responsive composition.
- [ ] Scope application providers away from public routes.
- [ ] Improve public pages, auth and protected application UX.
- [ ] Validate browser behavior, performance and regressions.

## TypeScript research

[Microsoft's TypeScript 7 release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)
document the supported compatibility arrangement: `@typescript/native` aliases
TypeScript 7 and supplies `tsc`; `typescript` aliases `@typescript/typescript6`
and supplies the JavaScript API used by typescript-eslint. Keep both versions
explicit, with the application compiler pinned to 7.0.2. No version warnings or
lint rules need suppression. The old native-preview dependency has no tracked
callers and is superseded by the released compiler.

## Decisions

Keep the shared utility export as the public boundary, re-exporting the existing
`cn` implementation. The sidebar and app shell both need mobile interaction
detection, so its hook belongs in the UI package. Do not add an app alias there.

Later workstreams remain unverified until their checks are recorded here.
