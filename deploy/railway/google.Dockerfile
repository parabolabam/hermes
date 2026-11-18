FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5
WORKDIR /app
COPY google/*.ts ./
COPY scripts/install-skills.mjs /opt/hermes-deployment/install-skills.mjs
COPY deploy/railway/prepare.mjs /opt/hermes-deployment/prepare.mjs
COPY deploy/railway/entrypoint.sh /opt/hermes-deployment/entrypoint.sh
ENTRYPOINT ["/bin/sh", "/opt/hermes-deployment/entrypoint.sh"]
CMD ["node", "server.ts"]
