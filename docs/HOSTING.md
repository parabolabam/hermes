# Hosting decision — Railway selected

User selected Railway and subscribed to Hobby. Source is public at https://github.com/parabolabam/hermes on branch `work/hermes`; private runtime state and credentials are excluded. `hermes-life` now runs life and the private Google connector; `hermes-coding` runs coding. State migration completed with verified checksums. All three services have one running replica and private persistent volumes; neither project exposes a public service URL. Local containers are stopped.

Deployment configuration and the cutover procedure are in [the Railway guide](../deploy/railway/README.md). The official CLI and the credential/state transfer were explicitly authorized. Both Telegram replies, Gmail/Sheets access, coding GitHub identity and a scheduled life-check delivery were verified from Railway.

| Option | Fit | Integration / cost tradeoff |
| --- | --- | --- |
| Hetzner VPS | Existing Compose stack, private networks and native volumes can be retained. | GitHub Actions over SSH needs setup; fixed VM pricing. Earlier approximately EUR10/month was a target, not a verified checkout quote. Need verify available plan and final tax/IPv4 price. |
| Railway | Managed persistent services; viable with platform-specific mounts, secrets and startup configuration. | Built-in GitHub deployments. Hobby minimum $5/month includes $5 usage; RAM $10/GB-month, CPU $20/vCPU-month, disk $0.15/GB-month. Actual usage, not a fixed all-in quote. |
| Render | Supports background workers/private services and persistent disks. | Managed GitHub deployment. Per-service compute charges; headline $7/month is for one 512MB service, not the whole three-service deployment. Disks extra. |
| Fly.io | Container Machines and persistent volumes; viable with Fly-specific deployment/network configuration. | Official GitHub Actions workflow; regional VM and storage charges. |
| Vercel | New Docker Container Runtime and always-on Daemons do exist. Daemons currently have ephemeral storage and do not support persistent storage. | Native GitHub integration, but current Hermes SQLite/auth/notepad volumes would require adaptation. Do not dismiss Vercel solely as short-lived Functions; the concrete blocker for an unchanged deployment is daemon persistence. |
| Cloudflare Containers | Supports Docker images and GitHub Workers Builds. Disk is ephemeral by default; snapshots/FUSE object storage require extra lifecycle/storage integration for Hermes state. | $5 Workers Paid base plus provisioned RAM/disk and active CPU. Illustrative 30-day always-on sizing: two basic1GiB/4GB instances plus one lite256MiB/2GB instance costs about $21.12 before CPU/other usage, after included RAM/disk allowances. This is an estimate, not a measured bill. |

Sources checked 2026-11-17:
- https://www.hetzner.com/cloud/
- https://docs.railway.com/pricing/plans
- https://render.com/pricing
- https://render.com/docs/service-types
- https://fly.io/pricing/
- https://docs.fly.io/launch/continuous-deployment-with-github-actions
- https://vercel.com/docs/functions/runtimes/container
- https://vercel.com/docs/daemons (FAQ: ephemeral storage; persistent storage unsupported during beta)
- https://developers.cloudflare.com/containers/faq/
- https://developers.cloudflare.com/containers/platform/pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/

Observed local snapshot: life338.5MiB, coding376.8MiB, broker36.23MiB (about752MiB combined). This is one idle/live snapshot, not peak sizing. Cloudflare bills provisioned instance memory; Railway bills actual usage. The Hobby subscription is confirmed; the eventual usage bill remains unmeasured.

Keep life and coding in separate projects to preserve private-network separation. Monitor measured usage rather than treating the Hobby subscription as a fixed total bill. Google OAuth's seven-day Testing-mode lifetime remains an operational limitation; see the validation record.
