# Contributing to Hermes Assistants

This repository contains a personal deployment. For changes to Hermes Agent itself, use the [upstream repository](https://github.com/NousResearch/hermes-agent).

## Propose a change

1. Describe the problem and scope in a GitHub issue. Use synthetic examples for anything involving personal data.
2. Branch from `main` and keep each PR focused on one change. Use your verified Git author identity.
3. Run the checks relevant to the change. Open a draft PR against `main`, link the issue, and note what you tested and what you could not verify. Leave merging and deployment to the maintainer.

Never include credentials, private runtime archives, real mail or tracker data in an issue, PR, fixture or log. Do not test with the hosted deployment's credentials.

## Run checks locally

From the repository root, with Node.js 24 or newer:

```sh
(cd google && npm ci && npm run check && npm test)
```

The connector tests use synthetic data. The separately invoked [fixture server](google/test/fixture-server.mjs) supplies fixed responses without calling Google; production does not select it through an environment setting.

With Docker Compose installed and a non-root account, run the offline runtime checks from the repository root:

```sh
bash tests/runtime/check.sh
```

These checks validate local configuration and mock managed-file sync. They do not verify OAuth, bot delivery, or a cloud deployment. For a documentation-only change, verify relative links and examples against the files they point to; do not connect accounts or start gateways just to check a README.

See [local setup](docs/LOCAL-SETUP.md) for the operator workflow and [validation](docs/VALIDATION.md) for the rollout record.
