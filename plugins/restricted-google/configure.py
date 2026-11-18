"""Enable managed Google tools before gateway startup; preserve all other state."""
import json
import os
from pathlib import Path
import sys
import tempfile
sys.path.insert(0, '/opt/hermes')
import hermes_yaml as yaml

def replace(path, text):
    original = path.stat()
    if path.read_text() == text: return
    with tempfile.NamedTemporaryFile('w', dir=path.parent, delete=False) as f:
        temp = Path(f.name)
        try:
            f.write(text); f.flush(); os.fsync(f.fileno())
            os.chmod(temp, original.st_mode & 0o777)
            os.chown(temp, original.st_uid, original.st_gid)
            os.replace(temp, path)
        finally:
            temp.unlink(missing_ok=True)

def configure(home, prompts=None):
    path = home / 'config.yaml'
    config = yaml.safe_load(path.read_text())
    plugins = config.setdefault('plugins', {})
    enabled = plugins.setdefault('enabled', [])
    if not isinstance(enabled, list): raise ValueError('Invalid plugins.enabled')
    if 'restricted-google' in plugins.get('disabled', []):
        raise ValueError('Managed Google connector is explicitly disabled')
    if 'restricted-google' not in enabled:
        enabled.append('restricted-google')
        replace(path, yaml.safe_dump(config, sort_keys=False, allow_unicode=True))
    if prompts and (home / 'cron/jobs.json').is_file():
        path = home / 'cron/jobs.json'
        store = json.loads(path.read_text())
        jobs = store if isinstance(store, list) else store['jobs']
        changed = False
        for name in ('life-check', 'life-digest'):
            matches = [job for job in jobs if job.get('name') == name]
            if len(matches) > 1: raise ValueError('Duplicate managed cron job')
            prompt = (prompts / (name + '.md')).read_text()
            if matches and matches[0]['prompt'] != prompt:
                matches[0]['prompt'] = prompt; changed = True
        if changed: replace(path, json.dumps(store, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    configure(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) > 2 else None)
