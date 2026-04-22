# Multi-Tier Fact-Check E2E Design

Date: 2026-04-22
Status: Proposed
Owner: Codex

## Goal

Add true end-to-end verification for the multi-tier fact-check feature so we can ship with confidence.

The design must verify:

- the dashboard UX for `basic`, `standard`, and `premium`
- settings persistence and the default-off rollout guardrail
- the real application wiring across UI, API routes, local persistence, and report rendering
- the CLI and MCP entrypoints at a smoke level
- a later live-provider verification lane that is incremental and cost-controlled

This design does not attempt to replace the existing Bun and Vitest integration suites. It adds the missing browser-driven and entrypoint-level coverage on top of them.

## Non-Goals

- full browser coverage for the entire product
- always-on live API testing in CI
- broad visual snapshot testing
- replacing current lower-level unit and integration tests
- load testing or performance benchmarking

## Current Gap

The branch already has meaningful lower-level coverage:

- Bun tests for core orchestration, provider logic, telemetry, and multi-tier integration
- dashboard Vitest coverage for component and route-level behavior

What is still missing is the shipped user journey:

- a real browser selecting a tier in Settings
- a real browser triggering a check and seeing the correct tier-specific result
- a real browser observing the `premium` deep-audit lifecycle states
- CLI and MCP entrypoint smokes that prove the feature can be exercised from those surfaces

Without that layer, we can say the internals work, but not yet that the feature is fully shippable from the user's point of view.

## Recommended Approach

Implement two separate verification lanes.

### Lane 1: Mocked-Provider E2E

This is the main new lane. It uses real app processes, real local persistence, and a real browser, while replacing external provider calls with deterministic test fixtures.

Properties:

- cheap to run repeatedly
- deterministic and CI-friendly
- exercises the full application stack except third-party APIs
- suitable for rapid fix-and-retest loops

External systems to mock:

- MiniMax extraction calls
- Exa search responses
- Gemini grounded fact-check responses
- Gemini deep-research initiation and polling responses

Real systems to keep:

- dashboard UI
- API routes
- local DB reads and writes
- report rendering
- tier selection persistence
- application routing and state transitions

### Lane 2: Live-Provider Verification

This is a second lane, not part of routine CI. It verifies that the mocked lane still matches reality closely enough and catches provider-specific issues.

Properties:

- manually triggered or gated by explicit env flags
- run incrementally to control spend
- starts with the cheapest tiers first
- `premium` is sparse and deliberate because deep research is the expensive path

Execution order:

1. Live `basic` smoke
2. Live `standard` smoke
3. Live `premium` smoke on a single article only, after the first two pass

## Why This Approach

This splits confidence into two useful layers:

- mocked E2E tells us whether the shipped product is wired correctly
- live verification tells us whether external provider assumptions still hold

If we skip the mocked lane, debugging becomes expensive and slow because every failure burns API calls. If we skip the live lane entirely, we risk shipping UI and orchestration that only works against synthetic fixtures.

## Test Architecture

### Browser Framework

Use Playwright for the dashboard E2E suite.

Reasons:

- stable browser automation with strong waiting primitives
- good support for isolated fixtures and per-test setup
- supports local web app flows cleanly
- suitable for both local runs and CI later

### App Under Test

The E2E harness should start the real local app stack in a dedicated test mode:

- dashboard app
- API routes used by the dashboard
- local DB/config pointed at temporary test paths

The suite should not reuse a developer's real `~/.checkapp` data.

### Test Mode

Add an explicit E2E test mode that:

- redirects config and SQLite storage to temp paths
- enables deterministic provider mocking
- exposes a small fixture interface for scenario selection
- prevents accidental live provider usage unless explicitly enabled

Suggested env shape:

- `CHECKAPP_E2E=1`
- `CHECKAPP_E2E_SCENARIO=<name>`
- `CHECKAPP_CONFIG_PATH=<temp file>`
- `CHECKAPP_DB_PATH=<temp sqlite file>`
- `CHECKAPP_ALLOW_LIVE_PROVIDERS=0|1`

Exact names can change during implementation, but the design requires a clear separation between mocked and live runs.

### Mocking Strategy

Prefer app-level provider mocks over browser-level network stubs.

Reasoning:

- the browser should see the app exactly as a real user would
- provider behavior is shared across dashboard, CLI, and MCP
- app-level mocks can be reused by browser, CLI, and MCP tests
- browser-only route interception would not validate server-side orchestration consistently

Implementation shape:

- a small fixture registry keyed by scenario name
- provider adapters consult the registry when E2E mode is on
- each scenario supplies deterministic responses for MiniMax, Exa, grounded Gemini, and deep-audit polling

### Data Isolation

Each test run should get isolated local state:

- temp config file
- temp DB file
- temp artifacts directory if needed

This prevents flaky interactions between tests and avoids corrupting developer data.

## Phase 1 Scope: Mocked E2E

Phase 1 should be the minimum shippable E2E suite for the feature.

### Dashboard Cases

1. Default-off guardrail

- open Settings
- verify initial state reflects routed tiers effectively off by default
- reload the page and confirm state persistence
- ensure the UI messaging is consistent with rollout-disabled behavior

2. Basic tier happy path

- select `basic`
- persist settings
- run a check from the dashboard
- verify report renders the legacy fact-check path
- verify no deep-audit UI is shown

3. Standard tier happy path

