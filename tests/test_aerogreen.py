# =============================================================================
#  test_aerogreen.py - AeroGreen Contract Unit Test Suite
# =============================================================================

import sys
import os
import json
import unittest
import py_compile
from unittest.mock import MagicMock

# --- Mocking structure to simulate the GenLayer SDK runtime ------------------
class MockContractBase:
    def __new__(cls, *args, **kwargs):
        instance = super().__new__(cls)
        for name, type_hint in getattr(cls, '__annotations__', {}).items():
            if 'dict' in str(type_hint) or 'TreeMap' in str(type_hint):
                setattr(instance, name, dict())
        return instance

class MockMessage:
    def __init__(self, sender="0x1111111111111111111111111111111111111111", value=0):
        self.sender_address = sender
        self.value = value

class MockWeb:
    def __init__(self):
        self.url_to_content = {}
        self.fail_on_next = False
    def render(self, url):
        if self.fail_on_next:
            raise Exception("Simulated telemetry log render failure")
        if "404" in url:
            raise Exception("404 Registry Page Not Found")
        if "empty" in url:
            return ""
        return self.url_to_content.get(url, "Flight telemetry: Boeing 787-9, 45 metric tons Jet-A1 burned, 142 metric tons CO2 emitted.")

class MockNondet:
    def __init__(self):
        self.web = MockWeb()
        self.exec_prompt_responses = []
        self.response_index = 0
    def exec_prompt(self, prompt):
        if self.exec_prompt_responses:
            res = self.exec_prompt_responses[self.response_index % len(self.exec_prompt_responses)]
            self.response_index += 1
            if isinstance(res, Exception):
                raise res
            return res
        return json.dumps({
            "is_greenwashed": True,
            "audit_score": 15,
            "audit_reasoning": "Junk unverified carbon credits used."
        })

class MockVM:
    def run_nondet_unsafe(self, leader_fn, validator_fn):
        leader_res = leader_fn()
        valid = validator_fn(leader_res)
        if not valid:
            return json.dumps({"error": "VALIDATOR_REJECTED_CONSENSUS"})
        return leader_res

class MockContractRef:
    def __init__(self, addr, tracker=None):
        self.addr = str(addr)
        self.tracker = tracker
    def emit_transfer(self, value=0):
        if self.tracker is not None:
            self.tracker.append({"target": self.addr, "value": int(value)})
        return True

class MockGL:
    def __init__(self):
        self.Contract = MockContractBase
        self.message = MockMessage()
        self.nondet = MockNondet()
        self.vm = MockVM()
        self.transfers_log = []
        self.public = MagicMock()
        self.public.write = lambda f: f
        self.public.write.payable = lambda f: f
        self.public.view = lambda f: f
    def get_contract_at(self, addr):
        return MockContractRef(addr, self.transfers_log)

class MockAddress:
    def __init__(self, val):
        self.val = str(val)
    def __str__(self):
        return self.val
    def __repr__(self):
        return f"Address('{self.val}')"

mock_gl = MockGL()
mock_gl.gl = mock_gl
sys.modules['genlayer'] = mock_gl
mock_gl.Contract = MockContractBase
mock_gl.Address = MockAddress
mock_gl.bigint = lambda v: int(v)
mock_gl.TreeMap = dict

# Add contracts directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../contracts')))
import aerogreen

