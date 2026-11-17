#!/usr/bin/env bash
# Usage: role-readiness.sh ROLE TIMEOUT_SECONDS POLL_SECONDS
set -euo pipefail
cd "$(dirname "$0")/.."
role=${1-}; timeout=${2-}; interval=${3-}
[[ $role == life || $role == coding ]] || { echo 'Invalid role.' >&2; exit 2; }
[[ $timeout =~ ^[0-9]+$ && $interval =~ ^[1-9][0-9]*$ ]] || { echo 'Invalid readiness timing.' >&2; exit 2; }
if docker compose version >/dev/null 2>&1; then dc=(docker compose --env-file /dev/null -f compose.yaml); else dc=(docker-compose --env-file /dev/null -f compose.yaml); fi
[[ -f .runtime/host.env ]] || { echo 'Missing .runtime/host.env; run init.' >&2; exit 2; }
uid=$(awk -F= '$1 == "HERMES_UID" {print $2}' .runtime/host.env)
gid=$(awk -F= '$1 == "HERMES_GID" {print $2}' .runtime/host.env)
[[ $uid =~ ^[1-9][0-9]*$ && $gid =~ ^[1-9][0-9]*$ && $uid -le 65534 && $gid -le 65534 ]] || { echo 'Invalid HERMES_UID or HERMES_GID in .runtime/host.env.' >&2; exit 2; }
start=$SECONDS
while :; do
  if "${dc[@]}" exec -T --user root "$role" sh -c '
    [ "$(id -u hermes)" = "$1" ] && [ "$(id -g hermes)" = "$2" ] &&
    [ "$(/command/s6-svstat -o up /run/hermes-service/gateway-default)" = true ] &&
    [ -S /opt/data/gateway.sock ] && [ "$(stat -c %a /opt/data/gateway.sock)" = 600 ]
  ' sh "$uid" "$gid" >/dev/null 2>&1; then exit 0; fi
  if (( SECONDS - start >= timeout )); then
    echo "$role gateway not ready: check container bootstrap, Hermes UID/GID, s6 gateway-default and socket mode 0600." >&2
    exit 1
  fi
  sleep "$interval"
done
