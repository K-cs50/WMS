import React, { useState, useEffect } from 'react'
import { adminAPI } from '../api'
import {
  Shield, Users, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Check, Flag, FileText, Activity
} from 'lucide-react'

export default function AdminManagementPage() {
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'providers'>('reports')
  const [stats, setStats] = useState<any>(null)
  const [pendingReports, setPendingReports] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const loadAll = async () => {
    setLoading(true)
    try {
      const [sRes, prRes, uRes] = await Promise.all([
        adminAPI.stats().catch(() => ({ data: null })),
        adminAPI.pendingReports().catch(() => ({ data: [] })),
        adminAPI.users().catch(() => ({ data: [] })),
      ])
      setStats(sRes.data)
      setPendingReports(prRes.data)
      setUsers(uRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleModerateReport = async (id: number, action: string) => {
    try {
      await adminAPI.moderateReport(id, action, 'Moderated by administrator')
      setMsg(`Report #${id} marked as ${action}`)
      loadAll()
      setTimeout(() => setMsg(''), 4000)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Moderation failed')
    }
  }

  const handleToggleUser = async (id: number) => {
    try {
      await adminAPI.toggleUser(id)
      setMsg(`User #${id} status toggled`)
      loadAll()
      setTimeout(() => setMsg(''), 4000)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Action failed')
    }
  }

  const handleVerifyProvider = async (id: number) => {
    try {
      await adminAPI.verifyProvider(id)
      setMsg(`Provider #${id} officially verified`)
      loadAll()
      setTimeout(() => setMsg(''), 4000)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Verification failed')
    }
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Gazette Masthead */}
      <div className="gazette-masthead">
        <div>
          <div className="micro-label" style={{ color: 'var(--color-orange)' }}>
            MUNICIPAL ADMINISTRATION // MODERATION AUTHORITY
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--color-ink)' }}>
            System Governance &amp; Moderation
          </h1>
          <p style={{ margin: 0, color: 'var(--color-slate)', fontSize: '0.9rem' }}>
            Audit community ground reports, verify private tanker operators, and supervise citizen accounts.
          </p>
        </div>

        <button onClick={loadAll} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
        </button>
      </div>

      {/* Action feedback */}
      {msg && (
        <div style={{ background: '#FAF8F5', borderLeft: '4px solid var(--color-teal)', color: 'var(--color-teal)', padding: '0.85rem 1.15rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> {msg}
        </div>
      )}

      {/* Stats KPI strip */}
      {(stats || users.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="micro-label">REGISTERED CITIZENS</div>
            <div className="tabular-num" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-ink)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              {stats?.total_users ?? users.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.1rem' }}>Active user accounts</div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="micro-label" style={{ color: 'var(--color-teal)' }}>VERIFIED PROVIDERS</div>
            <div className="tabular-num" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-teal)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              {stats?.verified_providers ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.1rem' }}>HMWSSB certified carriers</div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="micro-label" style={{ color: '#1E6FBF' }}>REPORTS TODAY</div>
            <div className="tabular-num" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1E6FBF', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              {stats?.reports_today ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.1rem' }}>Ground observations filed</div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="micro-label" style={{ color: 'var(--color-red)' }}>PENDING MODERATION</div>
            <div className="tabular-num" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-red)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              {pendingReports.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.1rem' }}>Awaiting review</div>
          </div>
        </div>
      )}

      {/* Segment Tabs */}
      <div style={{ display: 'flex', border: '1px solid var(--color-border)', background: '#FFFFFF', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '0.55rem 1.1rem', fontSize: '0.82rem', fontWeight: 600,
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
            background: activeTab === 'reports' ? 'var(--color-ink)' : 'transparent',
            color: activeTab === 'reports' ? '#FFFFFF' : 'var(--color-ink)',
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em'
          }}
        >
          <Activity size={14} /> Reports ({pendingReports.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '0.55rem 1.1rem', fontSize: '0.82rem', fontWeight: 600,
            border: 'none', borderLeft: '1px solid var(--color-border)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            background: activeTab === 'users' ? 'var(--color-ink)' : 'transparent',
            color: activeTab === 'users' ? '#FFFFFF' : 'var(--color-ink)',
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em'
          }}
        >
          <Users size={14} /> Citizen Directory ({users.length})
        </button>
      </div>

      {activeTab === 'reports' ? (
        <div className="card">
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="micro-label" style={{ color: 'var(--color-orange)' }}>GROUND REPORT MODERATION QUEUE</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--color-ink)' }}>
              Pending Reports ({pendingReports.length})
            </h2>
          </div>

          {pendingReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-slate)', background: '#FAF8F5' }}>
              <CheckCircle size={36} color="var(--color-teal)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-ink)', fontWeight: 600 }}>
                Moderation Queue Clear
              </div>
              <p style={{ fontSize: '0.85rem', margin: '0.5rem auto 0' }}>No pending ground reports require review.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pendingReports.map((rep, idx) => (
                <div
                  key={rep.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    flexWrap: 'wrap', gap: '1rem', padding: '1.15rem 0',
                    borderBottom: idx < pendingReports.length - 1 ? '1px solid var(--color-border)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                        {rep.locality_name || `Locality #${rep.locality_id}`}
                      </span>
                      <span className="status-badge badge-warning">
                        {rep.report_type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-ink)', marginBottom: '0.2rem' }}>
                      {rep.note ? `"${rep.note}"` : 'No additional comments provided.'}
                    </div>
                    <div className="micro-label" style={{ color: 'var(--color-slate)', margin: 0 }}>
                      Filed by {rep.reporter_name || 'Resident'} •{' '}
                      {rep.observed_at ? new Date(rep.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      onClick={() => handleModerateReport(rep.id, 'verify')}
                      className="btn btn-teal"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
                    >
                      <Check size={13} /> Verify
                    </button>
                    <button
                      onClick={() => handleModerateReport(rep.id, 'flag')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', color: 'var(--color-orange)', borderColor: '#F6CEB9' }}
                    >
                      <Flag size={13} /> Flag
                    </button>
                    <button
                      onClick={() => handleModerateReport(rep.id, 'reject')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', color: 'var(--color-red)', borderColor: '#F5B8B8' }}
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Citizens Directory */
        <div className="card">
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="micro-label" style={{ color: 'var(--color-teal)' }}>CITIZEN ACCOUNT REGISTRY</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--color-ink)' }}>
              Registered Users ({users.length})
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>CONTACT</th>
                  <th>ROLE</th>
                  <th>JURISDICTION</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700, color: 'var(--color-ink)' }}>
                      {u.full_name}
                    </td>
                    <td style={{ color: 'var(--color-slate)' }}>
                      <div style={{ fontSize: '0.82rem' }}>{u.email}</div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{u.phone || '—'}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${
                        u.role === 'admin' ? 'badge-stale' :
                        u.role === 'provider' ? 'badge-info' : 'badge-disabled'
                      }`}>
                        {u.role?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-slate)', fontSize: '0.82rem' }}>
                      {u.locality_name || `Ward #${u.locality_id || '—'}`}
                    </td>
                    <td>
                      <span className={`status-badge ${u.is_active ? 'badge-verified' : 'badge-danger'}`}>
                        {u.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleUser(u.id)}
                        className="btn btn-ghost"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
