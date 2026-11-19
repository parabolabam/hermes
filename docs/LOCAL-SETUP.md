# Local setup with Docker Compose

> [!WARNING]
> Use these instructions for a fresh local installation. If Railway is using the same bot tokens or provider grants, do not start the local gateways or run local `chat` or `login` commands. Duplicate gateways compete for Telegram updates and can interfere with credential refresh. See the [Railway guide](../deploy/railway/README.md) for migration and recovery.

## Initialize the two roles

Install Docker Engine with the Compose plugin or standalone `docker-compose`, Node.js 24 or newer, and OpenSSL. From the repository root:

```sh
./hermesctl init
```

This creates ignored `.runtime/` state, a private connector key and editable initial configs. Rerunning `init` preserves existing files. `.runtime/life` and `.runtime/coding` contain operator-managed staging files; `.runtime/google` is for the connector. The agents store OAuth grants, sessions and cron state in separate named volumes. Keep both `.runtime/` and volume backups private.

Choose the exact model available to each role's authorized account. With the corresponding service stopped, configure the model and follow the interactive device-code login:

```sh
./hermesctl model life YOUR_MODEL_ID
./hermesctl model coding YOUR_MODEL_ID
./hermesctl login life
./hermesctl login coding
```

Replace `YOUR_MODEL_ID` before running the commands. First run may need `docker compose build coding` (or `docker-compose build coding`).

## Connect Telegram

1. Use the verified **@BotFather** to create two separate bots. Keep their tokens private and start a private chat with each bot.
2. With the respective gateway stopped, run `./hermesctl telegram-ids life` or `./hermesctl telegram-ids coding`. Enter the token at the hidden prompt. The helper prints candidate numeric user and private chat IDs, not tokens or message contents. If nothing appears, send `/start` to the bot and retry. Verify the IDs yourself.
3. Run `./hermesctl telegram life` and `./hermesctl telegram coding`. At the prompts enter the corresponding token, allowed user IDs, and private home chat ID. Do not use a group as the home channel or allow unknown users. Restart the respective service after changes.

## Start and verify

```sh
./hermesctl validate
./hermesctl up
./hermesctl status
```

`validate` checks local inputs without checking provider login or bot delivery. `up` requires both roles to be configured and the services stopped before it syncs managed files. Verify the replies and allowlist behavior in both private chats before relying on the bots. Google authorization is separate from model login.

- `./hermesctl shell life` or `./hermesctl shell coding` opens a shell for a running role.
- `./hermesctl down` stops the services. Use it before `up` when applying managed changes.
- `./hermesctl sync life` or `./hermesctl sync coding` syncs managed files for a stopped role without overwriting OAuth or session state.

The activation validator accepts the canonical configuration, a selected model, Hermes's version marker and optional medium reasoning. Other config changes require reviewing the validator as well.

## Set up local coding access

For a fresh local installation with coding stopped, `./hermesctl github-login` starts the interactive user login and requests `read:project`. It does not mount host credentials. Configure the operator's Git author with `./hermesctl git-identity 'Your Name' 'you@example.com'`. This is the local user-login flow, not a fallback for a deployment configured to use a GitHub App.

Work only in explicitly authorized repositories. Verify access and author identity before making changes, and use a draft PR for review rather than merging or deploying. The configured Git identity and persona are not enforcement boundaries. The coding role does not install recurring jobs.

## Connect Google for the life role

The examples use the Compose plugin. For standalone Compose, replace `docker compose` with `docker-compose`.

1. In a Google Cloud project, enable Gmail API and Google Sheets API. While the OAuth consent screen is in Testing, add each account as a test user. Work accounts may also require administrator approval. Testing refresh grants can expire after seven days.
2. Create a **Desktop app** OAuth client. Place its downloaded JSON in `.runtime/google/client.json`, readable only by the operator (`install -m 600 /path/to/downloaded-client.json .runtime/google/client.json`). The connector, not either agent, stores the Google credentials. The connector restricts its own routes even though the Gmail OAuth grant is broader.
3. Build and start the connector, then authorize each account with a distinct path-safe alias:

   ```sh
   docker compose --env-file /dev/null -f compose.yaml up -d --build --no-deps google-connectors
   docker compose --env-file /dev/null -f compose.yaml run --rm --service-ports google-auth authorize personal
   ```

   Open the printed URL on the local machine. The callback binds to `127.0.0.1:8765`. Initial authorization records the account's monitoring cutoff. To reauthorize, use `authorize NAME --replace`: the same account retains its cutoff; replacing it with a different account sets a new one.
4. Allowlist each spreadsheet with an account that can access it:

   ```sh
   docker compose --env-file /dev/null -f compose.yaml run --rm google-auth sheet-add ALIAS SPREADSHEET_ID ACCOUNT
   ```

   Spreadsheet IDs remain in private configuration. If intentionally extending an account's history window, `google-auth history ACCOUNT DAYS` accepts 1–30 days; only the operator can do this.
5. After configuring the life bot, recreate the connector to load its Telegram settings:

   ```sh
   docker compose --env-file /dev/null -f compose.yaml up -d --force-recreate --no-deps google-connectors
   ```

   The health check detects missing local configuration, not successful Google access or Telegram delivery. Verify both using authorized accounts and the intended private chat.

### Connector limits

The connector can read post-cutoff mail, add `Hermes/` labels, and create drafts for review. It cannot send, archive, delete, mark mail as read, or forward arbitrary Google requests. Sheet access is limited to allowlisted spreadsheets and bounded ranges; the life skill respects tabs marked `NO AUTOMATIONS`.

Sheet writes check expected values and protect formulas, but the comparison is not atomic against concurrent editors. The connector records write outcomes and retries notifications independently; interruptions can produce duplicate notices. Review unresolved writes rather than assuming they succeeded or replaying them.

## Optional life schedules

After model login, Telegram and Google access are verified, `./hermesctl cron-install` creates `life-check` (every 30 minutes) and `life-digest` (09:00 Europe/Belgrade), initially paused. Review them in Hermes before resuming. Existing schedules are left unchanged. If the installer is forcibly killed, confirm no installer is still running before removing the reported stale lock directory.

See [validation](VALIDATION.md) for the rollout record and the [contributor guide](../CONTRIBUTING.md) for offline checks.
