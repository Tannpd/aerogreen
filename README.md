# AeroGreen // Autonomous Aviation Net-Zero & Carbon Offset Audit Protocol

[![GenLayer v0.2.16 Compatible](https://img.shields.io/badge/GenLayer-v0.2.16-00F0FF?style=for-the-badge&logo=python)](https://genlayer.com)
[![Build Status](https://img.shields.io/badge/Tests-10%2F10%20PASSING-10B981?style=for-the-badge)](https://github.com/Tannpd/aerogreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-F43F5E?style=for-the-badge)](LICENSE)

---

## 📌 Problem Overview
Commercial airlines heavily advertise **"Net-Zero Flights"** by claiming to offset flight Jet-A1 carbon emissions through carbon credits. However, greenwashing fraud is rampant: airlines often under-report fuel consumption or purchase unverified, expired, or junk carbon credits.

**AeroGreen** solves this by implementing an **autonomous aviation ESG collateral vault protocol** powered by GenLayer's Non-Deterministic AI Consensus.

---

## 🏛️ Architecture & Verification Command

### Passing GenLayer Validation & Unit Test Command

To verify the Intelligent Contract syntax, state machine, and consensus safety rules, execute:

```bash
# Run 100% automated test suite
python -m unittest discover -s tests -p "test_*.py" -v
```

Output:
```text
test_audit_access_control_unauthorized ... ok
test_audit_junk_offset_slashes_airline_stake ... ok
test_audit_valid_offset_verifies_flight ... ok
test_failed_fetch_does_not_slash_stake ... ok
test_prevent_certificate_reuse ... ok
test_recover_esg_stake_clean_airline ... ok
test_register_flight_esg_stake_payable ... ok
test_reproducible_compilation ... ok
test_strict_boolean_validation_rejects_string ... ok
test_unauthorized_telemetry_domain_rejected ... ok

Ran 10 tests in 0.006s
OK
```

---

## 🛡️ Security & Protocol Safeguards

1. **Authenticated Telemetry Domain Origin**: Restricts flight telemetry logs to authorized, whitelisted sources (`https://flightaware.com/`, `https://flightradar24.com/`, `https://iata.org/`, `https://aerogreen-app.vercel.app/`).
2. **Authoritative Carbon Registry Domain Safeguard**: Restricts offset certificates to verified registries (`https://verra.org/`, `https://goldstandard.org/`, `https://corsia.icao.int/`).
3. **Access Control (Audit Authorization)**: Restricts `audit_flight_carbon_offset` to authenticated airline owners or authorized auditors, preventing unauthorized third-party manipulation.
4. **Certificate Anti-Reuse Tracking (`used_certificates`)**: Prevents airlines from double-counting or redeeming the same carbon credit certificate across multiple flight audits.
5. **Direct ICAO Mathematical Emissions Coverage Calculation**: Enforces mathematical ICAO fuel-to-CO2 calculation (`Jet-A1_fuel_tons * 3.16` = CO2 emitted) vs retired carbon credit volume, requiring $\ge 90\%$ coverage for verification.
6. **Fail-Closed Consensus & Strict Boolean Type Validation**: Rejects string boolean coercions and returns `FAILED` on scrape errors to preserve airline collateral stakes.

---

## ⚙️ Contract API Summary

* `register_flight_esg_stake(flight_code: str, flight_log_url: str) -> int` (payable)
* `audit_flight_carbon_offset(flight_id: int, carbon_registry_url: str) -> None`
* `recover_esg_stake(flight_id: int) -> None`
* `get_flight(flight_id: int) -> str`
* `get_flights_count() -> int`
* `is_certificate_used(certificate_url: str) -> bool`
