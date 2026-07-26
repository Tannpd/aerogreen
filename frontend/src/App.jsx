import React, { useState, useEffect } from 'react';
import { 
  useAeroGreen, 
  formatGen 
} from './useAeroGreen';
import { 
  Plane, 
  Wallet, 
  PlusCircle, 
  FolderOpen, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Coins,
  Sparkles,
  RefreshCw,
  Globe,
  Cpu,
  ArrowRight,
  Shield,
  Leaf,
  Flame,
  Check,
  XCircle,
  Award
} from 'lucide-react';

export default function App() {
  const {
    address,
    flights,
    contractBalance,
    loading,
    error,
    txHash,
    txStatus,
    connectWallet,
    fetchFlightsState,
    registerFlightEsgStake,
    auditFlightCarbonOffset,
    recoverEsgStake,
    contractAddress
  } = useAeroGreen();

  const [activeTab, setActiveTab] = useState('LANDING'); // LANDING, REGISTER, REGISTRY
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  
  // Form inputs
  const [flightCodeInput, setFlightCodeInput] = useState('VN-302');
  const [logUrlInput, setLogUrlInput] = useState('https://aerogreen.vercel.app/mock_flight_telemetry_log.txt');
  const [stakeAmountInput, setStakeAmountInput] = useState('10.0');
  const [carbonRegistryUrlInput, setCarbonRegistryUrlInput] = useState('');

  const selectedFlight = flights.find(f => Number(f.id) === Number(selectedFlightId));

  // Auto select first flight
  useEffect(() => {
    if (activeTab === 'REGISTRY' && flights.length > 0 && selectedFlightId === null) {
      setSelectedFlightId(flights[0].id);
    }
  }, [activeTab, flights, selectedFlightId]);

  const handleRegisterFlight = async (e) => {
    e.preventDefault();
    if (!flightCodeInput || !logUrlInput || !stakeAmountInput) return;
    try {
      await registerFlightEsgStake(flightCodeInput, logUrlInput, stakeAmountInput);
      setFlightCodeInput('VN-302');
      setLogUrlInput('https://aerogreen.vercel.app/mock_flight_telemetry_log.txt');
      setStakeAmountInput('10.0');
      setActiveTab('REGISTRY');
      setSelectedFlightId(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuditCarbonOffset = async (e) => {
    e.preventDefault();
    if (!carbonRegistryUrlInput || selectedFlightId === null) return;
    try {
      await auditFlightCarbonOffset(selectedFlightId, carbonRegistryUrlInput);
      setCarbonRegistryUrlInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecoverStake = async (e) => {
    e.preventDefault();
    if (selectedFlightId === null) return;
    try {
      await recoverEsgStake(selectedFlightId);
    } catch (err) {
      console.error(err);
    }
  };

  // Compute stat summary metrics
  const verifiedCount = flights.filter(f => f.status === 'VERIFIED' || f.status === 'RECOVERED').length;
  const slashedCount = flights.filter(f => f.status === 'SLASHED').length;
  const registeredCount = flights.filter(f => f.status === 'REGISTERED').length;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand-logo" onClick={() => setActiveTab('LANDING')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon-box">
            <Plane size={24} />
          </div>
          <div>
            <div className="brand-title">AeroGreen</div>
            <div className="brand-subtitle">Aviation Net-Zero & Carbon Offset Audit</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="nav-links">
            <button 
              onClick={() => setActiveTab('LANDING')}
              className={`nav-link ${activeTab === 'LANDING' ? 'active' : ''}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('REGISTER')}
              className={`nav-link ${activeTab === 'REGISTER' ? 'active' : ''}`}
            >
              Register Flight
            </button>
            <button 
              onClick={() => {
                setActiveTab('REGISTRY');
                fetchFlightsState();
              }}
              className={`nav-link ${activeTab === 'REGISTRY' ? 'active' : ''}`}
            >
              Flight Registry ({flights.length})
            </button>
          </div>

          <div style={{ background: '#0F172A', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '6px 14px', fontSize: '12px', color: 'var(--primary-emerald)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-emerald)', boxShadow: '0 0 8px var(--primary-emerald)' }} />
            StudioNet
          </div>

          {address ? (
            <div style={{ background: 'var(--emerald-dim)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '8px 16px', color: '#FFF', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={16} color="var(--primary-emerald)" />
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          ) : (
            <button onClick={connectWallet} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}>
              <Wallet size={16} />
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Modern Web3 Full-Screen Loading Modal Overlay */}
      {loading && (
        <div className="modal-overlay">
          <div className="loading-modal-card">
            <div className="loading-spinner-box">
              <RefreshCw size={44} className="animate-spin" color="var(--primary-emerald)" />
              <div className="spinner-glow-ring" />
            </div>

            <h3 className="loading-modal-title">
              GenLayer Aviation ESG Audit in Progress
            </h3>

            <p className="loading-modal-status">
              {txStatus || 'Writing transaction instructions to GenLayer Virtual Machine...'}
            </p>

            <div className="loading-steps-box">
              <div className="loading-step-item">
                <span className="step-dot active" />
                <span>1. Corroborating flight telemetry log & carbon credit registry URL</span>
              </div>
              <div className="loading-step-item">
                <span className="step-dot active" />
                <span>2. Executing Lead Aviation ESG Inspector LLM prompt</span>
              </div>
              <div className="loading-step-item">
                <span className="step-dot active" />
                <span>3. Re-executing validator nodes for fail-closed consensus</span>
              </div>
            </div>

            {txHash && (
              <div className="loading-tx-hash">
                <span>TX HASH:</span> {txHash}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LANDING PAGE TAB */}
      {activeTab === 'LANDING' && (
        <div className="landing-wrapper">
          {/* Hero Section */}
          <div className="hero-section">
            <div className="hero-badge">
              <Sparkles size={14} color="var(--primary-emerald)" />
              <span>POWERED BY GENLAYER INTELLIGENT CONTRACTS v0.2.16</span>
            </div>

            <h1 className="hero-title">
              Autonomous Aviation <br />
              <span className="gradient-text">Net-Zero Flight Carbon Audit</span>
            </h1>

            <p className="hero-description">
              Eliminate airline greenwashing fraud. AeroGreen requires commercial airlines to lock an ESG collateral stake into smart contracts. GenLayer AI validator nodes audit actual Jet-A1 flight fuel consumption against retired carbon credit certificates before granting verified badges or slashing junk credits to a climate action fund.
            </p>

            <div className="hero-cta-group">
              <button onClick={() => setActiveTab('REGISTER')} className="btn-primary" style={{ width: 'auto', padding: '16px 36px', fontSize: '16px' }}>
                Register Net-Zero Flight
                <ArrowRight size={18} />
              </button>

              <button onClick={() => { setActiveTab('REGISTRY'); fetchFlightsState(); }} className="btn-secondary">
                <FolderOpen size={18} />
                Explore Flight Registry
              </button>
            </div>

            {/* Live Stats Row */}
            <div className="hero-stats">
              <div className="hero-stat-item">
                <div className="hero-stat-num">{flights.length}</div>
                <div className="hero-stat-lbl">Total Registered Flights</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <div className="hero-stat-num" style={{ color: 'var(--primary-emerald)' }}>{formatGen(contractBalance)} GEN</div>
                <div className="hero-stat-lbl">Airline ESG Collateral Locked</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <div className="hero-stat-num" style={{ color: 'var(--primary-emerald)' }}>{verifiedCount}</div>
                <div className="hero-stat-lbl">Verified Net-Zero Flights</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <div className="hero-stat-num" style={{ color: 'var(--rose-slash)' }}>{slashedCount}</div>
                <div className="hero-stat-lbl">Greenwashing Slashed Stakes</div>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary-emerald)' }}>
                <Globe size={24} />
              </div>
              <h3 className="feature-title">Telemetry & Offset Corroboration</h3>
              <p className="feature-text">
                GenLayer AI nodes fetch BOTH the flight's Jet-A1 fuel consumption telemetry log and the official retired carbon credit registry URL via <code className="code-tag">gl.nondet.web.render</code>.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--sky-accent)' }}>
                <Cpu size={24} />
              </div>
              <h3 className="feature-title">Aviation ESG Inspector LLM</h3>
              <p className="feature-text">
                AI validators calculate exact flight CO2 emissions and check credit quality (Gold Standard, Verra VCS). Credits covering $\ge$ 90% CO2 grant verification; junk credits trigger 100% stake slash.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--rose-slash)' }}>
                <Flame size={24} />
              </div>
              <h3 className="feature-title">Automatic Public Fund Slash</h3>
              <p className="feature-text">
                If greenwashing is detected, the airline's collateral is 100% slashed via <code className="code-tag">emit_transfer</code> directly to a public climate action fund.
              </p>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="how-it-works-panel">
            <h2 className="section-heading">How AeroGreen Protocol Works</h2>
            <p className="section-sub">A transparent 3-step ESG verification lifecycle for Net-Zero flights</p>

            <div className="steps-container">
              <div className="step-box">
                <div className="step-number">01</div>
                <h4 className="step-title">Register Flight & Lock Stake</h4>
                <p className="step-desc">Airline registers flight code and locks GEN collateral stake in <code className="code-tag">register_flight_esg_stake</code> with telemetry log URL.</p>
              </div>

              <div className="step-box">
                <div className="step-number">02</div>
                <h4 className="step-title">Audit Carbon Credit Certificate</h4>
                <p className="step-desc">Auditor or public submits retired carbon credit URL. AI nodes scrape fuel consumption and offset registry to check emission coverage.</p>
              </div>

              <div className="step-box">
                <div className="step-number">03</div>
                <h4 className="step-title">Verified Badge or Stake Slash</h4>
                <p className="step-desc">Verified Net-Zero flights allow airline collateral recovery. Greenwashed flights suffer 100% collateral slash to a public climate fund.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WORKSPACE TAB: REGISTER or REGISTRY */}
      {activeTab !== 'LANDING' && (
        <main>
          {/* Stats Overview Bar */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-header">
                <span>REGISTERED FLIGHTS</span>
                <Plane size={16} color="var(--primary-emerald)" />
              </div>
              <div className="stat-value">{flights.length}</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>ESG COLLATERAL LOCKED</span>
                <Coins size={16} color="var(--primary-emerald)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--primary-emerald)' }}>
                {formatGen(contractBalance)} GEN
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>VERIFIED NET-ZERO FLIGHTS</span>
                <Award size={16} color="var(--primary-emerald)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--primary-emerald)' }}>{verifiedCount}</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>GREENWASH SLASHED STAKES</span>
                <Flame size={16} color="var(--rose-slash)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--rose-slash)' }}>{slashedCount}</div>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '12px', padding: '16px 20px', color: '#FDA4AF', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} color="var(--rose-slash)" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab 1: REGISTER FLIGHT */}
          {activeTab === 'REGISTER' && (
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div className="glass-panel">
                <div className="panel-title">
                  <Lock size={22} color="var(--primary-emerald)" />
                  Register Net-Zero Flight & Lock ESG Stake
                </div>
                <p className="panel-desc">
                  Lock GEN collateral stake into an ESG guarantee vault and bind the flight code along with the official flight fuel telemetry log URL.
                </p>

                <form onSubmit={handleRegisterFlight}>
                  <div className="form-group">
                    <label className="form-label">FLIGHT CODE / ROUTE REF (e.g., VN-302, AF-118)</label>
                    <input 
                      type="text" 
                      placeholder="VN-302" 
                      value={flightCodeInput}
                      onChange={(e) => setFlightCodeInput(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">FLIGHT FUEL TELEMETRY LOG URL</label>
                    <input 
                      type="text" 
                      placeholder="https://aerogreen.vercel.app/mock_flight_telemetry_log.txt" 
                      value={logUrlInput}
                      onChange={(e) => setLogUrlInput(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ESG COLLATERAL STAKE AMOUNT (GEN)</label>
                    <input 
                      type="number" 
                      step="0.001" 
                      min="0.001"
                      placeholder="10.0" 
                      value={stakeAmountInput}
                      onChange={(e) => setStakeAmountInput(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Locking Airline ESG Collateral Stake...
                      </>
                    ) : (
                      <>
                        <PlusCircle size={18} />
                        Register Flight & Lock Collateral Stake
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 2: FLIGHT REGISTRY */}
          {activeTab === 'REGISTRY' && (
            <div>
              {flights.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <FolderOpen size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px auto' }} />
                  <h3 style={{ fontSize: '18px', color: '#FFF', marginBottom: '8px' }}>No Flight Records Found</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                    Register your first Net-Zero flight route in the "Register Flight" tab.
                  </p>
                  <button onClick={() => setActiveTab('REGISTER')} className="btn-primary" style={{ width: 'auto' }}>
                    Register Net-Zero Flight
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
                  {/* Flight List Sidebar */}
                  <div className="dossier-list">
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '4px', textTransform: 'uppercase' }}>
                      FLIGHT RECORDS ({flights.length})
                    </div>

                    {flights.map((f) => (
                      <div 
                        key={f.id}
                        onClick={() => setSelectedFlightId(f.id)}
                        className={`dossier-item ${Number(selectedFlightId) === Number(f.id) ? 'selected' : ''}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700, color: '#FFF' }}>
                            {f.flight_code} (#{f.id})
                          </span>
                          <span className={`badge ${f.status === 'VERIFIED' || f.status === 'RECOVERED' ? 'badge-verified' : f.status === 'SLASHED' ? 'badge-slashed' : 'badge-registered'}`}>
                            {f.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Airline: {f.airline.slice(0, 6)}...{f.airline.slice(-4)}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-emerald)', marginTop: '4px' }}>
                          {formatGen(f.esg_stake)} GEN STAKE
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Selected Flight Details */}
                  <div>
                    {selectedFlight && (
                      <div className="glass-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>FLIGHT ESG AUDIT RECORD</div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 800, color: '#FFF' }}>
                              Flight {selectedFlight.flight_code} (Ref #{selectedFlight.id})
                            </div>
                          </div>

                          <span className={`badge ${selectedFlight.status === 'VERIFIED' || selectedFlight.status === 'RECOVERED' ? 'badge-verified' : selectedFlight.status === 'SLASHED' ? 'badge-slashed' : 'badge-registered'}`} style={{ fontSize: '14px', padding: '8px 18px' }}>
                            {(selectedFlight.status === 'VERIFIED' || selectedFlight.status === 'RECOVERED') && <Award size={16} />}
                            {selectedFlight.status === 'SLASHED' && <Flame size={16} />}
                            {selectedFlight.status === 'REGISTERED' && <Sparkles size={16} />}
                            {selectedFlight.status}
                          </span>
                        </div>

                        {/* Detail Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                          <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>AIRLINE WALLET</div>
                            <div style={{ fontSize: '12px', color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{selectedFlight.airline.slice(0, 6)}...{selectedFlight.airline.slice(-4)}</div>
                          </div>

                          <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>FLIGHT ROUTE CODE</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{selectedFlight.flight_code}</div>
                          </div>

                          <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ESG COLLATERAL STAKE</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-emerald)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                              {formatGen(selectedFlight.esg_stake)} GEN
                            </div>
                          </div>
                        </div>

                        {/* Flight Telemetry Log URL */}
                        {selectedFlight.log_url && (
                          <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>FLIGHT FUEL TELEMETRY LOG URL</div>
                            <a 
                              href={selectedFlight.log_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ color: 'var(--primary-emerald)', textDecoration: 'none', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)' }}
                            >
                              {selectedFlight.log_url}
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        )}

                        {/* Progress Gauge */}
                        {selectedFlight.audit_score > 0 && (
                          <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                              <span>CARBON OFFSET VERIFICATION RATING</span>
                              <span style={{ color: selectedFlight.is_greenwashed ? 'var(--rose-slash)' : 'var(--primary-emerald)' }}>
                                {selectedFlight.audit_score}% OFFSET INTEGRITY SCORE
                              </span>
                            </div>
                            <div className="progress-bar-track">
                              <div 
                                className={`progress-bar-fill ${selectedFlight.audit_score >= 60 ? 'high' : 'low'}`}
                                style={{ width: `${selectedFlight.audit_score}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Audit Decree Box */}
                        {selectedFlight.audit_reasoning && (
                          <div className={`decree-box ${selectedFlight.status === 'VERIFIED' || selectedFlight.status === 'RECOVERED' ? 'verified' : selectedFlight.status === 'SLASHED' ? 'slashed' : ''}`}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: selectedFlight.status === 'VERIFIED' || selectedFlight.status === 'RECOVERED' ? 'var(--primary-emerald)' : selectedFlight.status === 'SLASHED' ? 'var(--rose-slash)' : 'var(--sky-accent)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <Shield size={16} />
                              LEAD AVIATION ESG INSPECTOR REPORT LOG
                            </div>
                            <div style={{ fontStyle: 'italic', fontSize: '14px', color: '#E2E8F0', lineHeight: '22px' }}>
                              "{selectedFlight.audit_reasoning}"
                            </div>

                            {selectedFlight.carbon_registry_url && (
                              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>RETIRED CARBON CREDIT CERTIFICATE URL:</span>
                                <a 
                                  href={selectedFlight.carbon_registry_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  style={{ color: 'var(--primary-emerald)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  {selectedFlight.carbon_registry_url}
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Form & Airline Actions */}
                        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                          {selectedFlight.status === 'REGISTERED' || selectedFlight.status === 'FAILED' ? (
                            <div>
                              <div style={{ background: 'var(--emerald-dim)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#6EE7B7', marginBottom: '20px' }}>
                                AUDIT CARBON OFFSET // Submit retired carbon credit certificate URL to trigger AI ESG audit. Verified authentic offsets preserve airline collateral. Greenwashed junk credits trigger 100% stake slash to public climate fund.
                              </div>

                              {/* Preset Fill Buttons */}
                              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <button
                                  type="button"
                                  className="preset-btn preset-btn-emerald"
                                  onClick={() => setCarbonRegistryUrlInput('https://aerogreen.vercel.app/mock_valid_carbon_offset.txt')}
                                >
                                  <Award size={14} />
                                  + Fill Valid Offset Certificate (Verify Flight)
                                </button>

                                <button
                                  type="button"
                                  className="preset-btn preset-btn-rose"
                                  onClick={() => setCarbonRegistryUrlInput('https://aerogreen.vercel.app/mock_junk_carbon_offset.txt')}
                                >
                                  <Flame size={14} />
                                  + Fill Junk Offset Certificate (Trigger 100% Slash)
                                </button>
                              </div>

                              <form onSubmit={handleAuditCarbonOffset} style={{ marginBottom: '20px' }}>
                                <div className="form-group">
                                  <label className="form-label">RETIRED CARBON CREDIT CERTIFICATE URL (Verra, Gold Standard Registry)</label>
                                  <input 
                                    type="text" 
                                    placeholder="https://aerogreen.vercel.app/mock_valid_carbon_offset.txt" 
                                    value={carbonRegistryUrlInput || 'https://aerogreen.vercel.app/mock_valid_carbon_offset.txt'}
                                    onChange={(e) => setCarbonRegistryUrlInput(e.target.value)}
                                    className="form-input"
                                    required
                                  />
                                </div>

                                <button type="submit" className="btn-primary" disabled={loading}>
                                  {loading ? (
                                    <>
                                      <RefreshCw size={18} className="animate-spin" />
                                      Auditing Carbon Credit Integrity via GenLayer AI...
                                    </>
                                  ) : (
                                    <>
                                      <Shield size={18} />
                                      Audit Flight Carbon Offset
                                    </>
                                  )}
                                </button>
                              </form>

                              {/* Airline Recover Stake Button */}
                              {address.toLowerCase() === selectedFlight.airline.toLowerCase() && selectedFlight.status === 'VERIFIED' && Number(selectedFlight.esg_stake) > 0 && (
                                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    STAKE RECOVERY: Verified Net-Zero flight. Airline is eligible to recover collateral stake.
                                  </div>
                                  <button 
                                    onClick={handleRecoverStake} 
                                    className="preset-btn preset-btn-emerald"
                                    style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px' }}
                                    disabled={loading}
                                  >
                                    <CheckCircle2 size={16} />
                                    Recover ESG Collateral Stake to Airline Wallet
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : selectedFlight.status === 'VERIFIED' ? (
                            <div>
                              <div style={{ background: '#0D131F', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--primary-emerald)', textAlign: 'center', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                                Authentic Carbon Offset Verified! Flight is Certified Net-Zero.
                              </div>
                              {address.toLowerCase() === selectedFlight.airline.toLowerCase() && Number(selectedFlight.esg_stake) > 0 && (
                                <button 
                                  onClick={handleRecoverStake} 
                                  className="btn-primary"
                                  style={{ padding: '12px', fontSize: '14px' }}
                                  disabled={loading}
                                >
                                  <CheckCircle2 size={16} />
                                  Recover ESG Collateral Stake to Airline Wallet
                                </button>
                              )}
                            </div>
                          ) : selectedFlight.status === 'RECOVERED' ? (
                            <div style={{ background: '#0D131F', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--primary-emerald)', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                              Verified Net-Zero Flight. Airline Collateral Stake Successfully Recovered.
                            </div>
                          ) : (
                            <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.3)', color: 'var(--rose-slash)', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                              Greenwashing Fraud Detected! Airline ESG Collateral Stake 100% Slashed to Public Climate Action Fund.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
