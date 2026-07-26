# ✈️ AeroGreen — Aviation Net-Zero Flight & Carbon Offset ESG Audit Protocol

[![GenLayer Version](https://img.shields.io/badge/GenLayer-v0.2.16-10B981?style=for-the-badge)](https://genlayer.com)
[![Status](https://img.shields.io/badge/StudioNet-Deployed-00F0FF?style=for-the-badge)](https://studio.genlayer.com)
[![Live Web](https://img.shields.io/badge/Vercel-Live_App-000000?style=for-the-badge&logo=vercel)](https://aerogreen-app.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

> **Autonomous Aviation Net-Zero Flight & Carbon Credit Verification Protocol with Automatic Greenwashing Collateral Slashing powered by GenLayer Intelligent Contracts v0.2.16.**

---

## 📍 Deployed Network Details

* **Intelligent Contract Address (StudioNet)**: `0xcF9D961d48a0210480B91B094861647D278c1726`
* **Live Production dApp**: [https://aerogreen-app.vercel.app](https://aerogreen-app.vercel.app)
* **GitHub Repository**: [https://github.com/Tannpd/aerogreen](https://github.com/Tannpd/aerogreen)
* **Public Climate Action Fund Address**: `0x000000000000000000000000000000000000C11M`

---

## 💡 Problem Statement & Real-World Impact

### ❌ Commercial Aviation Greenwashing Fraud
Airlines frequently market flight routes as "100% Carbon Neutral" or "Net-Zero", collecting eco-premium ticket fees from passengers while purchasing cheap, unverified, or junk carbon offset credits that cover less than 10% of actual Jet-A1 fuel CO2 emissions.

### 🚀 The AeroGreen Autonomous Solution
**AeroGreen** forces commercial airlines to lock a GEN collateral stake into an ESG guarantee vault when registering flight routes. GenLayer AI validator nodes scrape BOTH the flight's Jet-A1 fuel consumption telemetry log and the official retired carbon credit certificate URL via `gl.nondet.web.render`. A Lead Aviation ESG Inspector LLM prompt calculates exact flight CO2 emissions versus retired carbon credit volume and registry standard (Gold Standard, Verra VCS).

* **Valid Offset ($\ge$ 90% CO2 Coverage)**: Flight earns a **Verified Net-Zero Badge**, preserving the airline's collateral stake.
* **Greenwashed Offset (< 90% CO2 Coverage)**: Airline's collateral is **100% Slashed** directly to a public climate action fund.

---

## 🏗️ Technical Architecture & GenLayer v0.2.16 Standards

```
                                  +---------------------------------------+
                                  |   Flight Fuel Telemetry Log URL       |
                                  +-------------------+-------------------+
                                                      |
+---------------------+    register_flight_esg_stake()| (Bound on-chain)
|  Airline Wallet     | ------------------------------+-------------------> +-----------------------------+
+---------------------+  Locks ESG Stake (GEN)                            |  AeroGreen ESG Collateral   |
                                                                          |  Contract Vault             |
                           audit_flight_carbon_offset(carbon_url)         |                             |
                                ----------------------------------------> +--------------+--------------+
                                                                                         |
                                                                                         | gl.vm.run_nondet_unsafe()
                                                                                         v
                                                                          +-----------------------------+
                                                                          | GenLayer AI Validator Nodes |
                                                                          +--------------+--------------+
                                                                                         |
                                           +---------------------------------------------+---------------------------------------------+
                                           |                                                                                           |
                                           v                                                                                           v
                    [is_greenwashed == false (Score >= 60%)]                                                    [is_greenwashed == true (Score < 60%)]
                                           |                                                                                           |
                                           v                                                                                           v
                        +------------------------------------+                                                      +------------------------------------+
                        | Verified Net-Zero Badge Granted    |                                                      | 100% Collateral Stake Slashed to   |
                        | Status: VERIFIED                   |                                                      | Public Climate Action Fund         |
                        | Airline Can Recover ESG Stake      |                                                      | Status: SLASHED                    |
                        +------------------------------------+                                                      +------------------------------------+
```

### 🔒 Key Contract Rules & Safety Compliance
1. **Strict Boolean Type Validation**:
   - Evaluates `isinstance(raw_gw, bool)` in Leader, Validator, and Settlement execution paths. Rejects string booleans (e.g. `"false"`).
2. **Fail-Closed Consensus Security**:
   - If web fetching or LLM execution fails, `validator_fn` returns `False`, preserving airline collateral without slashing on network errors.
3. **Unsuppressed Token Transfers**:
   - Executes `other_contract.emit_transfer(...)` without `try/except` suppression to ensure atomic state reverts on transfer failures.
4. **Access Control**:
   - Only the registered airline (`sender == flight_airline`) can recover collateral stakes from verified clean flights.

---

## 🧪 Automated Unit Test Verification

The contract includes a complete `unittest` test suite covering all 7 core execution paths:

```powershell
# Run unit tests inside python virtual environment
cd D:\Gen\AeroGreen
.venv\Scripts\python -m unittest tests/test_aerogreen.py -v
```

### Test Results Summary:
* `test_register_flight_esg_stake_payable`: **OK** (Locks collateral & binds flight log URL).
* `test_audit_valid_offset_verifies_flight`: **OK** (Gold Standard offset verifies flight).
* `test_audit_junk_offset_slashes_airline_stake`: **OK** (Junk offset slashes 100% to Climate Fund).
* `test_recover_esg_stake_clean_airline`: **OK** (Verified clean airline recovers ESG stake).
* `test_failed_fetch_does_not_slash_stake`: **OK** (Fail-closed safety preserves stake on fetch error).
* `test_strict_boolean_validation_rejects_string`: **OK** (String `"false"` is rejected).
* `test_reproducible_compilation`: **OK** (Syntax & compilation verified).

---

## 🔗 Live Mock Test Files

Use these pre-hosted endpoints to test the live Web App or GenLayer Studio:

* **Flight Fuel Telemetry Log**: [https://aerogreen-app.vercel.app/mock_flight_telemetry_log.txt](https://aerogreen-app.vercel.app/mock_flight_telemetry_log.txt)
* **Valid Carbon Offset Certificate (Verified)**: [https://aerogreen-app.vercel.app/mock_valid_carbon_offset.txt](https://aerogreen-app.vercel.app/mock_valid_carbon_offset.txt)
* **Junk Carbon Offset Certificate (100% Slashed)**: [https://aerogreen-app.vercel.app/mock_junk_carbon_offset.txt](https://aerogreen-app.vercel.app/mock_junk_carbon_offset.txt)

---

## 💻 Local Development & Build Setup

```bash
# Clone the repository
git clone https://github.com/Tannpd/aerogreen.git
cd aerogreen/frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