class TestAeroGreen(unittest.TestCase):
    def setUp(self):
        mock_gl.message = MockMessage(sender="0x1111111111111111111111111111111111111111", value=10000000000000000000)
        mock_gl.nondet = MockNondet()
        mock_gl.transfers_log = []
        self.contract = aerogreen.Contract()

    def test_reproducible_compilation(self):
        """Verify contract file syntax and compilation."""
        contract_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../contracts/aerogreen.py'))
        compiled_file = py_compile.compile(contract_path, doraise=True)
        self.assertTrue(os.path.exists(compiled_file))

    def test_register_flight_esg_stake_payable(self):
        """Verify register_flight_esg_stake locks GEN collateral and binds flight_log_url."""
        airline = "0x1111111111111111111111111111111111111111"
        code = "VN-302"
        log_url = "https://aerogreen.vercel.app/mock_flight_telemetry_log.txt"
        mock_gl.message = MockMessage(sender=airline, value=10000000000000000000)

        fid = self.contract.register_flight_esg_stake(code, log_url)
        self.assertEqual(fid, 0)

        flight_json = self.contract.get_flight(0)
        flight = json.loads(flight_json)

        self.assertEqual(flight["id"], 0)
        self.assertEqual(flight["airline"], airline)
        self.assertEqual(flight["flight_code"], "VN-302")
        self.assertEqual(flight["log_url"], log_url)
        self.assertEqual(flight["esg_stake"], 10000000000000000000)
        self.assertEqual(flight["status"], "REGISTERED")

    def test_audit_junk_offset_slashes_airline_stake(self):
        """Verify junk offset audit slashes airline collateral 100% to public climate fund."""
        airline = "0x1111111111111111111111111111111111111111"
        code = "VN-302"
        log_url = "https://aerogreen.vercel.app/mock_flight_telemetry_log.txt"
        offset_url = "https://aerogreen.vercel.app/mock_junk_carbon_offset.txt"

        mock_gl.message = MockMessage(sender=airline, value=8000000000000000000)
        self.contract.register_flight_esg_stake(code, log_url)

        mock_gl.nondet.web.url_to_content[log_url] = "Flight telemetry: Boeing 787-9, 45 metric tons fuel burned, 142 metric tons CO2 emitted."
        mock_gl.nondet.web.url_to_content[offset_url] = "Registry record: Expired 2012 unverified forestry credits covering only 10 metric tons CO2."

        mock_gl.nondet.exec_prompt_responses = [
            json.dumps({
                "is_greenwashed": True,
                "audit_score": 15,
                "audit_reasoning": "Greenwashing fraud: Expired junk credits covering under 10% of flight emissions."
            })
        ]

        mock_gl.message = MockMessage(sender=airline)
        self.contract.audit_flight_carbon_offset(0, offset_url)

        flight_json = self.contract.get_flight(0)
        flight = json.loads(flight_json)

        self.assertTrue(flight["is_greenwashed"])
        self.assertEqual(flight["audit_score"], 15)
        self.assertEqual(flight["status"], "SLASHED")
        self.assertEqual(flight["esg_stake"], 0)
        self.assertTrue(any(t["target"] == aerogreen.PUBLIC_CLIMATE_FUND and t["value"] == 8000000000000000000 for t in mock_gl.transfers_log))

    def test_audit_valid_offset_verifies_flight(self):
        """Verify authentic carbon offset verifies flight and preserves airline collateral."""
        airline = "0x1111111111111111111111111111111111111111"
        code = "AF-118"
        log_url = "https://aerogreen.vercel.app/mock_flight_telemetry_log.txt"
        offset_url = "https://aerogreen.vercel.app/mock_valid_carbon_offset.txt"

        mock_gl.message = MockMessage(sender=airline, value=12000000000000000000)
        self.contract.register_flight_esg_stake(code, log_url)

        mock_gl.nondet.web.url_to_content[log_url] = "Flight telemetry: Airbus A350, 30 metric tons fuel burned, 95 metric tons CO2 emitted."
        mock_gl.nondet.web.url_to_content[offset_url] = "Verra Registry: 100 metric tons retired Gold Standard credits serial #VCS-9821."

        mock_gl.nondet.exec_prompt_responses = [
            json.dumps({
                "is_greenwashed": False,
                "audit_score": 98,
                "audit_reasoning": "Verified authentic Gold Standard carbon offset covering 105% of flight emissions."
            })
        ]

        mock_gl.message = MockMessage(sender=airline)
        self.contract.audit_flight_carbon_offset(0, offset_url)

        flight_json = self.contract.get_flight(0)
        flight = json.loads(flight_json)

        self.assertFalse(flight["is_greenwashed"])
        self.assertEqual(flight["status"], "VERIFIED")
        self.assertEqual(flight["esg_stake"], 12000000000000000000)

    def test_recover_esg_stake_clean_airline(self):
        """Verify verified clean airline can recover their ESG collateral stake."""
        airline = "0x1111111111111111111111111111111111111111"
        code = "AF-118"
        log_url = "https://aerogreen.vercel.app/mock_flight_telemetry_log.txt"
        offset_url = "https://aerogreen.vercel.app/mock_valid_carbon_offset.txt"

        mock_gl.message = MockMessage(sender=airline, value=5000000000000000000)
        self.contract.register_flight_esg_stake(code, log_url)

        mock_gl.nondet.exec_prompt_responses = [
            json.dumps({
                "is_greenwashed": False,
                "audit_score": 95,
                "audit_reasoning": "Verified authentic carbon offset."
            })
        ]

        mock_gl.message = MockMessage(sender=airline)
        self.contract.audit_flight_carbon_offset(0, offset_url)

        mock_gl.message = MockMessage(sender=airline)
        self.contract.recover_esg_stake(0)

        flight_json = self.contract.get_flight(0)
        flight = json.loads(flight_json)

        self.assertEqual(flight["status"], "RECOVERED")
        self.assertEqual(flight["esg_stake"], 0)
        self.assertTrue(any(t["target"] == airline and t["value"] == 5000000000000000000 for t in mock_gl.transfers_log))

    def test_failed_fetch_does_not_slash_stake(self):
        """Verify failed web fetch returns is_greenwashed = False and sets FAILED status preserving stake."""
        airline = "0x1111111111111111111111111111111111111111"
        code = "VN-302"
        log_url = "https://aerogreen.vercel.app/mock_flight_telemetry_log.txt"
        offset_url = "https://broken-registry.org/offset"

        mock_gl.message = MockMessage(sender=airline, value=3000000000000000000)
        self.contract.register_flight_esg_stake(code, log_url)

        mock_gl.nondet.web.fail_on_next = True

        mock_gl.message = MockMessage(sender=airline)
        self.contract.audit_flight_carbon_offset(0, offset_url)

        flight_json = self.contract.get_flight(0)
        flight = json.loads(flight_json)

        # Must fail closed and set status to FAILED, preserving airline collateral stake
        self.assertEqual(flight["status"], "FAILED")
        self.assertEqual(flight["esg_stake"], 3000000000000000000)

    def test_strict_boolean_validation_rejects_string(self):
        """Verify string boolean 'true' or 'false' in LLM output is rejected as non-boolean."""
        airline = "0x1111111111111111111111111111111111111111"
        code = "VN-302"
        log_url = "https://aerogreen.vercel.app/mock_flight_telemetry_log.txt"
        offset_url = "https://fake-link.com/offset"

        mock_gl.message = MockMessage(sender=airline, value=1000000000000000000)
        self.contract.register_flight_esg_stake(code, log_url)

        # LLM returns string "false" instead of boolean false
        mock_gl.nondet.exec_prompt_responses = [
            json.dumps({
                "is_greenwashed": "false",
                "audit_score": 90,
                "audit_reasoning": "Fake string response"
            })
        ]

        mock_gl.message = MockMessage(sender=airline)
        self.contract.audit_flight_carbon_offset(0, offset_url)

        flight_json = self.contract.get_flight(0)
        flight = json.loads(flight_json)

        # Contract MUST fail closed and set status to FAILED
        self.assertEqual(flight["status"], "FAILED")

if __name__ == '__main__':
    unittest.main()
