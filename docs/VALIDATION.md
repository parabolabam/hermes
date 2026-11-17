# Validation record

2026-11-17. Repository: /Users/vladislav.sorokin/github/hermes. Local Compose project: hermes-assistants. Scope is personal Gmail for now; work Gmail and VPS deployment are deferred by the user.

## Working connections

- Both gateways run the pinned official Hermes v0.23.2 runtime in separate native volumes/networks. No public broker port or host Docker socket. OAuth, memories and coding state remain separated.
- Separate native OpenAI-Codex subscription grants; both roles freshly answered real model requests. No inference API-key fallback or paid provider enabled.
- Life Telegram: @parabolabam_ultron_bot. Coding Telegram: @parabolabam_jarvis_bot. Both private chats verified; user confirmed both assistants replied to hello.
- Coding GitHub CLI currently reports parabolabam / User. The earlier native helper and local-only Git attribution tests passed; no remote branch/PR was created by setup.
- Google Cloud project Hermes Assistants created through Brave with the user's explicit browser exception. Gmail and Sheets APIs enabled, External/Testing OAuth app configured, policy accepted after user confirmation, Desktop client downloaded and moved into private connector storage with mode0600. Personal Google grant is verified; credentials were not printed.
- Broker Gmail listing succeeds and respects the setup cutoff. All three allowlisted Sheets are accessible. The actual model read bounded tracker samples: subscription status/renewal and tax status/date fields understood; missing debt due dates remain unknown. No Sheet writes were performed during these live setup checks.
- One real unsent Gmail setup draft was created. Operator readback verified its recorded ID, intended own-account recipient, DRAFT label, and absence of SENT. Evidence: ignored .runtime/validation/google-draft-smoke.json. It remains available for review.

## Native proactive operation

- life-check: 6cf69588c25b; enabled; every 30 minutes; Europe/Belgrade.
- life-digest: f96027032e34; enabled; 09:00; Europe/Belgrade.
- Both use native continuity, the persistent job notepad, the restricted Google skill, Telegram delivery, and low reasoning on the authorized subscription. Prompts are in config/life/life-check.md and life-digest.md. Exact [SILENT] suppresses no-action notifications.
- Native Telegram model smoke: job8f773631261a, attempt23c98327e48c4a75af4a40d3798d132a completed with delivery_outcome delivered. Test job is paused.
- First real life check: attempta5506fac7c4b4a63af74ca101757de9b completed; baseline_subscriptions, baseline_taxes_2026 and baseline_debts persisted in the native notepad; final response exactly [SILENT], delivery_outcome suppressed; no real Sheet writes.
- Life gateway restarted successfully; all four notepad entries persisted. An unchanged follow-up check is running; its final outcome must be checked before claiming duplicate-alert validation.

## Other evidence and limits

- Real-model synthetic case02 verified mail read, custom-label readback, unpaid→paid readback, one confirmed journal/fixture notice, one correctly threaded draft and zero sends. Evidence remains in ignored .runtime/validation/model-fixture-02.
- Gmail send/archive/delete/mark-read and arbitrary upstream proxy routes are absent. Drafts require review and human sending in Gmail. Sheet writes compare expected values and preserve formulas, but cannot promise atomicity against other editors. Notifications are at least once; ambiguous remote delivery can duplicate.
- Agent judgments about importance and financial evidence remain model judgments. The setup did not fabricate a real payment or alter a tracker to test mutations. Formula protection and mutation plumbing were exercised in offline/synthetic fixtures.
- Google app is currently External/Testing; its refresh grant expires after seven days under Google's policy. Reauthorization or production OAuth configuration will be needed for longer uninterrupted use: https://developers.google.com/identity/protocols/oauth2#expiration
- The local Mac must be awake with Docker running. VPS migration, tested disaster recovery, future Anthropic subscription and any credit purchases remain outside this local delivery.
- Interrupted broad-review artifacts remain historical. The user explicitly rejected further architecture expansion. Do not resume that wave by default or claim its outstanding findings were all fixed.
