# Railway deployment

Use the existing public repository `parabolabam/hermes`, branch `work/hermes`.

- Project `hermes-life`: service `life` with config path `/deploy/railway/life.toml`, and service `google-connectors` with `/deploy/railway/google.toml`.
- Project `hermes-coding`: service `coding` with `/deploy/railway/coding.toml`.
- Attach one private volume per service: agents at `/opt/data`, Google connector at `/data`.
- Do not generate public domains for these services. Different projects preserve life/coding private-network separation.

All services require `HERMES_ROLE` (`life`, `coding`, or `google`), `HERMES_UID=1000`, `HERMES_GID=1000`, and initially `HERMES_DEPLOYMENT_PAUSED=true`. Agents also use `HERMES_HOME=/opt/data`, `HERMES_GATEWAY_BOOTSTRAP_STATE=running`, `TELEGRAM_ALLOW_ALL_USERS=false`, and the explicitly authorized `HERMES_MODEL`. Life uses `HERMES_GOOGLE_HOST=google-connectors.railway.internal`.

Use Railway service secrets for the appropriate role's `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`, and `TELEGRAM_HOME_CHANNEL`. Life and Google share only `LIFE_API_KEY`; never give it or personal Google grants to coding. The entrypoint creates the mode0600 key file at runtime. Google client/grant JSON stays only on the Google volume; native provider and GitHub grants stay only on their respective agent volume. No real secrets belong in Git or image layers.

For cutover, first prepare all remote services in their paused state and verify empty target volumes. Stop the three local services before exporting private state, to avoid simultaneous OAuth refresh writers and duplicate Telegram pollers. Export each existing native agent volume and the private Google directory into fresh, private archives; transfer them only to the corresponding remote volume using authenticated Railway volume/SSH tooling. Verify archive checksums and expected destinations before extraction. Restore into the empty volumes and set ownership to1000:1000. Keep a private local backup and never overwrite an existing target installation.

After state transfer, set `HERMES_DEPLOYMENT_PAUSED=false` and redeploy Google, then the agents. Verify both Telegram replies, personal Gmail/Sheet access, native schedule status and persistent notepads before considering cutover complete. Keep the local gateways stopped after successful cutover; for rollback stop the remote gateways before resuming local ones.

Use Railway's GitHub integration for subsequent updates. Start with manual deployment/review; do not expose credentials through build output or repository files. Railway usage is metered; the Hobby subscription does not fix the total monthly bill. Google OAuth currently uses Testing mode and requires reauthorization after seven days unless its publishing configuration changes.
