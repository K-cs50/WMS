import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import { localityAPI } from '../api'
import { AlertCircle, Shield, Building, User, Phone, Mail, Lock, Globe } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', confirmPassword: '',
    role: 'consumer', city_id: '1', locality_id: '',
    business_name: '', contact_phone: ''
  })
  const [cities, setCities] = useState<any[]>([])
  const [localities, setLocalities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    localityAPI.cities().then(r => setCities(r.data)).catch(console.error)
    localityAPI.search('', 1).then(r => setLocalities(r.data)).catch(console.error)
  }, [])

  useEffect(() => {
    if (form.city_id) {
      localityAPI.search('', parseInt(form.city_id)).then(r => setLocalities(r.data)).catch(console.error)
    }
  }, [form.city_id])

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (!form.email && !form.phone) { setError('Email or phone required'); return }
    setLoading(true)
    try {
      await register({
        full_name: form.full_name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
        role: form.role,
        city_id: form.city_id ? parseInt(form.city_id) : undefined,
        locality_id: form.locality_id ? parseInt(form.locality_id) : undefined,
        business_name: form.business_name || undefined,
        contact_phone: form.contact_phone || undefined,
      })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '580px' }}>
        
        {/* Masthead */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '2px', background: 'var(--color-teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
              fontSize: '0.9rem', color: '#FFFFFF'
            }}>
              WMS
            </div>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-ink)', letterSpacing: '0.04em' }}>
              WMS-WATER MANAGEMENT & SUPPLY
            </span>
          </div>
          <div className="micro-label" style={{ marginTop: '0.35rem', color: 'var(--color-slate)' }}>
            CIVIC REGISTRATION & WARD ENROLLMENT
          </div>
        </div>

        {/* Language Switcher on Register Page */}
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

        {/* Card */}
        <div className="card" style={{ padding: '2.25rem' }}>
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0, fontFamily: 'var(--font-display)' }}>
              {t.reg_title}
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem', color: 'var(--color-slate)' }}>
              {t.reg_subtitle}
            </p>
          </div>

          {error && (
            <div style={{
              background: '#FCE8E8', borderLeft: '3px solid #B93838', borderTop: '1px solid #F5B8B8',
              borderRight: '1px solid #F5B8B8', borderBottom: '1px solid #F5B8B8',
              padding: '0.75rem 1rem', borderRadius: '2px', color: '#B93838',
              fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem'
            }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Role Radio Slips */}
            <div>
              <label className="form-label">{t.reg_role}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem',
                  border: form.role === 'consumer' ? '1px solid var(--color-teal)' : '1px solid var(--color-border)',
                  background: form.role === 'consumer' ? '#E6F3F2' : 'var(--color-surface)',
                  borderRadius: '2px', cursor: 'pointer', fontSize: '0.825rem'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="consumer"
                    checked={form.role === 'consumer'}
                    onChange={set('role')}
                    style={{ accentColor: 'var(--color-teal)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{t.reg_resident}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-slate)' }}>Ward water monitoring</div>
                  </div>
                </label>

                <label style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem',
                  border: form.role === 'provider' ? '1px solid var(--color-teal)' : '1px solid var(--color-border)',
                  background: form.role === 'provider' ? '#E6F3F2' : 'var(--color-surface)',
                  borderRadius: '2px', cursor: 'pointer', fontSize: '0.825rem'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="provider"
                    checked={form.role === 'provider'}
                    onChange={set('role')}
                    style={{ accentColor: 'var(--color-teal)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{t.reg_carrier}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-slate)' }}>Tanker logistics provider</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Full Name & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">{t.reg_name}</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={set('full_name')}
                  className="form-input"
                  placeholder="e.g. Priya Sharma"
                  required
                />
              </div>

              <div>
                <label className="form-label">{t.reg_phone}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  className="form-input"
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="form-label">{t.reg_email}</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                className="form-input"
                placeholder="e.g. resident@domain.com"
              />
            </div>

            {/* Ward Locality Selector */}
            <div>
              <label className="form-label">{t.reg_ward}</label>
              <select
                value={form.locality_id}
                onChange={set('locality_id')}
                className="form-select"
                required
              >
                <option value="">Select your neighborhood...</option>
                {localities.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.zone ? `(${loc.zone} Zone)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider Fields if selected */}
            {form.role === 'provider' && (
              <div style={{ background: 'var(--color-surface-subtle)', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="micro-label" style={{ color: 'var(--color-orange)' }}>CARRIER LOGISTICS DETAILS</div>
                <div>
                  <label className="form-label">{t.reg_business}</label>
                  <input
                    type="text"
                    value={form.business_name}
                    onChange={set('business_name')}
                    className="form-input"
                    placeholder="e.g. Ganga Water Logistics"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">{t.reg_helpline}</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={set('contact_phone')}
                    className="form-input"
                    placeholder="e.g. 040-23456789"
                    required
                  />
                </div>
              </div>
            )}

            {/* Password & Confirm */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">{t.reg_password}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  className="form-input"
                  placeholder="Min. 8 characters"
                  required
                />
              </div>

              <div>
                <label className="form-label">{t.reg_confirm}</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  className="form-input"
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.65rem 1rem', fontSize: '0.875rem', marginTop: '0.5rem' }}
            >
              {loading ? t.reg_signing : t.reg_submit}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.825rem', color: 'var(--color-slate)' }}>
            {t.reg_have_account}{' '}
            <Link to="/login" style={{ color: 'var(--color-teal)', fontWeight: 700, textDecoration: 'none' }}>
              {t.reg_signin}
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
