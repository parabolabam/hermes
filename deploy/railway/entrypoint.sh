#!/bin/sh
set -eu
# Keep new cloud instances inactive until their private volume has been migrated.
case "${HERMES_DEPLOYMENT_PAUSED:-true}" in
  true) exec sleep infinity ;;
  false) ;;
  *) echo 'HERMES_DEPLOYMENT_PAUSED must be true or false.' >&2; exit 1 ;;
esac
node /opt/hermes-deployment/prepare.mjs
if [ "$HERMES_ROLE" = google ]; then exec "$@"; fi
# exec preserves the official s6 entrypoint as PID 1.
exec /opt/hermes/docker/entrypoint-dispatch.sh "$@"
