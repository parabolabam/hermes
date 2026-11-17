# Hermes Assistants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** A locally runnable, portable two-assistant deployment with enforceable connector boundaries and subscription-only inference.

**Architecture:** Official pinned Hermes containers, separate mutable homes and networks, plus a Google service reachable only by life support. Setup is explicit and idempotent; real account activation follows credential-free smoke tests.

**Tech Stack:** Docker Compose, Bash, Node.js 24 / TypeScript for the connector, native Hermes configuration and cron.

**Spec:** docs/superpowers/specs/2026-11-17-hermes-assistants-design.md

## Global Constraints

- No secrets in Git, console output, or test fixtures; no host credential imports or repo .env mounts.
- Two isolated assistants; only life reaches the restricted Google API; only coding receives GitHub access.
- Main, auxiliary, cron and delegated inference remain openai-codex subscription-only, no paid fallback.
- New-mail-only cutoff, custom labels without read/archive/delete, drafts without sending, allowlisted evidence-backed Sheets changes with durable notifications.
- Do not modify upstream Hermes core. Preserve official ENTRYPOINT and supervisor.
- Work in this dedicated repo on work/hermes. Do not touch the experiment checkout. No remote publishing or VPS provisioning.
- No commits until primary review; external writes require actual account setup and concrete target. Keep progress in ignored local ledger.

## Review Focus

- Missing or malformed credentials fail clearly without leaking values or silently choosing another provider.
- Repeated setup, scheduling and restart preserve state without duplicate jobs or cross-agent access.
- Historical email, send/archival/unread mutations and non-allowlisted Sheets remain blocked even if requested by the model.
- Sheets conflicts/formulas, failed writes and failed notifications preserve records and produce an honest auditable status.
- Container readiness is distinct from model, Telegram and Google/GitHub authorization readiness.

### Task 1: Containers, lifecycle and agent behavior

**Files:** compose.yaml, hermesctl, config/, skills/, scripts/, tests/runtime/, README.md, .gitignore, .dockerignore.

**Interfaces:** Produces two services named life and coding, separate Docker-native life-state and coding-state volumes for private runtime state, with .runtime/life and .runtime/coding for operator staging, life-only network life-net, coding-only network coding-net, and a future google-connectors service name at http://google-connectors:8787. Private bearer secret is .runtime/secrets/life-api-key, mounted read-only into life at /run/secrets/life-api-key and the connector at the same path. Connector private files are .runtime/google. Native model and Telegram setup must not require Google to be connected. Source allowlist .runtime/google/config.json is operator-owned, never mounted into coding.

- [ ] Create an idempotent init and explicit role/model configuration, separate OAuth login commands, Telegram token setup using a private prompt/file (never command-line token), up/down/status/shell, coding GitHub auth/identity setup, cron installation paused by default, and backup/restore instructions.
- [ ] Create life/coding persona and skills implementing the spec; life invokes only the restricted connector API for Google data. Coding has no cron jobs. Enforce no bot Git identity through Git config and user CLI login, with review before merges/deployments.
- [ ] Pin images, keep private ports unpublished, support both docker compose and standalone docker-compose, and make configuration validation credential-free. No global env inheritance from unrelated repo.
- [ ] Add meaningful credential-free checks for idempotence/non-overwrite, missing model/Telegram activation failure, absence of cross-mounts/socket/public ports, and provider-route restrictions. Run syntax and Compose validation. Real image boot/restart verification is owned by coordinator.
- [ ] Document exact user authorization steps and pending capabilities. Return report to docs/task-1-report.md, no commits.

### Task 2: Restricted Google connector and fixture validation

**Files:** google/ (strict TypeScript service/admin OAuth client/tests/package lock/Dockerfile), connector client skill scripts, compose integration, README.md additions.

**Interfaces:** Consumes Task 1 life-net, bearer secret and private .runtime/google. Produces /health plus authenticated account/new-mail/custom-label/draft/Sheets-read/Sheets-write routes. Operator CLI owns Google OAuth login, account cutoff and Sheets allowlist, not the model. Gmail/Sheets access via official REST APIs with credentials only inside google-connectors. No Google send/archive/delete/read-status/general proxy endpoint.

- [ ] Build a small typed service using Node built-ins where practical. Support multiple configured Gmail accounts, OAuth refresh and explicit setup-time baseline; never return older message bodies through ordinary reads. Operator may explicitly permit a historical window later.
- [ ] Implement Gmail message reads/new listing, add-only Hermes-prefixed custom labels, and draft creation with valid MIME/recipient/header validation. Never send messages.
- [ ] Implement bounded allowlisted Sheets reads and RAW writes with expected-values checks and formula protection. Require reason and evidence. Persist a before/after audit event and notification outbox; retries/restart must not silently lose change notices. Telegram delivery uses only the configured life bot/chat. Offline tests use a fake Google/Telegram transport.
- [ ] Implement operator Google Desktop OAuth login with PKCE/state/loopback callback, private stored account credentials, no token logging, and clear API/client/consent setup instructions. Keep server endpoints separate from admin actions.
- [ ] First run tests that show the policy/use-case gaps, then implement. Validate new-vs-old mail, scope/endpoint denials, label restrictions, draft-only behavior, Sheets allowlist/conflicts/formulas, before/after notices, delivery retry and restart persistence. Run TypeScript checks and tests without live accounts.
- [ ] Wire the connector into Compose; run container fixture and policy smoke checks. Return report to docs/task-2-report.md, no commits.

### Final verification

Coordinator independently reviews files, runs container isolation/persistence/readiness checks and all tests, then requests an independent whole-project review. Fix important findings, update docs/VALIDATION.md with fresh evidence, and proceed to actual user account authorizations only when the concrete local setup is ready. Retain precise blockers if sign-in or OAuth client/bot creation requires the user.

