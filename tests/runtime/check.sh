#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cp -R "$root/compose.yaml" "$root/hermesctl" "$root/config" "$root/skills" "$root/scripts" "$root/plugins" "$tmp/"
mkdir -p "$tmp/google"
cp "$root/google/telegram.ts" "$tmp/google/telegram.ts"
cd "$tmp"
./hermesctl init >/dev/null
printf 'preserve me\n' >> .runtime/life/SOUL.md
before=$(shasum -a 256 .runtime/life/SOUL.md .runtime/secrets/life-api-key)
./hermesctl init >/dev/null
[[ $before == "$(shasum -a 256 .runtime/life/SOUL.md .runtime/secrets/life-api-key)" ]]
if ./hermesctl validate >/dev/null 2>&1; then echo 'Unexpected success: ./hermesctl validate >/dev/null 2>&1' >&2; exit 1; fi
./hermesctl model life test-model
./hermesctl model coding test-model
if ./hermesctl validate >/dev/null 2>&1; then echo 'Unexpected success: ./hermesctl validate >/dev/null 2>&1' >&2; exit 1; fi
node -e 'const fs=require("fs"); if ((fs.statSync(".runtime/secrets/life-api-key").mode & 0o777)!==0o600) process.exit(1)'
printf 'TELEGRAM_BOT_TOKEN=123:dummy\nTELEGRAM_ALLOWED_USERS=123\nTELEGRAM_HOME_CHANNEL=123\n' > .runtime/life/telegram.env
printf 'TELEGRAM_BOT_TOKEN=456:dummy\nTELEGRAM_ALLOWED_USERS=456\nTELEGRAM_HOME_CHANNEL=456\n' > .runtime/coding/telegram.env
./hermesctl validate >/dev/null
cp .runtime/life/config.yaml good.yaml
for bad in '  provider: other' 'fallback_providers: [paid]' '  base_url: https://example.invalid' '  api_key: test'; do
  printf '%s\n' "$bad" >> .runtime/life/config.yaml
  ! ./hermesctl validate >/dev/null 2>&1
  cp good.yaml .runtime/life/config.yaml
done
# Reject actual edits to main, delegation, cron, and fallback routes, not just appended YAML.
for mode in main worker cron fallback auxiliary; do
  node - "$mode" <<'JS'
const fs=require('fs');const path='.runtime/life/config.yaml';let text=fs.readFileSync(path,'utf8');
switch(process.argv[2]) {
  case 'main': text=text.replace('provider: openai-codex', 'provider: other'); break;
  case 'worker': text=text.replace('delegation:\n  provider: openai-codex', 'delegation:\n  provider: other'); break;
  case 'cron': text=text.replace('model_provider: openai-codex', 'model_provider: other'); break;
  case 'fallback': text=text.replace('fallback_providers: []', 'fallback_providers: [paid]'); break;
  case 'auxiliary': text=text.replace('fallback_chain: []', 'fallback_chain: [paid]'); break;
}
fs.writeFileSync(path,text);
JS
  ! ./hermesctl validate >/dev/null 2>&1
  cp good.yaml .runtime/life/config.yaml
