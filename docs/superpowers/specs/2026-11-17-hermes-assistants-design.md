# Hermes assistants: agreed scope

Approved for implementation in the conversation on 2026-11-17. Dedicated local repository; no VPS deployment or purchases yet.

## Intent

Two persistent assistants with a Dot-like workflow, with no connection to OpenAI Dot. Life support is proactive. Development is on demand. Telegram is the first interface, using one private bot per assistant.

## Life assistant

- Monitor newly arriving messages in the Gmail accounts the user authorizes (personal and work). Establish a setup-time cutoff per account; no historical message bodies unless explicitly authorized later.
- Track subscriptions, taxes and debts using the three Google Sheets selected by the user. Keep their IDs and account details in ignored runtime configuration.
- Notify about relevant new requests/deadlines, renewals seven days and one day in advance, price changes and billing problems. Deduplicate unchanged alerts. Start with a 30-minute background check and a 09:00 Europe/Belgrade daily digest, no quiet hours.
- Apply custom Hermes labels automatically, without marking mail read, archiving or deleting it.
- Update selected Sheets from clear evidence and notify the user about every change. Preserve formulas; reject stale expected values. Uncertain evidence remains uncertain. Do not infer cancellation merely from absent receipts or repayment from a guess.
- Write drafts in the recipient's language. Learn from future correspondence and reviewed drafts; do not scan old sent mail automatically. Outgoing messages require user review and approval.
- First implementation creates Gmail drafts for the user to review and send in Gmail. No agent-accessible send endpoint. This enforces review without trusting model instructions to block sends.

## Coding assistant

- Work only on demand, initially through GitHub and gh CLI using the user's own authenticated account and verified Git identity. No bot authors or bot co-author trailers.
- May coordinate worker agents and isolated Git worktrees, implement, test, push branches, and open draft PRs in selected repositories.
- User review before merge or deployment. Do not expose personal mail/financial data to this assistant. Do not expose coding repositories to life support.

## Isolation and authentication

- Separate Docker containers, files, homes, memories, credentials and networks for life and coding; no host Docker socket or host credential mounts.
- Initial inference uses the user's existing ChatGPT/Codex subscription through Hermes's native openai-codex OAuth provider. Fresh logins in each runtime; never import the host Codex login. auth.adopt_external_logins is false. No API keys, custom inference endpoints, paid fallback providers or automatic credit purchases.
- Models are explicitly selected from the authorized account before activation; do not guess entitlement.
- Anthropic is a future option, with a planned $100/month model budget. If insufficient, propose a simple manual top-up for approval; do not buy or enable overage automatically.
- Dedicated Google connector service owns Gmail/Sheets credentials. Agent can only invoke bounded read, custom-label, draft and allowlisted Sheets operations. Gmail OAuth alone cannot enforce these action boundaries. The connector is inaccessible to coding and exposes no public API port.
- Operator-only Google OAuth setup supports multiple account labels. Credentials never appear in logs or Git. Use a Desktop Google OAuth client supplied by the user; Gmail and Sheets APIs must be enabled. Explain consent/admin and refresh-token prerequisites.
- Native Hermes cron jobs start paused until subscription and Telegram/Google setup are complete. Do not start duplicate jobs during repeated setup. cron.mirror_delivery is enabled.

## Deployment and verification

Pin multiarch images by digest. Preserve the official Hermes ENTRYPOINT/s6 bootstrap; do not set Compose user. Keep mutable state outside installed core. Hermes homes use separate Docker-native volumes for private socket permissions and persistence; the ignored .runtime/ directory holds operator staging, connector files and secrets. SQLite uses delete journaling for portability. Backups must include both native volumes and .runtime/.

Provide a portable local/VPS lifecycle command, explicit setup steps, offline fixtures for policy/use cases, local container smoke checks, backup/restore, and a validation record distinguishing tested from pending authorizations. Never call source preparation a successful live deployment.

Initial Hermes image: nousresearch/hermes-agent@sha256:d6746a084e9341baada483e3d6210444d3c1aeb7c130f0915150065fb2851459 (stable index resolved 2026-11-17; verify installed version).
Connector Node image: node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5.

## Approaches

Use official Hermes runtime plus a small restricted Google service. Native Google CLI credentials in the life container cannot enforce the requested send/archive/read-status boundaries. Hermes profiles alone cannot enforce separation between personal and coding data. Avoid rebuilding an agent framework or modifying upstream Hermes core.

