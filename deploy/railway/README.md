# Railway deployment

Use the existing public repository `parabolabam/hermes`, branch `work/hermes`.

- Project `hermes-life`: service `life` uses `deploy/railway/agent.Dockerfile`; service `google-connectors` uses `deploy/railway/google.Dockerfile`.
- Project `hermes-coding`: service `coding` uses `deploy/railway/agent.Dockerfile`.
- Attach one private volume per service: agents at `/opt/data`, Google connector at `/data`.
- Do not generate public domains for these services. Different projects preserve life/coding private-network separation.

Set `RAILWAY_DOCKERFILE_PATH` to each service's Dockerfile path in Railway variables, including for later redeploys. Setting only the service API's Dockerfile path did not reliably select the Dockerfile on redeploy. The current Railway API rejects legacy `railway.toml`/`railway.json` config paths. Each service uses one replica, automatic restart, disabled sleeping, and zero deployment overlap. The GitHub source is `parabolabam/hermes`, branch `work/hermes`.

All services require `HERMES_ROLE` (`life`, `coding`, or `google`), `HERMES_UID=1000`, `HERMES_GID=1000`, and initially `HERMES_DEPLOYMENT_PAUSED=true`. Agents also use `HERMES_HOME=/opt/data`, `HERMES_GATEWAY_BOOTSTRAP_STATE=running`, `TELEGRAM_ALLOW_ALL_USERS=false`, and the explicitly authorized `HERMES_MODEL`. Life uses `HERMES_GOOGLE_HOST=google-connectors.railway.internal`.

Use Railway service secrets for the appropriate role's `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`, and `TELEGRAM_HOME_CHANNEL`. The Google connector also uses the life bot's token and routing IDs to deliver tracker-change notifications only to the authorized private chat. Life and Google share `LIFE_API_KEY`; never give it or personal Google grants to coding. The entrypoint creates the mode0600 key file at runtime. Google client/grant JSON stays only on the Google volume; native provider and GitHub grants stay only on their respective agent volume. No real secrets belong in Git or image layers.

For cutover, first prepare all remote services in their paused state and verify empty target volumes. Stop the three local services before exporting private state, to avoid simultaneous OAuth refresh writers and duplicate Telegram pollers. Export each existing native agent volume and the private Google directory into fresh, private archives; transfer them only to the corresponding remote volume using authenticated Railway volume/SSH tooling. Verify archive checksums and expected destinations before extraction. Restore into the empty volumes and set ownership to1000:1000. Keep a private local backup and never overwrite an existing target installation.

After state transfer, set `HERMES_DEPLOYMENT_PAUSED=false` and deploy Google, then the agents. Trigger a fresh source deployment with current settings; cloning an old deployment through CLI `redeploy` reused outdated build configuration in this setup. Verify both Telegram replies, personal Gmail/Sheet access, native schedule status and persistent notepads before considering cutover complete. Keep the local gateways stopped after successful cutover. For rollback, stop remote writers first, then obtain a fresh snapshot or reauthorize: the cutover backup's provider grants may become stale after remote refreshes.

The GitHub integration follows `work/hermes`. Runtime paths trigger builds; documentation paths are excluded. Review runtime changes before pushing that branch; do not expose credentials through build output or repository files. Railway usage is metered; the Hobby subscription does not fix the total monthly bill. Google OAuth currently uses Testing mode and requires reauthorization after seven days unless its publishing configuration changes.
