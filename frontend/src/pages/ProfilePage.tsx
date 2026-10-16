import React, { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { authAPI, localityAPI } from '../api'
import { User, Mail, Phone, MapPin, Shield, CheckCircle, Save, KeyRound } from 'lucide-react'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [localities, setLocalities] = useState<any[]>([])
  const [selectedLocalityId, setSelectedLocalityId] = useState<number | undefined>(user?.locality_id)
  const [preferredChannel, setPreferredChannel] = useState(user?.preferred_alert_channel || 'in_app')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    localityAPI.search('').then(res => setLocalities(res.data)).catch(console.error)
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      await authAPI.updateProfile({
        full_name: fullName,
        phone: phone,
        locality_id: selectedLocalityId,
        preferred_alert_channel: preferredChannel,
      })
      await refreshUser()
      setMsg('Citizen credentials and alert preferences saved to municipal directory!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Gazette Masthead */}
      <div className="gazette-masthead">
        <div className="micro-label" style={{ color: 'var(--color-teal)' }}>
          CITIZEN ACCOUNT // REGISTRY RECORD
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--color-ink)' }}>
          Citizen Profile & Ward Credentials
        </h1>
        <p style={{ margin: 0, color: 'var(--color-slate)', fontSize: '0.9rem' }}>
          Manage your verified residential identity, primary supply jurisdiction, and emergency contact channels.
        </p>
      </div>

      {msg && (
        <div style={{ background: '#FAF8F5', borderLeft: '4px solid var(--color-teal)', color: 'var(--color-teal)', padding: '0.85rem 1.15rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> {msg}
        </div>
      )}

      {/* Main Citizen Dossier Card */}
      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Identity Dossier Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ width: 68, height: 68, background: 'var(--color-ink)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700 }}>
              {user?.full_name?.charAt(0) || 'C'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
                  {user?.full_name}
                </h2>
                <span className="status-badge badge-verified" style={{ fontSize: '0.7rem' }}>
                  {user?.role?.toUpperCase()} ACCESS
                </span>
              </div>
              <div className="tabular-num" style={{ fontSize: '0.82rem', color: 'var(--color-slate)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                CITIZEN ID // {user?.email}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Contact Phone (For Emergency Tanker & Alerts)</label>
              <input
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label className="form-label">Primary Residential Jurisdiction</label>
              <select
                className="form-input"
                value={selectedLocalityId || ''}
                onChange={(e) => setSelectedLocalityId(Number(e.target.value))}
              >
                <option value="">Select your municipal ward</option>
                {localities.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.zone ? `— ${loc.zone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Advisory Broadcast Channel</label>
              <select
                className="form-input"
                value={preferredChannel}
                onChange={(e) => setPreferredChannel(e.target.value)}
              >
                <option value="in_app">In-App Operations Feed (Standard)</option>
                <option value="sms">SMS Text Alert + In-App (Recommended)</option>
              </select>
            </div>
          </div>

          {/* Verification Protocol Notice */}
          <div style={{ background: '#FAF8F5', border: '1px solid var(--border-color)', padding: '0.85rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-slate)' }}>
            <KeyRound size={16} color="var(--color-teal)" style={{ flexShrink: 0 }} />
            <span>
              Your ward locality dictates telemetry feed routing, ground conflict calculations, and emergency bulk water pool availability.
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ justifyContent: 'center', padding: '0.85rem 1.75rem', alignSelf: 'flex-start' }}
          >
            <Save size={15} /> {loading ? 'Saving Changes...' : 'Save Citizen Credentials'}
          </button>

        </form>
      </div>

    </div>
  )
}
