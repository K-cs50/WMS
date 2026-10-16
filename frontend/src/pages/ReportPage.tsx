import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { localityAPI, reportAPI } from '../api'
import {
  Droplets, CheckCircle2, AlertTriangle, Clock, FileText,
  AlertCircle, Send, ArrowLeft, ShieldCheck, Check, Upload,
  MapPin, Calendar, Info
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReportPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<number>(1)
  const [localities, setLocalities] = useState<any[]>([])
  const [localityId, setLocalityId] = useState<number>(user?.locality_id || 1)
  const [reportType, setReportType] = useState<string>('supply_started')
  const [observedAt, setObservedAt] = useState<string>(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  )
  const [note, setNote] = useState<string>('')
  const [evidenceName, setEvidenceName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [recentReports, setRecentReports] = useState<any[]>([])

  useEffect(() => {
    localityAPI.search('').then(res => {
      setLocalities(res.data)
      if (!localityId && res.data.length > 0) {
        setLocalityId(res.data[0].id)
      }
    }).catch(console.error)
  }, [])

  const loadRecent = (id: number) => {
    reportAPI.getByLocality(id, 24).then(res => {
      setRecentReports(res.data)
    }).catch(console.error)
  }

  useEffect(() => {
    if (localityId) {
      loadRecent(localityId)
    }
  }, [localityId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        locality_id: Number(localityId),
        report_type: reportType,
        observed_at: new Date(observedAt).toISOString(),
        note: (note.trim() + (evidenceName ? ` [Evidence attached: ${evidenceName}]` : '')) || undefined,
        is_demo: false,
      }

      await reportAPI.create(payload)
      toast.success('Ground report recorded. Reliability score updated.')
      setNote('')
      setEvidenceName('')
      setStep(3)
      loadRecent(localityId)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit report. Anti-spam cooldown may be active.')
    } finally {
      setLoading(false)
    }
  }

  const reportCategories = [
    { id: 'supply_started', code: 'CAT-01', label: 'Supply Flow Active', desc: 'Municipal piped water flowing through household meters / sumps', color: '#167D78', bg: '#E6F3F2' },
    { id: 'supply_stopped', code: 'CAT-02', label: 'Supply Cycle Concluded', desc: 'Pumping stopped or tap run concluded for this cycle', color: '#D96B3B', bg: '#FDF1EA' },
    { id: 'delayed', code: 'CAT-03', label: 'Schedule Delayed', desc: 'Past published gazette start time with zero or negligible flow', color: '#D96B3B', bg: '#FDF1EA' },
    { id: 'no_supply', code: 'CAT-04', label: 'Complete Outage', desc: 'Zero flow during scheduled hours or feeder pipe maintenance shutoff', color: '#B93838', bg: '#FCE8E8' },
    { id: 'low_pressure', code: 'CAT-05', label: 'Low Terminal Pressure', desc: 'Trickle supply unable to reach overhead gravity tanks', color: '#75858A', bg: '#EDE9DF' },
  ]

  const currentLocalityObj = localities.find(l => l.id === Number(localityId))

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ─── Gazette Masthead ─── */}
      <div className="gazette-masthead">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'var(--color-slate)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0, marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={14} /> Return to Operations Dashboard
          </button>
          <div className="micro-label" style={{ color: 'var(--color-teal)' }}>
            CITIZEN SCIENCE & STATUTORY VERIFICATION
          </div>
          <h1 className="gazette-title">
            File Ground Water Supply Observation
          </h1>
          <div className="gazette-sub">
            Citizen reports calibrate the multi-signal reliability engine and alert neighbors across your ward.
          </div>
        </div>

        {/* Step Progress Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
          <span style={{
            padding: '3px 8px', borderRadius: '2px',
            background: step === 1 ? 'var(--color-ink)' : 'var(--color-surface)',
            color: step === 1 ? '#F4F1E9' : 'var(--color-slate)',
            border: '1px solid var(--color-border)', fontWeight: 700
          }}>
            1. LOCATION
          </span>
          <span style={{ color: 'var(--color-border)' }}>→</span>
          <span style={{
            padding: '3px 8px', borderRadius: '2px',
            background: step === 2 ? 'var(--color-ink)' : 'var(--color-surface)',
            color: step === 2 ? '#F4F1E9' : 'var(--color-slate)',
            border: '1px solid var(--color-border)', fontWeight: 700
          }}>
            2. CONDITION
          </span>
          <span style={{ color: 'var(--color-border)' }}>→</span>
          <span style={{
            padding: '3px 8px', borderRadius: '2px',
            background: step === 3 ? 'var(--color-teal)' : 'var(--color-surface)',
            color: step === 3 ? '#FFFFFF' : 'var(--color-slate)',
            border: '1px solid var(--color-border)', fontWeight: 700
          }}>
            3. AUDIT
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        
        {/* Main Step Form Card */}
        <div className="card" style={{ padding: '2rem' }}>
          
          {step === 1 && (
            <div>
              <div className="micro-label" style={{ color: 'var(--color-teal)', marginBottom: '0.25rem' }}>STEP 1 OF 2</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 1.25rem 0' }}>
                Select Monitored Locality & Observation Timestamp
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="form-label">Ward / Residential Locality</label>
                  <select
                    value={localityId}
                    onChange={(e) => setLocalityId(Number(e.target.value))}
                    className="form-select"
                  >
                    {localities.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.zone ? `(${loc.zone} Zone)` : ''} — Ward {loc.ward || 'General'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Observation Date & Local Time</label>
                  <input
                    type="datetime-local"
                    value={observedAt}
                    onChange={(e) => setObservedAt(e.target.value)}
                    className="form-input"
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-slate)', marginTop: '0.35rem' }}>
                    * Reports within 90 minutes of flow start provide maximum statistical weight.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1.5rem', fontWeight: 700 }}
                  >
                    Proceed to Condition Category →
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <div className="micro-label" style={{ color: 'var(--color-teal)', marginBottom: '0.25rem' }}>STEP 2 OF 2</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 1.25rem 0' }}>
                Select Observed Condition & Specifics
              </h2>

              {/* Category Radio Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                {reportCategories.map(cat => {
                  const isSelected = reportType === cat.id
                  return (
                    <label
                      key={cat.id}
                      style={{
                        padding: '0.85rem 1rem', borderRadius: '2px', cursor: 'pointer',
                        border: isSelected ? '1px solid var(--color-teal)' : '1px solid var(--color-border)',
                        background: isSelected ? 'rgba(22, 125, 120, 0.04)' : '#FFFFFF',
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        transition: 'border-color 0.12s'
                      }}
                    >
                      <input
                        type="radio"
                        name="report_type"
                        value={cat.id}
                        checked={isSelected}
                        onChange={() => setReportType(cat.id)}
                        style={{ accentColor: 'var(--color-teal)', marginTop: '3px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="micro-label" style={{ color: cat.color }}>{cat.code}</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--color-ink)' }}>{cat.label}</strong>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.2rem' }}>
                          {cat.desc}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>

              {/* Notes & Optional Evidence */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="form-label">Specific Street / House Observation (Optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="form-textarea"
                    rows={3}
                    placeholder="e.g. Street 4 sump filled; pressure dropped around 07:15 AM..."
                  />
                </div>

                <div>
                  <label className="form-label">Optional Evidence Attachment</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="file"
                      id="evidence-file"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) setEvidenceName(e.target.files[0].name)
                      }}
                    />
                    <label
                      htmlFor="evidence-file"
                      className="btn btn-outline"
                      style={{ fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      <Upload size={14} /> Attach Pressure Gauge / Sump Photo
                    </label>
                    {evidenceName && (
                      <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--color-teal)' }}>
                        ✓ {evidenceName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-outline"
                >
                  ← Back to Location
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1.5rem', fontWeight: 700 }}
                >
                  <Send size={15} />
                  {loading ? 'Submitting to Engine...' : 'Transmit Ground Report'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E6F3F2', color: 'var(--color-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CheckCircle2 size={24} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0, fontFamily: 'var(--font-display)' }}>
                Observation Recorded
              </h2>
              <p style={{ margin: '0.5rem 0 1.5rem 0', color: 'var(--color-slate)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                Your ground observation has been logged in the audit ledger and factored into the mathematical reliability score for <strong>{currentLocalityObj?.name}</strong>.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => { setStep(1); setNote(''); }}
                  className="btn btn-outline"
                >
                  File Another Report
                </button>
                <Link to="/dashboard" className="btn btn-primary">
                  View Updated Dashboard
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar: Reliability Calibration Explanation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="card">
            <div className="micro-label" style={{ color: 'var(--color-teal)', marginBottom: '0.35rem' }}>
              HOW YOUR REPORT IS USED
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 0.75rem 0' }}>
              Anti-Spam & Corroboration Engine
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-slate)', lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div>
                • <strong>Temporal Weight:</strong> Reports carry 100% weight for 30 minutes, decaying exponentially ($\lambda=0.01$).
              </div>
              <div>
                • <strong>Agreement Consensus:</strong> If 3 or more independent accounts report the same flow within 45 minutes, ward status is promoted to High Confidence.
              </div>
              <div>
                • <strong>Rate Limiting:</strong> A 5-minute cooldown per citizen per ward prevents spam flooding.
              </div>
            </div>
          </div>

          {/* Recent Reports in Locality */}
          <div className="card">
            <div className="micro-label" style={{ marginBottom: '0.35rem' }}>
              RECENT REPORTS ({currentLocalityObj?.name || 'Selected Ward'})
            </div>
            {recentReports.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', padding: '0.75rem 0' }}>
                No reports filed in this ward in the past 24 hours.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {recentReports.slice(0, 3).map((r) => (
                  <div key={r.id} style={{ background: 'var(--color-surface-subtle)', padding: '0.5rem 0.75rem', borderRadius: '2px', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--color-ink)' }}>
                      <span>{r.report_type?.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className="font-mono">{r.observed_at ? new Date(r.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}</span>
                    </div>
                    {r.note && <div style={{ color: 'var(--color-slate)', marginTop: '0.2rem' }}>"{r.note}"</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}
