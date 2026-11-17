#!/usr/bin/env bash
# One-time import into empty native volumes; never overwrites an existing volume.
set -euo pipefail
cd "$(dirname "$0")/.."
image='nousresearch/hermes-agent@sha256:d6746a084e9341baada483e3d6210444d3c1aeb7c130f0915150065fb2851459'
if docker compose version >/dev/null 2>&1; then dc=(docker compose --env-file /dev/null -f compose.yaml); else dc=(docker-compose --env-file /dev/null -f compose.yaml); fi
[[ -z $("${dc[@]}" ps -q --status running) ]] || { echo 'Stop both assistants before migration.' >&2; exit 1; }
volumes=$("${dc[@]}" config --format json | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const v=JSON.parse(s).volumes;console.log(v["life-state"].name);console.log(v["coding-state"].name)})')
life_volume=$(printf '%s\n' "$volumes" | sed -n '1p'); coding_volume=$(printf '%s\n' "$volumes" | sed -n '2p')
for role in life coding; do
  [[ -f .runtime/$role/auth.json ]] || { echo "$role authentication file is missing; refusing migration." >&2; exit 1; }
done
for volume in "$life_volume" "$coding_volume"; do
  docker volume create "$volume" >/dev/null
  docker run --rm --network none --mount "type=volume,src=$volume,dst=/data,volume-nocopy" --entrypoint sh "$image" -c '[ -z "$(ls -A /data)" ]' || { echo 'Target volume is not empty; refusing import.' >&2; exit 1; }
done
for role in life coding; do
  if [[ $role == life ]]; then volume=$life_volume; else volume=$coding_volume; fi
  tar -C ".runtime/$role" --exclude './gateway.sock' --exclude './gateway.sock.path' --exclude './telegram.env' --exclude '*.pid' --exclude '*.lock' -cf - . |
    docker run -i --rm --network none --mount "type=volume,src=$volume,dst=/data,volume-nocopy" --entrypoint sh "$image" -c 'set -eu; tar -xf - -C /data; chown -R "$1:$2" /data; chmod 600 /data/auth.json' sh "$(id -u)" "$(id -g)"
  expected=$(shasum -a 256 ".runtime/$role/auth.json" | cut -d ' ' -f 1)
  actual=$(docker run --rm --network none --mount "type=volume,src=$volume,dst=/data,volume-nocopy" --entrypoint sha256sum "$image" /data/auth.json | cut -d ' ' -f 1)
  [[ $expected == "$actual" ]] || { echo "$role authentication copy verification failed." >&2; exit 1; }
  echo "$role state copied and authentication file verified."
done
