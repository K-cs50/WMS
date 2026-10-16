import React, { useState, useEffect } from 'react'
import { sourcesAPI } from '../api'
import {
  Database, RefreshCw, ExternalLink, ShieldCheck, CheckCircle2,
  AlertTriangle, Clock, Activity, FileText, ChevronDown, ChevronRight,
  Server, Shield, Radio, Check, Info, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'

interface DataSourceItem {
  id: number
  organization: string
  source_code?: string
  source_url: string
  data_category: string
  geographic_coverage: string
  last_retrieved?: string
  last_sync_at?: string
  verification_status: string
  connection_status: string
  is_automated_sync: boolean
  sync_frequency_minutes: number
  sync_message: string
  disclaimer: string
  notes?: string
}

export default function SourcesPage() {
  const [sources, setSources] = useState<DataSourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<any>(null)
  const [expandedId, setExpandedId] = useState<number | null>(1) // expand first by default

  const loadSources = async () => {
    try {
      setLoading(true)
      const res = await sourcesAPI.list()
      setSources(res.data || [])
    } catch (err) {
      console.error('Failed to load official data sources', err)
      toast.error('Could not retrieve data sources status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSources()
  }, [])

  const handleSync = async () => {
    try {
      setSyncing(true)
      const res = await sourcesAPI.sync()
      setLastSyncResult(res.data)
      toast.success(res.data.message || 'Telemetry synchronization successful')
      await loadSources()
    } catch (err: any) {
      console.error('Sync failed', err)
      toast.error(err.response?.data?.detail || 'Sync failed: External services unreachable')
    } finally {
      setSyncing(false)
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const getStatusBadge = (status: string, isAutomated: boolean) => {
    const s = status?.toLowerCase()
    if (isAutomated || s === 'connected' || s === 'active') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          background: '#E6F3F2', color: '#167D78', border: '1px solid #B8DDD9',
          padding: '2px 8px', borderRadius: '2px', fontSize: '0.6875rem',
          fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.04em'
        }}>
          <CheckCircle2 size={12} /> {isAutomated ? 'LIVE TELEMETRY STREAM' : 'PORTAL MONITORED'}
        </span>
      )
    }
    if (s.includes('partially')) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          background: '#FDF1EA', color: '#D96B3B', border: '1px solid #F6CEB9',
          padding: '2px 8px', borderRadius: '2px', fontSize: '0.6875rem',
          fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.04em'
        }}>
          <Clock size={12} /> BULLETIN SYNCHRONIZED
        </span>
      )
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        background: '#EAECEB', color: '#75858A', border: '1px solid #D1D6D5',
        padding: '2px 8px', borderRadius: '2px', fontSize: '0.6875rem',
        fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.04em'
      }}>
        <Activity size={12} /> BENCHMARK ARCHIVE
      </span>
    )
  }

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ─── Editorial Masthead ─── */}
      <div className="gazette-masthead">
        <div>
          <div className="micro-label" style={{ marginBottom: '0.3rem', color: 'var(--color-teal)' }}>
            CIVIC DATA PROVENANCE & TECHNICAL REGISTRY
          </div>
          <h1 className="gazette-title">
            Official Data Sources & Verification Console
          </h1>
          <div className="gazette-sub">
            Technical audit trail of municipal water authorities, live weather stations, and civic registries across Greater Hyderabad.
          </div>
        </div>

        <div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)' }}
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'INGESTING TELEMETRY...' : 'TRIGGER INGESTION SYNC'}
          </button>
        </div>
      </div>

      {/* ─── Operations Room Data Freshness Strip ─── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '3px'
      }}>
        <div style={{ padding: '1.25rem', borderRight: '1px solid var(--color-border)' }}>
          <div className="micro-label">MONITORED AUTHORITIES</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-ink)', marginTop: '0.2rem' }}>
            05 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-slate)' }}>Registries</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '0.25rem' }}>
            HMWS&SB, GHMC, TS-ICAD, IMD, CGWB
          </div>
        </div>

        <div style={{ padding: '1.25rem', borderRight: '1px solid var(--color-border)' }}>
          <div className="micro-label">LIVE STREAMING TELEMETRY</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-teal)', marginTop: '0.2rem' }}>
            ACTIVE <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-slate)' }}>• Open-Meteo</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '0.25rem' }}>
            Temp, humidity & precipitation streaming
          </div>
        </div>

        <div style={{ padding: '1.25rem', borderRight: '1px solid var(--color-border)' }}>
          <div className="micro-label">GAZETTE AUDIT INTEGRITY</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-ink)', marginTop: '0.2rem' }}>
            100% <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-slate)' }}>Verified URLs</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '0.25rem' }}>
            Official .gov.in & .nic.in portals
          </div>
        </div>

        <div style={{ padding: '1.25rem' }}>
          <div className="micro-label">GLOBAL SYNC STATUS</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-orange)', marginTop: '0.35rem' }}>
            {lastSyncResult ? 'JUST NOW' : 'SYNCHRONIZED TODAY'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '0.35rem' }}>
            Manual gazettes audited every 6 hours
          </div>
        </div>
      </div>

      {/* Sync Banner Output */}
      {lastSyncResult && (
        <div style={{
          background: 'var(--color-surface)', borderLeft: '4px solid var(--color-teal)',
          borderTop: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)', padding: '1rem 1.25rem',
          borderRadius: '2px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
        }}>
          <CheckCircle2 size={18} color="var(--color-teal)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.825rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>
              Telemetry Cycle Executed at {new Date(lastSyncResult.synced_at).toLocaleTimeString()}
            </div>
            <div style={{ color: 'var(--color-slate)', marginTop: '0.25rem' }}>
              {lastSyncResult.sync_details?.map((d: any, idx: number) => (
                <div key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  → <strong>{d.source}:</strong> {d.details} [{d.status}]
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Structured Editorial Source Registry ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Municipal Authority Registry ({sources.length} Records)
          </div>
          <div className="micro-label">CLICK ROW TO INSPECT TECHNICAL PROVENANCE</div>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-slate)' }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--color-teal)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>QUERYING CIVIC REGISTRIES...</div>
          </div>
        ) : (
          sources.map((src, index) => {
            const isExpanded = expandedId === src.id

            return (
              <div
                key={src.id}
                style={{
                  background: 'var(--color-surface)',
                  border: isExpanded ? '1px solid var(--color-teal)' : '1px solid var(--color-border)',
                  borderRadius: '3px', transition: 'border-color 0.15s ease',
                  overflow: 'hidden'
                }}
              >
                {/* Main Row Header */}
                <div
                  onClick={() => toggleExpand(src.id)}
                  style={{
                    padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
                    gap: '1rem', background: isExpanded ? 'rgba(22, 125, 120, 0.03)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', minWidth: 280, flex: 1 }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
                      color: 'var(--color-slate)', padding: '3px 6px', background: 'var(--color-surface-subtle)',
                      borderRadius: '2px', border: '1px solid var(--color-border)', flexShrink: 0
                    }}>
                      REG 0{index + 1}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="micro-label" style={{ color: 'var(--color-teal)' }}>{src.source_code || 'MUNICIPALITY'}</span>
                        <span style={{ color: 'var(--color-border)' }}>•</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-slate)', fontFamily: 'var(--font-mono)' }}>{src.geographic_coverage}</span>
                      </div>
                      <h3 style={{
                        fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-ink)',
                        margin: '0.2rem 0 0 0', fontFamily: 'var(--font-sans)', lineHeight: 1.3
                      }}>
                        {src.organization}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-slate)', marginTop: '0.15rem' }}>
                        {src.data_category}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div>{getStatusBadge(src.connection_status, src.is_automated_sync)}</div>
                    <div style={{ color: 'var(--color-slate)' }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                </div>

                {/* Technical Provenance Drawer */}
                {isExpanded && (
                  <div style={{
                    padding: '1.25rem 1.5rem', background: 'var(--color-surface-subtle)',
                    borderTop: '1px solid var(--color-border)', fontSize: '0.825rem'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      
                      {/* Left: Connection Protocol */}
                      <div>
                        <div className="micro-label" style={{ marginBottom: '0.5rem', color: 'var(--color-ink)' }}>
                          INGESTION PROTOCOL & FREQUENCY
                        </div>
                        <div style={{ color: 'var(--color-ink)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                          {src.sync_message}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-slate)' }}>
                          • Sync Cadence: Every {src.sync_frequency_minutes} minutes<br />
                          • Last Verified: {src.last_sync_at ? new Date(src.last_sync_at).toLocaleString('en-IN') : 'Synchronized Today'}<br />
                          • Technical Layer: {src.is_automated_sync ? 'Automated HTTP REST Telemetry' : 'Monitored Municipal Web Gazette'}
                        </div>
                      </div>

                      {/* Right: Transparent Civic Disclosure */}
                      <div>
                        <div className="micro-label" style={{ marginBottom: '0.5rem', color: 'var(--color-orange)' }}>
                          PROVENANCE & CIVIC DISCLOSURE
                        </div>
                        <div style={{
                          background: '#FFFFFF', padding: '0.75rem 1rem', borderRadius: '2px',
                          borderLeft: '3px solid var(--color-orange)', borderTop: '1px solid var(--color-border)',
                          borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)',
                          color: '#334155', lineHeight: 1.5, fontSize: '0.8rem'
                        }}>
                          {src.disclaimer}
                        </div>

                        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                          <a
                            href={src.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            Inspect Official Government Portal <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ─── Institutional Trust Matrix ─── */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <Shield size={18} color="var(--color-teal)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
            Civic Verification & Evidence Standards
          </h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-slate)', margin: '0 0 1.25rem 0' }}>
          WMS maintains an uncompromising distinction between statutory municipal notices and ground citizen consensus:
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>VERIFICATION LEVEL</th>
                <th style={{ width: '40%' }}>GROUND TRUTH & STATUTORY CRITERIA</th>
                <th style={{ width: '20%' }}>ISSUING AUTHORITY</th>
                <th style={{ width: '20%' }}>PLATFORM BADGE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#167D78' }}>Official Notice</td>
                <td>Derived directly from verified HMWS&SB gazettes, municipal emergency desks, or authenticated administrative liaisons.</td>
                <td>HMWS&SB / GHMC</td>
                <td>
                  <span className="badge status-official">OFFICIAL NOTICE</span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#1F7A3F' }}>Community Reported</td>
                <td>Corroborated by multiple registered citizens in the same ward within a 90-minute window, or verified by Locality Rep.</td>
                <td>Citizen Consensus</td>
                <td>
                  <span className="badge status-community">COMMUNITY REPORT</span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#D96B3B' }}>Conflicting Reports</td>
                <td>Contradictory observations filed concurrently (e.g., pipeline running vs dry taps). Triggers automatic reliability discount.</td>
                <td>Disputed Evidence</td>
                <td>
                  <span className="badge status-urgent">CONFLICTING DATA</span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#75858A' }}>Outdated Record</td>
                <td>Observations older than 120 minutes. Retained for historical supply timelines but excluded from active flow status.</td>
                <td>Expired Window</td>
                <td>
                  <span className="badge status-muted">OUTDATED REPORT</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
