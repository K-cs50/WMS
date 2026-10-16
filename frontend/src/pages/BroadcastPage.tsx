import React, { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { localityAPI, reportAPI } from '../api'
import {
  Radio, Shield, AlertTriangle, Megaphone, Send, CheckCircle2, Clock,
  AlertCircle, ExternalLink, Droplets, Info, Filter, ArrowUpRight,
  Check, Lock, Building, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'

const REPORT_TYPES = [
  { value: 'supply_started', label: 'Water Supply Started', code: 'W-01' },
  { value: 'supply_stopped', label: 'Water Supply Stopped', code: 'W-02' },
  { value: 'supply_delayed', label: 'Supply Cycle Delayed', code: 'W-03' },
  { value: 'no_supply', label: 'No Piped Supply / Outage', code: 'W-04' },
  { value: 'low_pressure', label: 'Low Terminal Pressure', code: 'W-05' },
  { value: 'emergency_shortage', label: 'Emergency Water Shortage', code: 'W-06' },
  { value: 'tanker_availability', label: 'Tanker Dispatch Active', code: 'W-07' },
]

export default function BroadcastPage() {
  const { user } = useAuth()
  const [localities, setLocalities] = useState<any[]>([])
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'feed' | 'create'>('feed')

  // Form state
  const [localityId, setLocalityId] = useState<number>(user?.locality_id || 1)
  const [affectedLocalities, setAffectedLocalities] = useState<number[]>([])
  const [reportType, setReportType] = useState('supply_delayed')
  const [expectedTime, setExpectedTime] = useState('')
  const [actualStart, setActualStart] = useState('')
  const [actualStop, setActualStop] = useState('')
  const [waterStatus, setWaterStatus] = useState('Service Interruption')
  const [note, setNote] = useState('')
  const [source, setSource] = useState('HMWSSB Operations Liaison')
  const [sourceUrl, setSourceUrl] = useState('https://www.hmwssb.gov.in')
  const [isOfficial, setIsOfficial] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterVerification, setFilterVerification] = useState('')

  const isAdmin = user?.role === 'admin'
  const isLocalityRep = user?.is_locality_rep || isAdmin

  useEffect(() => {
    localityAPI.search('').then(res => setLocalities(res.data)).catch(console.error)
    loadBroadcasts()
  }, [])

  const loadBroadcasts = async () => {
    setLoading(true)
    try {
      const params: any = { is_broadcast: true }
      if (filterType) params.report_type = filterType
      if (filterVerification) params.verification_status = filterVerification
      const res = await reportAPI.list(params)
      setBroadcasts(res.data || [])
    } catch (e: any) {
      console.error('Failed to load broadcasts', e)
      toast.error('Unable to retrieve bulletins feed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBroadcasts() }, [filterType, filterVerification])

  const handleLocalityToggle = (id: number) => {
    setAffectedLocalities(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    try {
      if (isOfficial && !isAdmin) {
        toast.error('Only authenticated Municipal Admins can issue Official Notices.')
        setFormLoading(false)
        return
      }

      await reportAPI.broadcast({
        locality_id: Number(localityId),
        affected_locality_ids: affectedLocalities.length > 0 ? affectedLocalities : [Number(localityId)],
        report_type: reportType,
        expected_supply_time: expectedTime || undefined,
        actual_start_time: actualStart || undefined,
        actual_stop_time: actualStop || undefined,
        water_availability_status: waterStatus || 'Notice Issued',
        description: note.trim(),
        source: source.trim() || 'Ward Operations Liaison',
        source_url: sourceUrl.trim() || undefined,
        is_official: isAdmin && isOfficial,
        observed_at: new Date().toISOString(),
      })

      toast.success('Municipal bulletin broadcast published successfully')
      setNote('')
      setExpectedTime('')
      setActiveTab('feed')
      await loadBroadcasts()
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.detail || 'Failed to publish broadcast')
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ─── Gazette Masthead ─── */}
      <div className="gazette-masthead">
        <div>
          <div className="micro-label" style={{ marginBottom: '0.35rem', color: 'var(--color-teal)' }}>
            HMWS&SB & GREATER HYDERABAD CIVIC BULLETINS
          </div>
          <h1 className="gazette-title">
            Municipal Water Broadcast Center
          </h1>
          <div className="gazette-sub">
            Verified statutory notices, feeder pipeline maintenance advisories, and ward-level supply updates.
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('feed')}
            className={`btn ${activeTab === 'feed' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem' }}
          >
            <Radio size={14} /> Bulletins Gazette ({broadcasts.length})
          </button>

          {isLocalityRep && (
            <button
              onClick={() => setActiveTab('create')}
              className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.8rem' }}
            >
              <Megaphone size={14} /> Issue New Bulletin
            </button>
          )}
        </div>
      </div>

      {/* ─── TAB 1: Bulletins Gazette Feed ─── */}
      {activeTab === 'feed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Filter Bar */}
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '3px', padding: '0.85rem 1.25rem', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              <Filter size={15} color="var(--color-slate)" />
              <span>Filter Notices:</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--color-slate)' }}>Notice Type:</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="form-input"
                  style={{ width: 'auto', padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <option value="">All Categories</option>
                  {REPORT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--color-slate)' }}>Verification:</span>
                <select
                  value={filterVerification}
                  onChange={(e) => setFilterVerification(e.target.value)}
                  className="form-input"
                  style={{ width: 'auto', padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <option value="">All Verification Levels</option>
                  <option value="official">Official HMWS&SB Only</option>
                  <option value="community_reported">Community Verified</option>
                  <option value="conflicting">Conflicting Reports</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bulletins Feed List */}
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-slate)' }}>
              <div style={{ width: 28, height: 28, border: '2px solid var(--color-teal)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>RETRIEVING MUNICIPAL BULLETINS...</div>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--color-slate)' }}>
              <Radio size={36} color="var(--color-slate)" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-ink)' }}>No Active Bulletins In Selected Filter</div>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem' }}>
                All feeder pipelines and distribution sumps are operating under regular schedule conditions.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {broadcasts.map((bc, index) => {
                const isOfficial = bc.is_official
                const isEmergency = bc.report_type === 'emergency_shortage'
                const isConflicting = bc.verification_status === 'conflicting'

                return (
                  <article
                    key={bc.id}
                    style={{
                      background: 'var(--color-surface)',
                      border: isEmergency ? '1px solid #F5B8B8' : isOfficial ? '1px solid #B8DDD9' : '1px solid var(--color-border)',
                      borderLeft: `5px solid ${isEmergency ? '#B93838' : isOfficial ? '#167D78' : isConflicting ? '#D96B3B' : 'var(--color-ink)'}`,
                      borderRadius: '3px', padding: '1.5rem 1.75rem',
                      display: 'flex', flexDirection: 'column', gap: '0.85rem'
                    }}
                  >
                    {/* Header Strip */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 800,
                          padding: '2px 7px', borderRadius: '2px', letterSpacing: '0.04em',
                          background: isOfficial ? '#E6F3F2' : isEmergency ? '#FCE8E8' : 'var(--color-surface-subtle)',
                          color: isOfficial ? '#167D78' : isEmergency ? '#B93838' : 'var(--color-ink)'
                        }}>
                          {isOfficial ? '★ OFFICIAL MUNICIPAL NOTICE' : 'WARD COMMUNITY BROADCAST'}
                        </span>

                        <span className="badge" style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}>
                          {bc.report_type?.replace(/_/g, ' ').toUpperCase()}
                        </span>

                        {isEmergency && (
                          <span className="badge status-critical">
                            EMERGENCY SHUTDOWN
                          </span>
                        )}
                      </div>

                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-slate)' }}>
                        BULLETIN #{bc.id} • {bc.observed_at ? new Date(bc.observed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Today'}
                      </div>
                    </div>

                    {/* Notice Headline & Status */}
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-teal)', fontFamily: 'var(--font-mono)', marginBottom: '0.2rem' }}>
                        PRIMARY LOCATION: {bc.locality_name || 'HYDERABAD METRO ZONE'} • STATUS: {bc.water_availability_status}
                      </div>
                      <div style={{
                        fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-ink)',
                        lineHeight: 1.5, fontFamily: 'var(--font-sans)'
                      }}>
                        {bc.note}
                      </div>
                    </div>

                    {/* Operational Details Grid */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.85rem', background: 'var(--color-surface-subtle)',
                      padding: '0.75rem 1rem', borderRadius: '2px', fontSize: '0.78rem'
                    }}>
                      <div>
                        <span className="micro-label" style={{ fontSize: '0.625rem' }}>AFFECTED LOCALITIES</span>
                        <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginTop: '0.15rem' }}>
                          {bc.locality_name}
                          {bc.affected_locality_ids?.length > 1 && ` + ${bc.affected_locality_ids.length - 1} neighboring wards`}
                        </div>
                      </div>

                      <div>
                        <span className="micro-label" style={{ fontSize: '0.625rem' }}>TIMING ESTIMATION</span>
                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-ink)', marginTop: '0.15rem' }}>
                          {bc.expected_supply_time || 'Continuous Monitoring'}
                        </div>
                      </div>

                      <div>
                        <span className="micro-label" style={{ fontSize: '0.625rem' }}>ATTRIBUTION & AUTHORITY</span>
                        <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginTop: '0.15rem' }}>
                          {bc.source}
                        </div>
                      </div>
                    </div>

                    {/* Footer Links */}
                    {bc.source_url && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.35rem' }}>
                        <a
                          href={bc.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.75rem', color: 'var(--color-teal)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          Verify Source Gazette Record <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}

        </div>
      )}

      {/* ─── TAB 2: Issue Bulletin Form ─── */}
      {activeTab === 'create' && isLocalityRep && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="micro-label" style={{ color: 'var(--color-teal)', marginBottom: '0.2rem' }}>
              CIVIC DISPATCH TERMINAL
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
              Broadcast Water Supply Notice or Emergency Alert
            </h2>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-slate)' }}>
              Announcements will be instantaneously pushed to affected residents' dashboards and notification feeds.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Primary Locality & Multi-Locality Targets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label className="form-label">Primary Announcing Locality</label>
                <select
                  value={localityId}
                  onChange={(e) => setLocalityId(Number(e.target.value))}
                  className="form-select"
                  required
                >
                  {localities.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.zone ? `(${loc.zone} Zone)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Notice Type Category</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="form-select"
                  required
                >
                  {REPORT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      [{t.code}] {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Affected Wards Multiselect */}
            <div>
              <label className="form-label">
                Multi-Ward Broadcast Scope (Select all affected feeder sectors)
              </label>
              <div style={{
                maxHeight: 140, overflowY: 'auto', border: '1px solid var(--color-border)',
                background: 'var(--color-surface-subtle)', padding: '0.75rem', borderRadius: '3px',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem'
              }}>
                {localities.map(loc => (
                  <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={affectedLocalities.includes(loc.id) || loc.id === Number(localityId)}
                      onChange={() => handleLocalityToggle(loc.id)}
                      disabled={loc.id === Number(localityId)}
                      style={{ accentColor: 'var(--color-teal)' }}
                    />
                    <span>{loc.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status & Timing */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label className="form-label">Operational Status Headline</label>
                <input
                  type="text"
                  value={waterStatus}
                  onChange={(e) => setWaterStatus(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Low Pressure Flow / Pipeline Repair"
                  required
                />
              </div>

              <div>
                <label className="form-label">Estimated Supply Time Window</label>
                <input
                  type="text"
                  value={expectedTime}
                  onChange={(e) => setExpectedTime(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 07:00 - 09:30 AM (ETA 2 Hours)"
                />
              </div>

              <div>
                <label className="form-label">Source Citation</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="form-input"
                  placeholder="e.g. HMWS&SB Division VII Office"
                  required
                />
              </div>
            </div>

            {/* Detailed Description */}
            <div>
              <label className="form-label">Official Public Announcement Text</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="form-textarea"
                rows={4}
                placeholder="Specify root cause, expected pressure, emergency tanker counters, or precautionary guidelines..."
                required
              />
            </div>

            {/* Statutory Authority Toggle for Admin */}
            <div style={{
              background: isAdmin ? '#E6F3F2' : 'var(--color-surface-subtle)',
              border: `1px solid ${isAdmin ? '#B8DDD9' : 'var(--color-border)'}`,
              padding: '1rem 1.25rem', borderRadius: '3px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
            }}>
              <Shield size={20} color={isAdmin ? 'var(--color-teal)' : 'var(--color-slate)'} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-ink)' }}>
                  Statutory "Official Notice" Designation
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.15rem' }}>
                  {isAdmin
                    ? 'As an authenticated Administrator, you may publish this bulletin with the Official HMWS&SB Seal.'
                    : 'Restricted: Non-admin accounts may publish verified Community Advisories. Official seals require municipal authority credentials.'}
                </div>
                {isAdmin && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isOfficial}
                      onChange={(e) => setIsOfficial(e.target.checked)}
                      style={{ accentColor: 'var(--color-teal)' }}
                    />
                    Publish under Official Statutory Municipal Notice label
                  </label>
                )}
              </div>
            </div>

            {/* Submit Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.5rem', fontWeight: 700 }}
              >
                <Send size={15} />
                {formLoading ? 'Publishing Bulletin...' : 'Transmit Broadcast Notice'}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  )
}
