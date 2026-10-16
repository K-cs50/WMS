import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import { Eye, EyeOff, AlertCircle, Shield, Radio, Layers, Truck, CheckCircle2, Globe } from 'lucide-react'

const DEMO_ROLES = [
  { label: 'Citizen Resident', sub: 'Priya Sharma (Banjara Hills)', email: 'priya@wms.demo', pw: 'Demo@1234' },
  { label: 'Locality Rep', sub: 'Ravi Kumar (Kondapur Ward)', email: 'ravi@wms.demo', pw: 'Demo@1234' },
  { label: 'Tanker Carrier', sub: 'Srinivas Tankers Logistics', email: 'provider@wms.demo', pw: 'Demo@1234' },
  { label: 'Municipal Admin', sub: 'HMWS&SB Operations Liaison', email: 'admin@wms.demo', pw: 'Admin@1234' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(identifier, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoFill = async (email: string, pw: string) => {
    setIdentifier(email)
    setPassword(pw)
    setError('')
    setLoading(true)
    try {
      await login(email, pw)
      navigate('/dashboard')
    } catch {
      setError('Demo authentication failed. Ensure backend server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-paper)', flexWrap: 'wrap' }}>
      
      {/* ─── LEFT: Editorial Infrastructure Panel ─── */}
      <div style={{
        flex: '1 1 480px', background: 'var(--color-ink)', color: '#F4F1E9',
        padding: '3.5rem 3rem', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', position: 'relative', borderRight: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Top Masthead */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '2px', background: 'var(--color-teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
              fontSize: '1.1rem', color: '#FFFFFF', letterSpacing: '-0.02em'
            }}>
              WMS
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                WMS-WATER MANAGEMENT & SUPPLY
              </div>
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-slate)', letterSpacing: '0.08em' }}>
                TELANGANA MUNICIPAL WATER INFRASTRUCTURE
              </div>
            </div>
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '3px 8px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)',
            fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-teal)'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-teal)', display: 'inline-block' }} />
            GRID STATUS: MONITORED TELEMETRY ACTIVE
          </div>
        </div>

        {/* Center Technical Editorial Statement */}
        <div style={{ margin: '3rem 0' }}>
          <div className="micro-label" style={{ color: 'var(--color-orange)', marginBottom: '0.5rem' }}>
            CIVIC INFRASTRUCTURE PORTAL
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700,
            lineHeight: 1.15, margin: '0 0 1.25rem 0', color: '#FFFFFF', letterSpacing: '-0.015em'
          }}>
            Know Your Water.<br />
            Plan Ahead With Verified Ground Truth.
          </h1>
          <p style={{
            fontSize: '0.95rem', color: 'rgba(244, 241, 233, 0.75)', lineHeight: 1.6,
            margin: '0 0 2rem 0', maxWidth: '440px'
          }}>
            Statutory HMWS&SB municipal supply schedules, real-time weather station precipitation, and mathematical citizen consensus across Greater Hyderabad's wards.
          </p>

          {/* Technical Specs List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.825rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-teal)', fontWeight: 700 }}>01</span>
              <div>
                <strong style={{ color: '#FFFFFF' }}>Statutory Gazette Bulletins:</strong> Official outage notifications from division water engineers.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.825rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-teal)', fontWeight: 700 }}>02</span>
              <div>
                <strong style={{ color: '#FFFFFF' }}>Multi-Signal Reliability:</strong> Temporal decay and contradiction penalties prevent false reports.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.825rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-teal)', fontWeight: 700 }}>03</span>
              <div>
                <strong style={{ color: '#FFFFFF' }}>Cartographic Stress Map:</strong> CGWB groundwater observation well measurements across zones.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Coordinates & Statutory Reference */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-slate)' }}>
          <span>17.3850° N, 78.4867° E</span>
          <span>HYDERABAD METROPOLITAN BASIN</span>
        </div>
      </div>

      {/* ─── RIGHT: Editorial Authentication Panel ─── */}
      <div style={{
        flex: '1 1 480px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', padding: '3rem 2rem'
      }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          
          {/* Language Switcher on Login Page */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem', gap: '0.5rem', alignItems: 'center' }}>
            <Globe size={14} color="var(--color-slate)" />
            <div style={{ display: 'inline-flex', border: '1px solid var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
              {(['en', 'te', 'hi'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    border: 'none',
                    borderLeft: l !== 'en' ? '1px solid var(--color-border)' : 'none',
                    background: lang === l ? 'var(--color-ink)' : '#FFFFFF',
                    color: lang === l ? '#FFFFFF' : 'var(--color-slate)',
                    cursor: 'pointer',
                  }}
                >
                  {l === 'en' ? 'EN' : l === 'te' ? 'తె' : 'हि'}
                </button>
              ))}
            </div>
          </div>

          {/* Card Wrapper */}
          <div className="card" style={{ padding: '2.25rem' }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div className="micro-label" style={{ color: 'var(--color-teal)', marginBottom: '0.25rem' }}>
                CITIZEN & AUTHORITY ACCESS
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0, fontFamily: 'var(--font-display)' }}>
                {t.login_title}
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem', color: 'var(--color-slate)' }}>
                {t.login_subtitle}
              </p>
            </div>

            {error && (
              <div style={{
                background: '#FCE8E8', borderLeft: '3px solid #B93838', borderTop: '1px solid #F5B8B8',
                borderRight: '1px solid #F5B8B8', borderBottom: '1px solid #F5B8B8',
                padding: '0.75rem 1rem', borderRadius: '2px', color: '#B93838',
                fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="form-label">{t.login_identifier}</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="form-input"
                  placeholder="e.g. priya@wms.demo or 9876543210"
                  required
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">{t.login_password}</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-slate)', cursor: 'pointer' }}>
                    Reset Password
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="Enter account security key"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: 'var(--color-slate)', cursor: 'pointer' }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--color-ink)' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: 'var(--color-teal)' }}
                  />
                  <span>{t.login_remember}</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.65rem 1rem', fontSize: '0.875rem' }}
              >
                {loading ? t.login_authenticating : t.login_submit}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.825rem', color: 'var(--color-slate)' }}>
              {t.login_new_user}{' '}
              <Link to="/register" style={{ color: 'var(--color-teal)', fontWeight: 700, textDecoration: 'none' }}>
                {t.login_register}
              </Link>
            </div>
          </div>

          {/* ─── 1-Click Quick Fill Demo Slips ─── */}
          <div style={{ marginTop: '1.5rem' }}>
            <div className="micro-label" style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
              {t.login_demo_heading}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {DEMO_ROLES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => handleDemoFill(r.email, r.pw)}
                  style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: '2px', padding: '0.6rem 0.75rem', textAlign: 'left',
                    cursor: 'pointer', transition: 'border-color 0.12s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-teal)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink)' }}>{r.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)', marginTop: '1px' }}>{r.sub}</div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
