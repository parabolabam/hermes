---
name: skill-preservation
description: Use when a new Hermes skill should be preserved in Git.
---

Keep runtime-created skills private by default. For a reusable procedure suitable for public release, write a sanitized package under `skills/coding/<name>/` or `skills/life/<name>/` in the authorized `parabolabam/hermes` checkout. Include `SKILL.md` with `name` and `description` frontmatter and only the supporting files the procedure needs. Use synthetic examples.

Never copy the live skills tree or a runtime backup into Git. Review every proposed file for credentials, personal or customer data, transcripts, and private infrastructure details; keep anything that cannot be safely generalized in private storage. Stage only the reviewed files and inspect the staged diff. When authorized, submit a draft PR for operator review. If a separate GitHub App is being provisioned, wait for the operator to confirm it is ready before pushing or opening a PR; do not fall back to a personal credential. Do not schedule exports, publish automatically, merge, or deploy.
