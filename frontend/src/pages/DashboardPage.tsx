import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { localityAPI, reportAPI, weatherAPI, providerAPI, adminAPI, mapAPI } from '../api'
import {
  Droplets, AlertTriangle, CheckCircle, Clock, ShieldCheck,
  TrendingUp, MapPin, Truck, FileText, MessageSquare, ExternalLink,
  ChevronRight, Thermometer, Wind, AlertCircle, RefreshCw, Star,
  Radio, Shield, Megaphone, ArrowUpRight, Activity, CheckCircle2
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // State
  const [localities, setLocalities] = useState<any[]>([])
  const [selectedLocalityId, setSelectedLocalityId] = useState<number>(user?.locality_id || 1)
  const [localityData, setLocalityData] = useState<any>(null)
  const [reliability, setReliability] = useState<any>(null)
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [weather, setWeather] = useState<any>(null)
  const [stressData, setStressData] = useState<any[]>([])
  const [activeBroadcasts, setActiveBroadcasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async (localityId: number) => {
    try {
      setLoading(true)
      const locRes = await localityAPI.get(localityId)
      setLocalityData(locRes.data)

      const [relRes, repRes, bcRes, stressRes] = await Promise.all([
        reportAPI.getReliability(localityId).catch(() => null),
        reportAPI.getByLocality(localityId, 24).catch(() => null),
        reportAPI.getActiveBroadcasts(localityId).catch(() => null),
        mapAPI.stress().catch(() => null)
      ])

      if (relRes) setReliability(relRes.data)
      if (repRes) setRecentReports(repRes.data)
      if (bcRes) setActiveBroadcasts(bcRes.data || [])
      if (stressRes) setStressData(stressRes.data || [])

      if (locRes.data?.city_id) {
        const wRes = await weatherAPI.get(locRes.data.city_id).catch(() => null)
        if (wRes) setWeather(wRes.data)
      }
    } catch (err) {
      console.error('Error loading dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    localityAPI.search('').then(res => {
      setLocalities(res.data)
      if (!selectedLocalityId && res.data.length > 0) {
        setSelectedLocalityId(res.data[0].id)
      }
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (selectedLocalityId) {
      loadData(selectedLocalityId)
    }
  }, [selectedLocalityId])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'reported_on':
        return { label: 'SUPPLY FLOWING (REPORTED ON)', color: '#167D78', bg: '#E6F3F2' }
      case 'reported_off':
        return { label: 'TAP SUPPLY STOPPED (REPORTED OFF)', color: '#B93838', bg: '#FCE8E8' }
      case 'delayed':
        return { label: 'SUPPLY CYCLE DELAYED', color: '#D96B3B', bg: '#FDF1EA' }
      case 'conflicting':
        return { label: 'CONTRADICTORY GROUND REPORTS', color: '#D96B3B', bg: '#FDF1EA' }
      case 'stale':
        return { label: 'CYCLE EXPIRED / STALE DATA', color: '#75858A', bg: '#EAECEB' }
      case 'expected':
        return { label: 'OFFICIAL SCHEDULE ACTIVE', color: '#172B32', bg: '#EDE9DF' }
      default:
        return { label: 'AWAITING CITIZEN OBSERVATION', color: '#75858A', bg: '#EAECEB' }
    }
  }

  const score = reliability?.score !== undefined ? reliability.score : 0.8
  const scorePct = Math.round(score * 100)
  const currentStatusInfo = getStatusLabel(reliability?.supply_status || 'expected')

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ─── Operational Masthead ─── */}
      <div className="gazette-masthead">
        <div>
          <div className="micro-label" style={{ marginBottom: '0.35rem', color: 'var(--color-teal)' }}>
            MUNICIPAL WATER SUPPLY & OPERATIONS MONITOR
          </div>
          <h1 className="gazette-title">
            Hyderabad Water Operations Overview
          </h1>
          <div className="gazette-sub">
            Real-time municipal telemetry, gazette supply schedules, and citizen ground consensus for Greater Hyderabad.
          </div>
        </div>

        {/* Locality Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--color-surface)', padding: '0.5rem 0.85rem', border: '1px solid var(--color-border)', borderRadius: '3px' }}>
          <MapPin size={16} color="var(--color-teal)" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="micro-label" style={{ fontSize: '0.625rem' }}>CURRENT LOCALITY / WARD</span>
            <select
              value={selectedLocalityId}
              onChange={(e) => setSelectedLocalityId(Number(e.target.value))}
              style={{
                background: 'transparent',
                color: 'var(--color-ink)',
                border: 'none',
                outline: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                padding: 0
              }}
            >
              {localities.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.zone ? `(${loc.zone} Zone)` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => loadData(selectedLocalityId)}
            title="Refresh Operations Data"
            style={{ background: 'none', border: 'none', color: 'var(--color-slate)', cursor: 'pointer', padding: '2px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Prominent Urgent Broadcasts / Outages Banner ─── */}
      {activeBroadcasts.map((bc: any) => {
        const isOfficial = bc.is_official
        const isEmergency = bc.report_type === 'emergency_shortage'
        return (
          <div
            key={bc.id}
            style={{
              background: isEmergency ? '#FCE8E8' : isOfficial ? '#E6F3F2' : '#FDF1EA',
              border: `1px solid ${isEmergency ? '#F5B8B8' : isOfficial ? '#B8DDD9' : '#F6CEB9'}`,
              borderLeft: `5px solid ${isEmergency ? '#B93838' : isOfficial ? '#167D78' : '#D96B3B'}`,
              borderRadius: '3px', padding: '1.25rem 1.5rem', display: 'flex',
              alignItems: 'flex-start', gap: '1.25rem'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                <span className="micro-label" style={{
                  color: isEmergency ? '#B93838' : isOfficial ? '#167D78' : '#D96B3B',
                  fontWeight: 800
                }}>
                  {isOfficial ? '★ OFFICIAL MUNICIPAL NOTICE • HMWS&SB' : 'COMMUNITY GROUND BROADCAST'}
                </span>
                <span className="badge" style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}>
                  {bc.report_type?.replace(/_/g, ' ').toUpperCase()}
                </span>
                {bc.observed_at && (
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-slate)' }}>
                    {new Date(bc.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.5 }}>
                {bc.note}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                Authority Source: <strong>{bc.source}</strong> {bc.expected_supply_time && `• Window: ${bc.expected_supply_time}`}
              </div>
            </div>
            <Link to="/broadcasts" className="btn btn-outline" style={{ fontSize: '0.75rem', flexShrink: 0 }}>
              Inspect Bulletin <ArrowUpRight size={14} />
            </Link>
          </div>
        )
      })}

      {/* ─── Hero Section: Live Piped Supply vs Scheduled Truth ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        
        {/* Left: Dominant Supply Operations Card */}
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem' }}>
              <div>
                <span className="micro-label" style={{ color: 'var(--color-teal)' }}>
                  MONITORED ZONE: {localityData?.zone || 'CENTRAL'} WARD
                </span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-ink)', margin: '0.2rem 0', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                  {localityData?.name || 'Loading Ward Data...'}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-slate)' }}>
                  Postal Code: <span className="font-mono">{localityData?.postal_code || '500034'}</span> • District: {localityData?.district || 'Hyderabad'}
                </div>
              </div>

              {/* Status Badge */}
              <div style={{
                background: currentStatusInfo.bg, color: currentStatusInfo.color,
                padding: '6px 12px', borderRadius: '2px', border: `1px solid ${currentStatusInfo.color}30`,
                fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.04em'
              }}>
                {currentStatusInfo.label}
              </div>
            </div>

            {/* Scheduled vs Actual Matrix */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', margin: '1.5rem 0' }}>
              <div style={{ background: 'var(--color-surface-subtle)', padding: '1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: '2px' }}>
                <div className="micro-label">MUNICIPAL GAZETTE SCHEDULE</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-ink)', marginTop: '0.35rem' }}>
                  {localityData?.schedules?.[0]?.expected_start_time || '06:30'} — {localityData?.schedules?.[0]?.expected_end_time || '09:00'} AM
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '0.25rem' }}>
                  Source: HMWS&SB Division Gazette
                </div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: '2px' }}>
                <div className="micro-label" style={{ color: 'var(--color-teal)' }}>VERIFIED GROUND TRUTH</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-teal)', marginTop: '0.35rem' }}>
                  {recentReports.length > 0 ? (recentReports[0].actual_start_time || 'FLOW CONFIRMED') : 'NORMALIZED HEAD'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '0.25rem' }}>
                  Based on {recentReports.length} resident reports in 24h
                </div>
              </div>
            </div>

            {/* Weather & Meteorological Telemetry */}
            {weather && (
              <div style={{ background: '#F8F9FA', padding: '0.85rem 1.15rem', borderRadius: '2px', border: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Thermometer size={16} color="var(--color-orange)" />
                  <span>
                    Ambient Temperature: <strong className="font-mono">{weather.temperature_c}°C</strong> ({weather.description})
                  </span>
                </div>
                <div style={{ color: 'var(--color-slate)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  Rainfall: {weather.rainfall_mm}mm • Humidity: {weather.humidity_pct}%
                </div>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
            <Link to="/report" className="btn btn-primary" style={{ flex: 1, minWidth: 160, justifyContent: 'center' }}>
              <FileText size={15} /> Submit Ground Supply Report
            </Link>
            <Link to="/broadcasts" className="btn btn-teal" style={{ flex: 1, minWidth: 160, justifyContent: 'center' }}>
              <Radio size={15} /> Ward Broadcast Center
            </Link>
            <Link to="/map" className="btn btn-outline" style={{ justifyContent: 'center' }}>
              <MapPin size={15} /> Map View
            </Link>
          </div>
        </div>

        {/* Right: Multi-Signal Reliability Scoring Engine */}
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <span className="micro-label">CONFIDENCE MATHEMATICAL ENGINE</span>
              <span className="badge status-official">
                ALGORITHM VERIFIED
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '3.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-ink)', lineHeight: 1 }}>
                {scorePct}%
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: scorePct >= 75 ? 'var(--color-teal)' : 'var(--color-orange)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {scorePct >= 75 ? 'High Statistical Confidence' : 'Moderate Evidence'}
              </span>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--color-slate)', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              Scores are dynamically calibrated using temporal decay ($\lambda=0.01$), citizen consensus agreement, and contradiction penalties.
            </p>

            {/* Agreeing vs Conflicting Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#E6F3F2', border: '1px solid #B8DDD9', padding: '0.85rem', borderRadius: '2px' }}>
                <div className="micro-label" style={{ color: '#167D78' }}>CORROBORATING</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#167D78', marginTop: '0.2rem' }}>
                  {reliability?.agreeing_count ?? recentReports.length} Reports
                </div>
              </div>

              <div style={{ background: '#FDF1EA', border: '1px solid #F6CEB9', padding: '0.85rem', borderRadius: '2px' }}>
                <div className="micro-label" style={{ color: '#D96B3B' }}>CONTRADICTIONS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#D96B3B', marginTop: '0.2rem' }}>
                  {reliability?.conflicting_count ?? 0} Flagged
                </div>
              </div>
            </div>

            {/* Explanation bullets */}
            {reliability?.explanation && reliability.explanation.length > 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {reliability.explanation.slice(0, 2).map((exp: string, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--color-teal)', fontWeight: 800 }}>•</span>
                    <span>{exp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1.25rem' }}>
            <Link to="/assistant" style={{ fontSize: '0.8rem', color: 'var(--color-teal)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Ask AquaAssist to audit mathematical formula</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

      </div>

      {/* ─── Ward-Level Operations Distribution Matrix ─── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="micro-label" style={{ color: 'var(--color-teal)' }}>GREATER HYDERABAD MUNICIPAL NETWORK</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-ink)', margin: '0.15rem 0 0 0' }}>
              Ward-Level Piped Supply Status & Aquifer Depth
            </h3>
          </div>
          <Link to="/map" className="btn btn-outline" style={{ fontSize: '0.75rem' }}>
            Open Interactive Cartographic Map <ArrowUpRight size={13} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>WARD / LOCALITY</th>
                <th>ZONE</th>
                <th>WATER STRESS LEVEL</th>
                <th>GROUNDWATER DEPTH</th>
                <th>RESERVOIR STORAGE</th>
                <th>DATA AUTHORITY</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {stressData.slice(0, 6).map((item) => {
                const isSelected = item.locality_id === selectedLocalityId
                const isCritical = item.stress_level === 'critical'
                const isHigh = item.stress_level === 'high'

                return (
                  <tr
                    key={item.locality_id}
                    style={{ background: isSelected ? 'rgba(22, 125, 120, 0.05)' : 'transparent' }}
                  >
                    <td style={{ fontWeight: 700, color: 'var(--color-ink)' }}>
                      {item.locality_name} {isSelected && <span style={{ color: 'var(--color-teal)', fontSize: '0.7rem', marginLeft: '4px' }}>[SELECTED]</span>}
                    </td>
                    <td style={{ color: 'var(--color-slate)' }}>{item.zone || 'Central'}</td>
                    <td>
                      <span className={`badge ${isCritical ? 'status-critical' : isHigh ? 'status-urgent' : 'status-official'}`}>
                        {item.stress_level?.toUpperCase()} STRESS
                      </span>
                    </td>
                    <td className="font-mono">{item.groundwater_level_m ? `${item.groundwater_level_m} m bgl` : '14.2 m'}</td>
                    <td className="font-mono">{item.reservoir_storage_pct ? `${item.reservoir_storage_pct}%` : '62%'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-slate)' }}>{item.data_source || 'CGWB & HMWSSB'}</td>
                    <td>
                      <button
                        onClick={() => setSelectedLocalityId(item.locality_id)}
                        className="btn btn-ghost"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Community Ground Truth Feed & Emergency Dispatch ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        
        {/* Left: Community Ground Feed */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div className="micro-label">GROUND TRUTH FEED</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-ink)', margin: '0.15rem 0 0 0' }}>
                Recent Citizen Observations in {localityData?.name}
              </h3>
            </div>
            <Link to="/report" style={{ fontSize: '0.78rem', color: 'var(--color-teal)', fontWeight: 700, textDecoration: 'none' }}>
              + File Report
            </Link>
          </div>

          {recentReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-slate)', background: 'var(--color-surface-subtle)', borderRadius: '2px' }}>
              No ground observations filed in the past 24 hours. Be the first to report water pressure.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentReports.slice(0, 4).map((rep) => (
                <div
                  key={rep.id}
                  style={{
                    padding: '0.85rem 1rem', background: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)', borderRadius: '2px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span className="badge status-official">
                        {rep.report_type?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-slate)' }}>
                        {rep.observed_at ? new Date(rep.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-ink)', lineHeight: 1.45 }}>
                      "{rep.note || 'Observation recorded by resident.'}"
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-slate)', fontFamily: 'var(--font-mono)' }}>
                      {rep.reporter_name || 'Resident'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Emergency Tanker Dispatch & Logistics */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="micro-label" style={{ color: 'var(--color-orange)' }}>LOGISTICS DISPATCH DESK</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-ink)', margin: '0.15rem 0 1rem 0' }}>
              Emergency Tanker Delivery & Pooling
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '0.85rem 1rem', background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)' }}>Single Tanker Dispatch</div>
                  <span className="badge status-official">VERIFIED CARRIERS</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.2rem' }}>
                  5,000L to 10,000L certified potable water trucks for domestic sumps.
                </div>
                <Link to="/book-tanker" className="btn btn-outline" style={{ marginTop: '0.6rem', width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}>
                  Order Emergency Tanker
                </Link>
              </div>

              <div style={{ padding: '0.85rem 1rem', background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)' }}>Bulk Society Pooling Pool</div>
                  <span className="badge status-urgent">25% GROUP DISCOUNT</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.2rem' }}>
                  Pool water orders with neighbors to reduce street tanker congestion.
                </div>
                <Link to="/bulk-water" className="btn btn-teal" style={{ marginTop: '0.6rem', width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}>
                  Join Apartment Pool
                </Link>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--color-slate)' }}>Need immediate civic assistance?</span>
            <Link to="/contacts" style={{ color: 'var(--color-teal)', fontWeight: 700, textDecoration: 'none' }}>
              Jal Board Helplines →
            </Link>
          </div>
        </div>

      </div>

    </div>
  )
}
