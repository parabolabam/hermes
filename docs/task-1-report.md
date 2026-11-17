# Task 1 report

## Implemented

- Two independently persisted Hermes services, separate networks, no published ports or Docker socket, the official pinned multiarch image and its s6 entrypoint, host UID/GID mapping, and DELETE journal configuration. The coding-only derivative adds gh 2.104.0 from architecture-specific archives checked against pinned official SHA-256 values; inherited ENTRYPOINT is unchanged.
- Non-overwriting private initialization; explicit account-selected model; separate Codex device logins; hidden Telegram token entry; identity and GitHub login; activation validation; up/down/status/shell; stable-name native cron creation paused by default. One-off setup commands use a numeric host UID and an explicit entrypoint so they do not start a second supervised gateway; Compose services themselves retain the official entrypoint and have no user override.
- Separate personas and skills, restricted Google connector interface, instructions for fresh Telegram bots and Desktop OAuth client, isolation, authorization, backup and restore. Connector bearer key is private and shared only with life and the future connector; Google config is not mounted into coding. The connector itself is a separate task.

## Verified here

`tests/runtime/check.sh` passed: initialization preserves modified persona and bearer key, secret mode 0600, missing model/Telegram activation fails, configured fallback lists and DELETE journaling exist, cron name lookup handles absent/existing/invalid stores, shell/Python syntax checks and standalone docker-compose configuration parsing pass. Source inspection of the pinned image confirmed s6 UID/GID support and `database.journal_mode: delete`. No live OAuth, Telegram, Google, GitHub, model inference, or scheduled jobs were invoked.

## Pending and limitations

- Image startup/restart, credential prompts, two bot chats, GitHub login, live model entitlement, cron installation and delivery remain to be verified by the coordinator/user. The coding image build needs network access and its pinned gh archives; this was not built here.
- The connector, restricted API enforcement, durable notification outbox and operator onboarding are separate implementation and integration work. Until that service and authorized accounts exist, Google features cannot function.
- User identity configuration and persona instructions are not a tamper-proof ban on bot authors or trailers: an agent with shell access can change Git config. Require review of authors/trailers before accepting changes. Likewise merge/deployment review is a behavioral policy, not an infrastructure permission boundary.
- Scheduled jobs are left unchanged on repeat installation, including if a user has changed their pause state. Review existing jobs and provider/model settings before resuming. Avoid concurrent `cron-install` invocations.
- This is preparation and offline validation; it is not a live deployment or proof of message delivery.

## Review fixes

The real runtime config is now validated against a fail-closed canonical policy with top-level `fallback_providers`, no custom endpoints or inference credentials, and explicit OpenAI Codex routes. The canonical policy permits Hermes's current config-version marker and the user's selected medium reasoning. Other configuration edits require a validator change. The two known-original runtime configs were migrated after exact comparison; the selected life model and reasoning were retained and no auth files were modified.

The coding setup commands and shell use `/opt/data/home`, matching the pinned image's terminal subprocess home selection; the coordinator is responsible for the live terminal-tool check. Cron installation uses a private process lock around the full read/create sequence; the offline test runs two concurrent installers and a repeat against a fake recording CLI with the native JSON layout. A stale lock after an uncatchable kill fails closed and requires the operator to confirm no installer is running before removal.

`./tests/runtime/check.sh` passed after fixes: actual edits to main, delegation, cron and fallback routes are rejected; endpoint and inference API-key injection are rejected; activation without model/Telegram fails; initialization and permissions, JSON store failures, parallel cron setup, Node/shell syntax, and rendered Compose mounts/networks are checked. Python helpers and direct Python calls were removed. A private-prompt Telegram ID lookup was added; it has not made a Telegram call.

Coordinator live findings supersede the earlier blanket statement about OAuth: distinct life and coding Codex OAuth logins have succeeded, and services and the coding gh binary were smoke-checked. The first model smoke is blocked by gateway socket permissions on the shared mount and is being investigated by the coordinator. No successful model/tool or Telegram delivery is claimed here.

## Native-volume correction and live smoke

The bind-mounted Hermes homes were replaced with separate Docker-native `life-state` and `coding-state` volumes. Colima's bind mount rejected the upstream socket chmod: the gateway socket remained 0755 and Hermes correctly rejected it. The service check was not weakened. With both gateways stopped, the existing authenticated homes were copied into fresh empty volumes, excluding transient sockets, PID and lock files. Both copied auth files matched their source checksums; source state was retained. Managed files are synchronized into a stopped volume without replacing auth or sessions; cron checks the live volume. Backup now covers both volumes and ignored staging.

After restart, both gateway sockets were observed at mode 0600. `docker-compose build coding` succeeded using the cached pinned build. The coordinator then completed a live life model and terminal-tool smoke on the existing OpenAI Codex subscription: it returned `HERMES_SMOKE_OK`, reported terminal HOME `/opt/data/home`, and wrote a persistent marker. Independent restart/readback and coding isolation checks are coordinator-owned. This does not establish Telegram or Google functionality.

`./tests/runtime/check.sh` passed with mocked native-volume managed-file synchronization preserving an existing auth fixture, actual runtime config policy mutations, repeated/concurrent cron installation against a fake native store, and rendered Compose isolation checks. Real native-volume migration, socket mode, and the coding image build were separately verified as described above.

## Cron-lock re-review fix

Lock acquisition now fails promptly if its directory cannot be created, fails after a short bounded wait for a missing, invalid or unreadable PID, and times out after 30 seconds when another apparently live installer retains the lock. It never removes another installer's lock. An interrupted lock is removed only after the operator confirms no installer is running.

Command: `./tests/runtime/check.sh`  
Output: `Offline runtime checks passed.`

The checks exercise an abandoned lock with no PID, simulated `mkdir` failure, and the existing concurrent/repeated installation fixture. No services were restarted and no live cron jobs were created.