- select `standard`
- persist settings
- run a check
- verify grounded fact-check result appears
- verify grounded evidence/result metadata expected for the scenario

4. Premium tier pending state

- select `premium`
- run a check
- verify the report shows the deep-audit pending state
- verify the UI communicates async status correctly

5. Premium tier completed state

- run or open a premium report whose deep audit completes
- verify findings, metadata, and result panels render correctly
- verify prior audit or status disclosures render correctly if present in the design

6. Premium tier failed state

- open or create a report with a mocked failed audit
- verify the failure UI is clear and non-broken
- verify retry or follow-up affordances match the implemented UX

7. Settings reload regression

- change tier
- navigate away and back
- reload the browser
- confirm the selected tier and rollout-related behavior remain consistent

8. Report browsing regression

- open existing reports with different tier outputs
- verify the app does not regress when browsing among `basic`, `standard`, and `premium` results

### CLI Smoke Cases

These are not browser tests, but they belong in the same E2E plan.

1. Mocked `basic` CLI smoke
- run the CLI headless check
- verify successful exit and result shape

2. Mocked `standard` CLI smoke
- run the CLI headless check
- verify grounded path result shape

3. Mocked `premium` CLI smoke
- run the CLI flow that initiates premium behavior
- verify async audit start output and persisted state

### MCP Smoke Cases

1. Mocked article check through MCP
- start MCP server in E2E mode
- call the check flow through the MCP tool surface
- verify result shape for at least `basic` and `standard`

2. Mocked deep-audit status retrieval
- verify premium-related MCP status retrieval behaves correctly for pending and completed cases

## Phase 2 Scope: Live Verification

Phase 2 is opt-in and intentionally smaller.

### Live Basic

- use real low-cost providers
- verify one article completes end-to-end
- confirm result shape broadly matches mocked assumptions

### Live Standard

- enable real grounded Gemini path
- verify one article completes end-to-end
- confirm evidence and result rendering remain stable

### Live Premium

- run a single-article premium smoke only
- validate deep-audit initiation, polling, and final rendering
- do not include this in routine CI

## Failure Handling

The suite should make it obvious where a failure lives.

Expected classification:

- browser/dashboard failure
- app orchestration failure
- persistence/state failure
- provider-contract mismatch in live mode

Artifacts to collect for browser failures:

- Playwright trace
- screenshot
- browser console output
- relevant server logs for the scenario

This is important because the user explicitly wants small-step testing, fast diagnosis, fixes, and retesting.

## CI Strategy

Phase 1 mocked E2E should be CI-ready once stable.

CI target:

- mocked browser suite
- mocked CLI smokes
- mocked MCP smokes

Phase 2 live verification should not run automatically on every push.

Allowed triggers:

- manual local run
- explicit CI workflow dispatch
- protected pre-release workflow if desired later

## Test Data and Fixtures

Create a small scenario catalog instead of many loosely defined mocks.

Required scenarios:

- `basic-happy`
- `standard-happy`
- `premium-pending`
- `premium-completed`
- `premium-failed`
- optional `settings-default-off`

Each scenario should define:

- article input
- tier and flag state
- provider responses
- expected report assertions
- any pre-seeded DB rows required

This keeps the suite readable and prevents each test from rebuilding provider mocks from scratch.

## Rollout Guardrails

The design must preserve and explicitly test the rollout posture:

- do not flip the default to `standard`
- verify default-off behavior
- ensure live-provider tests require explicit opt-in
- ensure premium live tests are sparse and intentional

## Implementation Plan Shape

When this design is turned into an implementation plan, split it into small tasks:

1. Introduce E2E test-mode plumbing and temp-path isolation
2. Add shared scenario fixture registry for mocked providers
3. Scaffold Playwright and app boot helpers
4. Implement dashboard happy-path coverage for `basic`
5. Add dashboard `standard` coverage
6. Add dashboard `premium` pending and completed coverage
7. Add dashboard `premium` failed coverage
8. Add dashboard settings/report regression smokes
9. Add CLI mocked smokes
10. Add MCP mocked smokes
11. Add artifacts/docs/run commands
12. Add opt-in live verification lane

Each task should be independently testable and cheap to rerun.

## Risks

1. Test harness overreach

If the first implementation tries to solve every product flow, it will become slow and brittle. The plan should stay tightly centered on multi-tier fact-check behavior plus a few nearby regressions.

2. Mock drift

If mocks are too synthetic, they can diverge from real provider behavior. That is why the live lane exists.

3. Premium timing complexity

The async audit lifecycle is inherently more complex than `basic` and `standard`. The design should model pending, completed, and failed states explicitly instead of relying on timing accidents.

4. State leakage

If temp DB/config isolation is weak, tests will be flaky and misleading.

## Acceptance Criteria

This design is successful when:

- we can run a browser suite that verifies `basic`, `standard`, and `premium` UX end-to-end using mocked providers
- the suite verifies the default-off rollout guardrail
- CLI and MCP entrypoints have mocked smoke coverage
- live verification exists as a separate, opt-in lane
- premium live verification is intentionally sparse
- failures produce enough artifacts to diagnose and fix quickly

## Open Decisions Resolved

- Browser E2E should be included: yes
- CLI and MCP should be included: yes, as separate smoke lanes in the same design
- Premium should be covered in phase 1: yes, with mocks
- Live providers should be used from the start: no, only after mocked E2E exists
- Cost control is a requirement: yes
