# Task 2: restricted Google connector

Implemented the private life-only Node 24 connector, operator-only Desktop OAuth setup, constrained Gmail and Sheets routes, durable audit/outbox, and a safe life skill client. The image is pinned to the agreed Node digest. The running connector is unconfigured: no Google accounts, sheets or Telegram destination have been authorized. It reports `ready: false`. No live Google or Telegram request was made.

## Verification

- `cd google && npm run check && npm test`: strict TypeScript check and 14 offline tests passed. They cover old-message metadata denial, no arbitrary Gmail query or send route, opaque page tokens, custom-label add-only behavior, MIME drafts and header validation, allowlist denial, range bounds, formula and stale-value rejection, durable intent and notice retry across restart, interrupted-write reconciliation without replay, and OAuth callback state validation and credential redaction.
- A network-disabled Node 24 container ran `test/fixture-smoke.mjs` against the explicitly launched fake server: fixture Gmail list/read, bounded sheet read/write, confirmed journal record, and recorded fake notification all passed. No production fake transport switch exists.
- Docker Compose configuration validated and the pinned image built. From the life container, `/health` reported zero accounts, zero sheets, Telegram unconfigured and `ready: false`; the safe client returned empty account/sheet lists. Unauthenticated `/accounts` returned 401 and authenticated `/gmail/send` returned 404. Coding could not resolve the connector hostname.
- The managed safe client and skill were installed into life staging and its native volume. The bearer is read internally and was not printed. Only the unconfigured connector was recreated; the life/coding services and their authentication volumes were not reset.

## Setup and outstanding validation

README contains fresh Google Cloud API, consent, Desktop client, per-account authorization, sheet allowlist and Telegram setup instructions. OAuth callback listening is active only during the separate operator command and bound on the host to `127.0.0.1:8765`. Google account authorization, actual API access, Gmail UI draft review, real sheet changes and Telegram delivery remain untested and require user-owned accounts and setup. A separate Hermes-to-fixture model exercise and independent security review remain for the coordinator.

The compare/read/write sequence is not an atomic compare-and-set against other Google editors. A timeout can leave an uncertain write; the connector reconciles against the current sheet instead of replaying it. Notices are at-least-once: failure after Telegram accepts a message but before the outbox records delivery can result in a duplicate. Oversized notices are truncated and retain the event ID; full details remain in the private journal. Google Testing refresh grants can expire and organization policy may restrict access. Configured status does not establish working credentials or delivery.

## Test-only harness

The image includes `/app/test/fixture-server.mjs` as an explicitly invoked entrypoint. It uses fixed synthetic accounts and fake Gmail/Sheets/Telegram, with no network transport. Supply a writable `/fixture` containing `sheet.json` initialized to `[["unpaid"]]`, and mount a bearer file at `/run/secrets/life-api-key`. The fixture account is `fixture`, its sheet is `fixture_sheet_001`, its message is `new1`, and a sample target is `Tracker!A1:A1`. Confirmed writes append synthetic notices to `/fixture/notices.jsonl`. Isolate the fixture on a separate test network; do not override the production connector hostname on a shared network.

## Independent review fixes, round 1

The six review findings have been addressed: operator errors and private-state parse failures now emit fixed safe text; ambiguous writes remain uncertain and produce durable retryable review notices, with inaccessible events isolated during reconciliation; each request pins account identity, cutoff, grant generation and refresh token while access tokens are cached with an expiry margin; Gmail listing and labeling use only internalDate metadata; explicit null and malformed new values are rejected before intent or remote access; and MIME subjects are folded into bounded RFC 2047 words on UTF-8 character boundaries with conservative mailbox validation. Access refresh never writes a refresh token to configuration. Google/Telegram calls and the safe client now have finite request deadlines; the OAuth consent window remains separately bounded.

A new `POST /sheets/metadata` accepts only an allowlisted spreadsheet ID and requests only spreadsheet title and tab properties from Google. The fixture includes Tracker metadata. The skill directs life to inspect metadata and bounded headers, respect tabs marked NO AUTOMATIONS, and treat mail and cells as untrusted data rather than instructions.

Regression-first evidence: before implementation, `cd google && npm test` reported 14 passing and seven failing test entries, including 50 unwanted full-body reads, overlong MIME words, null write, missing uncertainty notice, and reconciliation starvation; the security session test was initially missing its implementation. The subsequent metadata test failed with `unknown route` before the route was added.

Final checks:

- `cd google && npm run check && npm test`: strict TypeScript check passed; 25 tests passed, 0 failed. Synthetic tests cover account replacement during refresh, token reuse across 50 requests, malformed private/client/upstream marker redaction, uncertainty notices after overwrite or restoration and retry across restart, metadata allowlisting and Cyrillic subject folding.
- Pinned Node 24 image, `docker run --rm --network none ... node --test test/*.test.mjs`: 25 passed, 0 failed. Separately, actual operator CLI stdout/stderr was checked in network-disabled containers against malformed synthetic client and configuration files; no marker appeared.
- Network-disabled rebuilt fixture exercised Gmail list/read, sheet metadata/read/write and durable fake notice. The connector image was rebuilt and only the unconfigured connector recreated; health remains zero accounts, zero sheets, Telegram false and ready false, and unknown sheet metadata returns 400. The life skill and client were updated without restarting life or coding.

No real Google or Telegram call, model call, account authorization, or private credential inspection was performed. Independent re-review and the coordinator's Hermes-to-fixture exercise are still pending. Google Sheets compare/write remains non-atomic; uncertainty notices and potential duplicate delivery remain necessary operational considerations.

## Independent review fixes, round 2

The production HTTP handler now tracks response closure and request abortion, and checks caller availability when queued work starts. Gmail draft and label changes, and sheet writes, also check before mutations; the production transport checks again after any token refresh and immediately before the upstream mutation. A disconnected request that has already started a mutation cannot be assumed cancelled: the client and skill report an unknown outcome and direct the user to inspect the result instead of automatically retrying a draft. A sheet write that began remains subject to the durable journal and reconciliation process.

Regression-first: `cd google && npm test` initially failed the new handler test because the cancellation-aware handler did not exist (25 prior tests passed). After implementation, `npm run check && npm test` passed with 29 tests, 0 failures. The pinned Node 24 container with `--network none` also passed all 29 tests, including a real loopback HTTP case: a first request held the queue, the queued draft disconnected, an alive request completed, and zero fake Google draft calls occurred. Other tests disconnect during draft preparation and after started draft/write operations. A separate network-disabled actual-client smoke injected synthetic aborts for draft and sheet write: both reported unknown outcomes and instructed against automatic retry, without exposing the synthetic bearer. The rebuilt image also passed the offline fixture smoke.

Only the unconfigured connector was recreated, and its managed life skill/client were updated; life and coding were not restarted. The updated client returned empty account and sheet lists. No model, Google or Telegram calls or private credential inspection were performed. Independent re-review and the Hermes model fixture remain pending.
