import importlib.util
import io
import json
from pathlib import Path
import unittest
import tempfile
import sys
from unittest.mock import patch
from urllib.error import URLError

MODULE = Path(__file__).resolve().parents[2] / 'plugins' / 'restricted-google' / '__init__.py'

class Context:
    def __init__(self): self.tools = {}
    def register_tool(self, **kwargs): self.tools[kwargs['name']] = kwargs

class GoogleToolsTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(MODULE.is_file(), 'Google access must be exposed as native Hermes tools')
        spec = importlib.util.spec_from_file_location('google_connector_test', MODULE)
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        self.ctx = Context()
        self.module.register(self.ctx)

    def test_mail_check_uses_native_http_without_process_execution(self):
        calls = []
        class Opener:
            def open(_, request, timeout):
                calls.append(request)
                return io.BytesIO(b'{"message_ids":["message1"],"next_page_token":"next"}')
        with patch.object(self.module, 'build_opener', return_value=Opener()), patch.object(Path, 'read_text', return_value='fixture-key'), patch.dict('os.environ', {'HERMES_GOOGLE_HOST':'google-connectors.railway.internal'}), patch('subprocess.run', side_effect=AssertionError('No shell/code executor allowed')):
            result = json.loads(self.ctx.tools['google_gmail_list']['handler']({'account':'personal','max_results':10}))
        self.assertEqual(result['message_ids'], ['message1'])
        self.assertEqual(result['next_page_token'], 'next')
        self.assertEqual(calls[0].full_url, 'http://google-connectors.railway.internal:8787/gmail/list')
        self.assertEqual(calls[0].get_header('Authorization'), 'Bearer fixture-key')

    def test_no_send_delete_or_arbitrary_proxy_tool(self):
        self.assertEqual(set(self.ctx.tools), {'google_accounts','google_gmail_list','google_gmail_read','google_gmail_label','google_gmail_draft','google_sheets_metadata','google_sheets_read','google_sheets_write'})
        with patch.object(self.module,'build_opener') as opener:
            result = json.loads(self.ctx.tools['google_gmail_list']['handler']({'account':'personal','max_results':10,'url':'https://example.com'}))
        self.assertIn('error', result)
        opener.assert_not_called()

    def test_mutation_transport_failure_is_uncertain_and_not_retried(self):
        with patch.object(self.module,'build_opener') as factory, patch.object(Path,'read_text',return_value='fixture-key'):
            factory.return_value.open.side_effect = URLError('fixture-key must not leak')
            result=json.loads(self.ctx.tools['google_gmail_draft']['handler']({'account':'personal','to':['own@example.com'],'subject':'test','text':'draft'}))
        self.assertEqual(factory.return_value.open.call_count,1)
        self.assertTrue(result['outcome_unknown'])
        self.assertNotIn('fixture-key',json.dumps(result))

    def test_redirects_cannot_forward_bearer_key(self):
        self.assertIsNone(self.module.NoRedirect().redirect_request(None,None,302,'redirect',{},'https://example.com'))

class ConfigureTests(unittest.TestCase):
    def test_preserves_account_settings_jobs_and_notepad_ids(self):
        spec = importlib.util.spec_from_file_location('google_configure_test', MODULE.with_name('configure.py'))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory); (home/'cron').mkdir(); prompts=home/'prompts';prompts.mkdir()
            config={'model':{'provider':'openai-codex','default':'test'},'plugins':{'enabled':['existing']},'approval':{'mode':'ask'}}
            (home/'config.yaml').write_text(json.dumps(config))
            job={'name':'life-check','id':'keep-id','prompt':'old','enabled':True,'schedule':{'cron':'*/30 * * * *'},'state':{'keep':'value'}}
            (home/'cron/jobs.json').write_text(json.dumps({'jobs':[job]}))
            (prompts/'life-check.md').write_text('Use native tools')
            (prompts/'life-digest.md').write_text('Digest uses native tools')
            module.configure(home,prompts)
            actual=module.yaml.safe_load((home/'config.yaml').read_text())
            self.assertEqual(actual['approval'],config['approval'])
            self.assertEqual(actual['model'],config['model'])
            self.assertEqual(actual['plugins']['enabled'],['existing','restricted-google'])
            actual_job=json.loads((home/'cron/jobs.json').read_text())['jobs'][0]
            self.assertEqual(actual_job,{**job,'prompt':'Use native tools'})
            before=(home/'config.yaml').read_bytes(),(home/'cron/jobs.json').read_bytes()
            module.configure(home,prompts)
            self.assertEqual(before,((home/'config.yaml').read_bytes(),(home/'cron/jobs.json').read_bytes()))

if __name__ == '__main__': unittest.main()
