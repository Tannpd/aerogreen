# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# =============================================================================
#  aerogreen.py - AeroGreen: Aviation Net-Zero & Carbon Offset Audit Protocol
#  GenLayer Intelligent Contract (v0.2.16)
# =============================================================================

from genlayer import *
import json

PUBLIC_CLIMATE_FUND = "0x000000000000000000000000000000000000C110"

class UserError(Exception):
    pass

def to_address(val) -> Address:
    """
    Ensures input addresses are represented as pure Address structures,
    protecting against string/int input deserialization issues in GenLayer Studio UI.
    """
    if isinstance(val, Address):
        return val
    if isinstance(val, int):
        return Address(f"0x{val:040x}")
    if isinstance(val, str):
        if val.startswith("0x"):
            return Address(val)
        try:
            return Address(f"0x{int(val):040x}")
        except Exception:
            return Address(val)
    return Address(str(val))

class Contract(gl.Contract):
    """
    AeroGreen
    =========
    Autonomous Aviation Net-Zero Flight & Carbon Offset ESG Audit Protocol on GenLayer.
    Airlines deposit an ESG collateral stake into a vault when marketing "Net-Zero" flights.
    GenLayer AI nodes scrape BOTH the actual flight fuel/telemetry log URL and the retired carbon credit registry URL.
    If the airline bought junk carbon credits or under-reported CO2 emissions (greenwashing),
    the airline's ESG stake is 100% slashed and awarded to a public climate action fund.
    If the carbon offset is verified authentic, the airline recovers its collateral stake.
    """

    # Monotonic flight registry counter
    flights_count:              bigint

    # Storage Mappings (Pre-initialized by VM)
    flight_airline:             TreeMap[str, Address]
    flight_esg_stake:           TreeMap[str, bigint]
    flight_status:              TreeMap[str, str]       # "REGISTERED", "VERIFIED", "SLASHED", "RECOVERED", "FAILED"
    flight_code:                TreeMap[str, str]
    flight_log_url:             TreeMap[str, str]
    flight_carbon_registry_url: TreeMap[str, str]
    flight_is_greenwashed:      TreeMap[str, bool]
    flight_audit_score:         TreeMap[str, bigint]    # 0 to 100
    flight_audit_reasoning:     TreeMap[str, str]

    # -------------------------------------------------------------------
    # CONSTRUCTOR
    # -------------------------------------------------------------------
    def __init__(self) -> None:
        self.flights_count = bigint(0)

    # -------------------------------------------------------------------
    # PUBLIC WRITE: REGISTER FLIGHT ESG STAKE (AIRLINE LOCKS COLLATERAL)
    # -------------------------------------------------------------------
    @gl.public.write.payable
    def register_flight_esg_stake(self, flight_code: str, flight_log_url: str) -> int:
        """
        Registers a Net-Zero flight route and locks GEN collateral as an ESG guarantee.
        Binds the flight telemetry / fuel consumption log URL on-chain.
        """
        amount = gl.message.value
        if amount <= bigint(0):
            raise UserError("ESG collateral stake must be greater than zero.")

        if len(flight_code.strip()) == 0:
            raise UserError("Flight code cannot be empty (e.g., VN-302, AF-118).")

        if len(flight_log_url.strip()) == 0:
            raise UserError("Flight telemetry fuel log URL cannot be empty.")

        url_lower = flight_log_url.lower().strip()
        if not (url_lower.startswith("http://") or url_lower.startswith("https://")):
            raise UserError("Invalid flight log URL format. Must start with http:// or https://")

        fid = self.flights_count
        fid_str = str(fid)
        airline_addr = to_address(gl.message.sender_address)

        self.flight_airline[fid_str] = airline_addr
        self.flight_esg_stake[fid_str] = amount
        self.flight_status[fid_str] = "REGISTERED"
        self.flight_code[fid_str] = flight_code.strip().upper()
        self.flight_log_url[fid_str] = flight_log_url.strip()
        self.flight_carbon_registry_url[fid_str] = ""
        self.flight_is_greenwashed[fid_str] = False
        self.flight_audit_score[fid_str] = bigint(0)
        self.flight_audit_reasoning[fid_str] = "Net-zero flight registered. ESG collateral stake locked."

        self.flights_count = fid + bigint(1)
        return int(fid)

    # -------------------------------------------------------------------
    # PUBLIC WRITE: AUDIT FLIGHT CARBON OFFSET & SLASH IF GREENWASHED
    # -------------------------------------------------------------------
    @gl.public.write
    def audit_flight_carbon_offset(self, flight_id: int, carbon_registry_url: str) -> None:
        """
        Audits a registered Net-Zero flight against retired carbon credit registry evidence.
        GenLayer AI nodes scrape BOTH the flight telemetry log URL and the carbon registry URL,
        verifying Jet-A1 fuel CO2 calculations vs retired credit quality and volume.
        """
        fid_str = str(flight_id)
        if flight_id < 0 or bigint(flight_id) >= self.flights_count:
            raise UserError("Flight record does not exist.")

        status = self.flight_status.get(fid_str, "REGISTERED")
        if status != "REGISTERED" and status != "FAILED":
            raise UserError("Flight is not in an auditable state.")

        if len(carbon_registry_url.strip()) == 0:
            raise UserError("Carbon offset registry URL cannot be empty.")

        url_lower = carbon_registry_url.lower().strip()
        if not (url_lower.startswith("http://") or url_lower.startswith("https://")):
            raise UserError("Invalid carbon registry URL format. Must start with http:// or https://")

        log_url = self.flight_log_url.get(fid_str, "")

        self.flight_carbon_registry_url[fid_str] = carbon_registry_url.strip()
        self.flight_status[fid_str] = "REGISTERED"
        self.flight_audit_reasoning[fid_str] = "Aviation ESG AI Inspector is auditing flight telemetry log against carbon registry..."

        # Non-Deterministic Consensus Function
        def leader_fn() -> str:
            # 1. Fetch flight fuel telemetry log
            try:
                raw_log = gl.nondet.web.render(log_url)
                if isinstance(raw_log, bytes):
                    log_text = raw_log.decode('utf-8', errors='ignore').strip()
                else:
                    log_text = str(raw_log).strip()
            except Exception as e:
                # SAFE FAIL: Do NOT slash on fetch failure! Return is_greenwashed = False
                return json.dumps({
                    "error": f"FLIGHT_LOG_LOAD_FAILED: {str(e)}",
                    "is_greenwashed": False,
                    "audit_score": 0,
                    "audit_reasoning": f"Audit error: Could not scrape flight log at {log_url}."
                })

            # 2. Fetch retired carbon credit registry evidence
            try:
                raw_offset = gl.nondet.web.render(carbon_registry_url)
                if isinstance(raw_offset, bytes):
                    offset_text = raw_offset.decode('utf-8', errors='ignore').strip()
                else:
                    offset_text = str(raw_offset).strip()
            except Exception as e:
                # SAFE FAIL: Do NOT slash on fetch failure! Return is_greenwashed = False
                return json.dumps({
                    "error": f"CARBON_REGISTRY_LOAD_FAILED: {str(e)}",
                    "is_greenwashed": False,
                    "audit_score": 0,
                    "audit_reasoning": f"Audit error: Could not scrape carbon registry at {carbon_registry_url}."
                })

            if len(offset_text) < 15:
                return json.dumps({
                    "error": "EMPTY_CARBON_REGISTRY",
                    "is_greenwashed": False,
                    "audit_score": 0,
                    "audit_reasoning": "Carbon credit registry evidence appeared empty or unparseable."
                })

            log_excerpt = log_text[:3000]
            offset_excerpt = offset_text[:4000]

            # 3. AI Aviation ESG Inspector Prompt
            prompt = f"""You are a Lead Aviation ESG Inspector for AeroGreen, an autonomous flight carbon offset verification protocol.
Your task is to audit a commercial airline's "Net-Zero Flight" claims by comparing their flight fuel consumption telemetry log against their official retired carbon credit certificate.

Flight Fuel Telemetry Log URL: {log_url}
--- START FLIGHT TELEMETRY LOG ---
{log_excerpt}
--- END FLIGHT TELEMETRY LOG ---

Carbon Offset Registry Certificate URL: {carbon_registry_url}
--- START CARBON REGISTRY CERTIFICATE ---
{offset_excerpt}
--- END CARBON REGISTRY CERTIFICATE ---

Audit Rules:
1. Verify if the Jet-A1 fuel burned (or total metric tons of CO2 emitted) is fully covered by high-quality, verified retired carbon credits (e.g., Gold Standard, Verra VCS, CORSIA eligible).
2. Detect Greenwashing fraud: If the carbon credits are junk/unverified, expired, double-counted, or cover LESS THAN 90% of the actual flight CO2 emissions, "is_greenwashed" MUST be true.
3. Compute an "audit_score" from 0 to 100 (where 0 means 100% greenwashed fraud, and 100 means verified authentic 100%+ CO2 offset).
4. If "audit_score" is BELOW 60, "is_greenwashed" MUST be true (requiring 100% collateral slash). If "audit_score" is 60 or above, "is_greenwashed" should be false.
5. Provide a 2-3 sentence technical ESG audit reasoning.

Output MUST be a single JSON object with EXACTLY these keys:
{{
  "is_greenwashed": true | false,
  "audit_score": <int between 0 and 100>,
  "audit_reasoning": "<2-3 sentences of aviation ESG analysis>"
}}
Do NOT wrap the JSON in markdown code blocks. Return ONLY raw JSON."""

            try:
                raw_output = gl.nondet.exec_prompt(prompt)
                if isinstance(raw_output, bytes):
                    raw_str = raw_output.decode('utf-8', errors='ignore').strip()
                else:
                    raw_str = str(raw_output).strip()
            except Exception as e:
                return json.dumps({
                    "error": f"LLM_EXECUTION_FAILED: {str(e)}",
                    "is_greenwashed": False,
                    "audit_score": 0,
                    "audit_reasoning": "LLM ESG inspector failed to resolve."
                })

            cleaned = raw_str.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                inner = []
                for line in lines[1:]:
                    if line.strip() == "```":
                        break
                    inner.append(line)
                cleaned = "\n".join(inner).strip()

            try:
                parsed = json.loads(cleaned)
                raw_gw = parsed.get("is_greenwashed")

                # STRICT BOOLEAN TYPE VALIDATION
                if not isinstance(raw_gw, bool):
                    return json.dumps({
                        "error": "INVALID_BOOLEAN_TYPE",
                        "is_greenwashed": False,
                        "audit_score": 0,
                        "audit_reasoning": "AI Inspector verdict contained a non-boolean value for is_greenwashed."
                    })

                is_greenwashed = raw_gw
                score = int(parsed.get("audit_score", 0))
                reasoning = str(parsed.get("audit_reasoning", "No audit details.")).strip()

                if score < 0: score = 0
                if score > 100: score = 100

                if score < 60:
                    is_greenwashed = True

                return json.dumps({
                    "is_greenwashed": is_greenwashed,
                    "audit_score": score,
                    "audit_reasoning": reasoning[:1000]
                })
            except Exception as e:
                return json.dumps({
                    "error": f"JSON_PARSE_FAILED: {str(e)}",
                    "is_greenwashed": False,
                    "audit_score": 0,
                    "audit_reasoning": f"Audit failed: Could not parse LLM output. Raw response: {cleaned}"
                })

        def validator_fn(leader_result: str) -> bool:
            """
            Semantic Validator: Enforces consensus on greenwashing verdict.
            Returns False on any leader or validator error to fail closed.
            """
            try:
                if isinstance(leader_result, bytes):
                    leader_str = leader_result.decode('utf-8', errors='ignore')
                else:
                    leader_str = str(leader_result)
                l_start = leader_str.find('{')
                l_end = leader_str.rfind('}')
                if l_start == -1 or l_end == -1 or l_start > l_end:
                    return False
                cleaned_leader = leader_str[l_start:l_end+1]
                leader_data = json.loads(cleaned_leader)
            except Exception:
                return False

            if "error" in leader_data:
                return False  # Fail closed

            # STRICT BOOLEAN CHECK FOR LEADER RESULT
            leader_gw_raw = leader_data.get("is_greenwashed")
            if not isinstance(leader_gw_raw, bool):
                return False

            validator_raw = leader_fn()
            try:
                if isinstance(validator_raw, bytes):
                    val_str = validator_raw.decode('utf-8', errors='ignore')
                else:
                    val_str = str(validator_raw)
                v_start = val_str.find('{')
                v_end = val_str.rfind('}')
                if v_start == -1 or v_end == -1 or v_start > v_end:
                    return False
                cleaned_val = val_str[v_start:v_end+1]
                validator_data = json.loads(cleaned_val)
            except Exception:
                return False

            if "error" in validator_data:
                return False

            # STRICT BOOLEAN CHECK FOR VALIDATOR RESULT
            val_gw_raw = validator_data.get("is_greenwashed")
            if not isinstance(val_gw_raw, bool):
                return False

            return leader_gw_raw == val_gw_raw

        # Execute Consensus on GenLayer VM
        consensus_json = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        try:
            if isinstance(consensus_json, bytes):
                cons_str = consensus_json.decode('utf-8', errors='ignore')
            else:
                cons_str = str(consensus_json)
            cons_start = cons_str.find('{')
            cons_end = cons_str.rfind('}')
            if cons_start == -1 or cons_end == -1 or cons_start > cons_end:
                raise ValueError("No JSON object found")
            cleaned_cons = cons_str[cons_start:cons_end+1]
            res = json.loads(cleaned_cons)
        except Exception:
            self.flight_status[fid_str] = "FAILED"
            self.flight_audit_reasoning[fid_str] = "Consensus outcome was unparseable JSON."
            return

        if "error" in res:
            self.flight_status[fid_str] = "FAILED"
            self.flight_audit_reasoning[fid_str] = f"Audit Failed: {res.get('error')}. Info: {res.get('audit_reasoning')}"
            return

        # STRICT SETTLEMENT PATH BOOLEAN VALIDATION
        settle_gw_raw = res.get("is_greenwashed")
        if not isinstance(settle_gw_raw, bool):
            self.flight_status[fid_str] = "FAILED"
            self.flight_audit_reasoning[fid_str] = "Audit Failed: Invalid non-boolean value for is_greenwashed in settlement path."
            return

        is_greenwashed = settle_gw_raw
        score = int(res.get("audit_score", 0))
        reasoning = str(res.get("audit_reasoning", "Audit complete."))

        self.flight_is_greenwashed[fid_str] = is_greenwashed
        self.flight_audit_score[fid_str] = bigint(score)
        self.flight_audit_reasoning[fid_str] = reasoning

        stake = self.flight_esg_stake.get(fid_str, bigint(0))
        if stake <= bigint(0):
            raise UserError("No collateral stake found in this flight vault.")

        if is_greenwashed:
            # Reentrancy Protection
            self.flight_esg_stake[fid_str] = bigint(0)
            # Greenwashing Fraud Confirmed: 100% Slash to Public Climate Action Fund
            self.flight_status[fid_str] = "SLASHED"
            climate_fund = to_address(PUBLIC_CLIMATE_FUND)
            other_fund = gl.get_contract_at(climate_fund)
            other_fund.emit_transfer(value=bigint(stake))
        else:
            # Verified Authentic Net-Zero Flight
            self.flight_status[fid_str] = "VERIFIED"

    # -------------------------------------------------------------------
    # PUBLIC WRITE: RECOVER ESG STAKE (FOR VERIFIED CLEAN AIRLINES)
    # -------------------------------------------------------------------
    @gl.public.write
    def recover_esg_stake(self, flight_id: int) -> None:
        """
        Allows an airline to recover their ESG collateral stake after their flight
        has been audited and VERIFIED authentic Net-Zero.
        """
        fid_str = str(flight_id)
        if flight_id < 0 or bigint(flight_id) >= self.flights_count:
            raise UserError("Flight record does not exist.")

        airline = to_address(self.flight_airline.get(fid_str, Address("0x0000000000000000000000000000000000000000")))
        sender = to_address(gl.message.sender_address)

        if str(sender) != str(airline):
            raise UserError("Only the airline owner can recover their ESG collateral stake.")

        status = self.flight_status.get(fid_str, "REGISTERED")
        if status != "VERIFIED":
            raise UserError("ESG collateral stake can only be recovered for VERIFIED flights.")

        stake = self.flight_esg_stake.get(fid_str, bigint(0))
        if stake <= bigint(0):
            raise UserError("No collateral stake available for recovery.")

        # Reentrancy Protection
        self.flight_esg_stake[fid_str] = bigint(0)
        self.flight_status[fid_str] = "RECOVERED"
        self.flight_audit_reasoning[fid_str] = "Verified Net-Zero flight. Airline successfully recovered ESG collateral stake."

        # Refund stake to airline
        other_airline = gl.get_contract_at(airline)
        other_airline.emit_transfer(value=bigint(stake))

    # -------------------------------------------------------------------
    # READ-ONLY VIEW METHODS
    # -------------------------------------------------------------------
    @gl.public.view
    def get_flight(self, flight_id: int) -> str:
        """
        Returns a JSON-serialized representation of a flight ESG audit record.
        """
        fid_str = str(flight_id)
        if flight_id < 0 or bigint(flight_id) >= self.flights_count:
            return "{}"

        airline = to_address(self.flight_airline.get(fid_str, Address("0x0000000000000000000000000000000000000000")))
        stake = self.flight_esg_stake.get(fid_str, bigint(0))
        status = self.flight_status.get(fid_str, "REGISTERED")
        code = self.flight_code.get(fid_str, "")
        log_url = self.flight_log_url.get(fid_str, "")
        carbon_url = self.flight_carbon_registry_url.get(fid_str, "")
        is_gw = bool(self.flight_is_greenwashed.get(fid_str, False))
        score = int(self.flight_audit_score.get(fid_str, bigint(0)))
        reasoning = self.flight_audit_reasoning.get(fid_str, "")

        return json.dumps({
            "id": flight_id,
            "airline": str(airline),
            "esg_stake": int(stake),
            "status": status,
            "flight_code": code,
            "log_url": log_url,
            "carbon_registry_url": carbon_url,
            "is_greenwashed": is_gw,
            "audit_score": score,
            "audit_reasoning": reasoning
        })

    @gl.public.view
    def get_flights_count(self) -> int:
        """
        Returns the total number of registered flight ESG audits.
        """
        return int(self.flights_count)
