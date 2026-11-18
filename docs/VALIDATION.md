# Validation record

Updated 2026-11-18. Repository: /Users/vladislav.sorokin/github/hermes. Personal Gmail is connected; work Gmail is deferred. Railway now serves both assistants. The local Compose project, hermes-assistants, is stopped with its volumes retained.

## Verified Railway cutover

- All three services have successful active deployments, one running replica, automatic restart, private persistent volumes and no public service URL. Life and its Google connector share one project; coding occupies a separate project.
- Local services were stopped before export. Each private state archive was transferred only to its corresponding verified empty remote volume, its SHA-256 checksum checked, and ownership set to UID/GID 1000. Private local backups are retained. Schedule databases passed SQLite integrity checks and the native notepad keys persisted.
- Both agent processes passed native s6 gateway, non-root UID and mode0600 control-socket checks. Real Telegram requests received HERMES_LIFE_RAILWAY_READY and HERMES_CODING_RAILWAY_READY replies after cutover, observed in the Telegram app. These exercise the existing subscription from Railway; no API-key fallback was added.
- The remote broker reports one account, three trackers and configured private Telegram delivery. Real Gmail listing and metadata access for subscriptions, taxes and debts succeeded. A previously recorded real subscription update has confirmed status, delivered notification and matching live Sheet readback; no additional mutation was made for this check.
- A native life-check execution on Railway completed with delivery_outcome delivered at 2026-11-18T00:02:51Z. Both production schedules remain enabled. A manual validation trigger found the scheduler already firing the job and did not start a duplicate.
- Coding's GitHub identity is parabolabam / User with personal Git attribution. Coding has no life connector key, and its private DNS cannot resolve the Google connector. A read-only helper-delegation smoke test returned WORKER_READY:323; its native session is retained privately.
- Runtime file changes on GitHub branch work/hermes trigger builds; documentation changes are excluded. Railway requires the RAILWAY_DOCKERFILE_PATH variable for reliable custom Dockerfile selection. A fresh source deployment with current settings succeeded after attempts to clone the old deployment snapshot used outdated build configuration.
- Google Auth Platform visibly reports In production. Public app-information links point to this repository, with github.com registered as their authorized domain. The operator explicitly approved these settings and completed Google's unverified-app warning. A fresh personal refresh grant was issued after publishing, with no refresh_token_expires_in in Google's response and the original monitoring cutoff preserved. The seven-day Testing limit is removed; this is a personal-use app, not a verified public multi-user service.

## Working connections

- Both gateways run the pinned official Hermes v0.23.2 runtime in separate native volumes/networks. No public broker port or host Docker socket. OAuth, memories and coding state remain separated.
- Separate native OpenAI-Codex subscription grants; both roles freshly answered real model requests. No inference API-key fallback or paid provider enabled.
- Life Telegram: @parabolabam_ultron_bot. Coding Telegram: @parabolabam_jarvis_bot. Both private chats verified; user confirmed both assistants replied to hello.
- Coding GitHub CLI reports parabolabam / User. The earlier native helper and Git attribution tests passed. Setup published the credential-free source repository on branch work/hermes under the user's identity; no PR was created.
- Google Cloud project Hermes Assistants created through Brave with the user's explicit browser exception. Gmail and Sheets APIs enabled, External/Testing OAuth app configured, policy accepted after user confirmation, Desktop client downloaded and moved into private connector storage with mode0600. Personal Google grant is verified; credentials were not printed.
- Broker Gmail listing succeeds and respects the setup cutoff. All three allowlisted Sheets are accessible. The actual model read bounded tracker samples: subscription status/renewal and tax status/date fields understood; missing debt due dates remain unknown. No Sheet writes were performed during these live setup checks.
- One real unsent Gmail setup draft was created. Operator readback verified its recorded ID, intended own-account recipient, DRAFT label, and absence of SENT. Evidence: ignored .runtime/validation/google-draft-smoke.json. It remains available for review.

## Native proactive operation

- life-check: 6cf69588c25b; enabled; every 30 minutes; Europe/Belgrade.
- life-digest: f96027032e34; enabled; 09:00; Europe/Belgrade.
- Both use native continuity, the persistent job notepad, the restricted Google skill, Telegram delivery, and low reasoning on the authorized subscription. Prompts are in config/life/life-check.md and life-digest.md. Exact [SILENT] suppresses no-action notifications.
- Native Telegram model smoke: job8f773631261a, attempt23c98327e48c4a75af4a40d3798d132a completed with delivery_outcome delivered. Test job is paused.
- First real life check: attempta5506fac7c4b4a63af74ca101757de9b completed; baseline_subscriptions, baseline_taxes_2026 and baseline_debts persisted in the native notepad; final response exactly [SILENT], delivery_outcome suppressed; no real Sheet writes.
- Life gateway restarted successfully; all four notepad entries persisted. Unchanged follow-up attempt e6e00d1dc8fc49f4a5e1446b80a03207 completed with delivery_outcome suppressed, confirming this unchanged check stayed quiet after restart.

## Other evidence and limits

- Real-model synthetic case02 verified mail read, custom-label readback, unpaid→paid readback, one confirmed journal/fixture notice, one correctly threaded draft and zero sends. Evidence remains in ignored .runtime/validation/model-fixture-02.
- Gmail send/archive/delete/mark-read and arbitrary upstream proxy routes are absent. Drafts require review and human sending in Gmail. Sheet writes compare expected values and preserve formulas, but cannot promise atomicity against other editors. Notifications are at least once; ambiguous remote delivery can duplicate.
- Agent judgments about importance and financial evidence remain model judgments. The setup did not fabricate a real payment or alter a tracker to test mutations. Formula protection and mutation plumbing were exercised in offline/synthetic fixtures.
- Google app is now External/In production with a newly issued grant. Google's seven-day expiry applies to Testing-mode grants; normal revocation and provider token policies still apply: https://developers.google.com/identity/protocols/oauth2#expiration
- Railway now runs independently of the Mac. Keep the old local gateways stopped to avoid duplicate Telegram polling and provider refreshes. Disaster recovery remains untested; stale cutover grants may require fresh snapshots or reauthorization before rollback. A future Anthropic subscription and credit purchases remain outside this delivery.
- Interrupted broad-review artifacts remain historical. The user explicitly rejected further architecture expansion. Do not resume that wave by default or claim its outstanding findings were all fixed.