done
printf 'OPENAI_API_KEY=dummy\n' > .runtime/life/.env
if node scripts/check-native-env.mjs .runtime/life/.env >/dev/null 2>&1; then echo 'Unexpected success: node scripts/check-native-env.mjs .runtime/life/.env >/dev/null 2>&1' >&2; exit 1; fi
rm .runtime/life/.env
printf 'OPENAI_BASE_URL=https://example.invalid\n' >> .runtime/life/telegram.env
if ./hermesctl validate >/dev/null 2>&1; then echo 'Unexpected success: ./hermesctl validate >/dev/null 2>&1' >&2; exit 1; fi
sed -i.bak '$d' .runtime/life/telegram.env
if grep -Eq 'docker.sock|^[[:space:]]+user:' compose.yaml; then echo 'Unexpected success: grep -Eq '''docker.sock|^[[:space:]]+user:''' compose.yaml' >&2; exit 1; fi
printf '{"jobs":[{"name":"life-check"}]}' > jobs.json
node scripts/cron-name.mjs jobs.json life-check
if node scripts/cron-name.mjs jobs.json life-digest; then echo 'Unexpected success: node scripts/cron-name.mjs jobs.json life-digest' >&2; exit 1; fi
printf 'invalid' > jobs.json
rc=0; node scripts/cron-name.mjs jobs.json life-check || rc=$?
[[ $rc == 2 ]]
bash -n hermesctl
node --check scripts/cron-name.mjs
node --check scripts/config.mjs
node --check scripts/telegram-ids.mjs
if docker compose version >/dev/null 2>&1; then docker compose --env-file /dev/null -f compose.yaml --profile admin config --format json > compose.json; else docker-compose --env-file /dev/null -f compose.yaml --profile admin config --format json > compose.json; fi
node - <<'NODE'
const s = require('./compose.json').services;
if (Object.keys(s).sort().join() !== 'coding,google-auth,google-connectors,life') throw Error('services');
if (s['google-connectors'].ports) throw Error('connector port');
const admin = s['google-auth'].ports;
if (!admin || admin.length !== 1 || admin[0].host_ip !== '127.0.0.1' || Number(admin[0].published) !== 8765 || Number(admin[0].target) !== 8765) throw Error('admin binding');
if (Object.keys(s['google-connectors'].networks).join() !== 'life-net' || Object.keys(s['google-auth'].networks).join() !== 'life-net') throw Error('google network');
for (const [role, net] of [['life','life-net'],['coding','coding-net']]) {
  if (Object.keys(s[role].networks).join() !== net || s[role].ports || s[role].user) throw Error('isolation');
  const mounts = s[role].volumes;
  if (!mounts.some(v => v.target === '/opt/data' && v.type === 'volume' && v.source === role + '-state')) throw Error('home');
  if (mounts.length !== (role === 'life' ? 2 : 1)) throw Error('mounts');
  if (role === 'life' && !mounts.some(v => v.target === '/run/secrets/life-api-key' && v.read_only)) throw Error('secret');
}
NODE
# Fake the native CLI only, recording its durable store; concurrent installers must create once.
mkdir -p fakebin .fakevol/life/cron
printf 'preserved-auth' > .fakevol/life/auth.json
cat > fakebin/docker <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == *'compose version'* ]]; then exit 0; fi
if [[ "$*" == *' ps '* ]]; then exit 0; fi
if [[ "$*" == *' exec -T --user root '* ]]; then
  if [[ -z ${READINESS_FAKE_STATE-} ]]; then exit 0; fi
  count=0; [[ ! -f $READINESS_FAKE_STATE ]] || count=$(cat "$READINESS_FAKE_STATE")
  count=$((count + 1)); printf '%s' "$count" > "$READINESS_FAKE_STATE"
  (( count >= ${FAKE_READY_AFTER:-999} )); exit
fi
if [[ "$*" == *'/opt/data/plugins/restricted-google/configure.py'* ]]; then exit 0; fi
if [[ "$*" == *' run '* && "$*" == *' --entrypoint sh '* ]]; then mkdir -p .fakevol/life; tar -xf - -C .fakevol/life; exit 0; fi
if [[ "$*" == *' run '* && "$*" == *' --entrypoint node '* ]]; then cat >/dev/null; node scripts/check-native-env.mjs .fakevol/life/.env; exit; fi
if [[ "$*" == *' --input-type=module '* ]]; then name=${!#}; node scripts/cron-name.mjs .fakevol/life/cron/jobs.json "$name"; exit; fi
name=''
while [[ $# -gt 0 ]]; do if [[ $1 == --name ]]; then name=$2; break; fi; shift; done
[[ -n $name ]]
sleep 1
node - "$name" <<'JS'
const fs=require('fs'); const p='.fakevol/life/cron/jobs.json';
const data=fs.existsSync(p)?JSON.parse(fs.readFileSync(p)): {jobs:[]};
data.jobs.push({name:process.argv[2]}); fs.writeFileSync(p,JSON.stringify(data));
JS
SH
chmod +x fakebin/docker
# The explicit helper timings let tests prove retries and timeout without a 45-second wait.
READINESS_FAKE_STATE="$tmp/readiness-count" FAKE_READY_AFTER=3 PATH="$tmp/fakebin:$PATH" scripts/role-readiness.sh life 5 1
[[ $(cat "$tmp/readiness-count") == 3 ]]
rm "$tmp/readiness-count"
if READINESS_FAKE_STATE="$tmp/readiness-count" FAKE_READY_AFTER=99 PATH="$tmp/fakebin:$PATH" scripts/role-readiness.sh coding 0 1 > readiness.out 2>&1; then exit 1; fi
grep -q 'coding gateway not ready' readiness.out
[[ $(cat "$tmp/readiness-count") == 1 ]]

PATH="$tmp/fakebin:$PATH" ./hermesctl sync life >/dev/null
[[ $(cat .fakevol/life/auth.json) == preserved-auth ]]
cmp .runtime/life/config.yaml .fakevol/life/config.yaml
PATH="$tmp/fakebin:$PATH" ./hermesctl sync life >/dev/null
[[ $(cat .fakevol/life/auth.json) == preserved-auth ]]
PATH="$tmp/fakebin:$PATH" ./hermesctl cron-install >/dev/null & a=$!
PATH="$tmp/fakebin:$PATH" ./hermesctl cron-install >/dev/null & b=$!
wait "$a"; wait "$b"
PATH="$tmp/fakebin:$PATH" ./hermesctl cron-install >/dev/null
node -e 'const j=require("./.fakevol/life/cron/jobs.json").jobs; if(j.length!==2 || new Set(j.map(x=>x.name)).size!==2) process.exit(1)'
# An abandoned lock with no PID must fail promptly without removing it.
mkdir .runtime/life/.cron-install.lock
SECONDS=0
if PATH="$tmp/fakebin:$PATH" ./hermesctl cron-install > lock.out 2>&1; then exit 1; fi
(( SECONDS < 8 ))
grep -q 'no readable valid PID' lock.out
[[ -d .runtime/life/.cron-install.lock ]]
rmdir .runtime/life/.cron-install.lock
# Simulate an unwritable/read-only filesystem: mkdir fails without creating a lock.
cat > fakebin/mkdir <<'SH'
#!/usr/bin/env bash
if [[ ${1-} == .runtime/life/.cron-install.lock ]]; then exit 1; fi
exec /bin/mkdir "$@"
SH
chmod +x fakebin/mkdir
SECONDS=0
if PATH="$tmp/fakebin:$PATH" ./hermesctl cron-install > lock.out 2>&1; then exit 1; fi
(( SECONDS < 5 ))
grep -q 'Cannot create cron installation lock' lock.out
[[ ! -e .runtime/life/.cron-install.lock ]]

echo 'Offline runtime checks passed.'
