import React, { useState, useEffect } from 'react'
import { contactAPI, sourcesAPI, localityAPI } from '../api'
import {
  Phone, ExternalLink, ShieldCheck, Copy, Check,
  Search, Building, FileText, Globe, AlertCircle, Info,
  CheckCircle2, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    localityAPI.cities().then(res => setCities(res.data)).catch(console.error)
    sourcesAPI.list().then(res => setSources(res.data)).catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    contactAPI.list({ city_id: selectedCityId, q: searchQuery })
      .then(res => setContacts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedCityId, searchQuery])

  const handleCopy = (phone: string) => {
    navigator.clipboard.writeText(phone)
    setCopiedPhone(phone)
    toast.success(`Helpline ${phone} copied to clipboard`)
    setTimeout(() => setCopiedPhone(null), 2500)
  }

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ─── Gazette Masthead ─── */}
      <div className="gazette-masthead">
        <div>
          <div className="micro-label" style={{ marginBottom: '0.35rem', color: 'var(--color-teal)' }}>
            GREATER HYDERABAD MUNICIPAL DIRECTORY
          </div>
          <h1 className="gazette-title">
            Official Water Helplines & Emergency Directory
          </h1>
          <div className="gazette-sub">
            Verified government Jal Board divisions, pipeline leakage response desks, and statutory grievance numbers.
          </div>
        </div>

        {/* Search & City Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="var(--color-slate)" style={{ position: 'absolute', left: 10, top: 10 }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search helpline or board..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.1rem', width: 220, fontSize: '0.8rem' }}
            />
          </div>

          <select
            className="form-select"
            value={selectedCityId || ''}
            onChange={(e) => setSelectedCityId(e.target.value ? Number(e.target.value) : undefined)}
            style={{ width: 'auto', fontSize: '0.8rem' }}
          >
            <option value="">All Municipalities</option>
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Verified Municipal Contacts ({contacts.length})
          </div>
          <span className="micro-label">SOURCE: PUBLISHED GOVERNMENT DIRECTORIES</span>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-slate)' }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--color-teal)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>QUERYING STATUTORY CONTACT REGISTRIES...</div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-slate)' }}>
            <Building size={36} color="var(--color-slate)" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>No directory entries match "{searchQuery}"</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {contacts.map((c) => (
              <div
                key={c.id}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  borderTop: '3px solid var(--color-ink)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <span className="micro-label" style={{ color: 'var(--color-teal)' }}>
                        {c.department || 'OPERATIONS & COMPLAINTS'}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-ink)', margin: '0.2rem 0 0 0', lineHeight: 1.3 }}>
                        {c.organization}
                      </h3>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.15rem' }}>
                        Jurisdiction: {c.city_name || 'Hyderabad Metro'}
                      </div>
                    </div>

                    <span className="badge status-official" style={{ flexShrink: 0 }}>
                      VERIFIED
                    </span>
                  </div>

                  {/* Phone Call Strip */}
                  <div style={{
                    background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)',
                    borderRadius: '2px', padding: '0.75rem 1rem', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between', margin: '1rem 0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Phone size={16} color="var(--color-teal)" />
                      <div>
                        <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-slate)', textTransform: 'uppercase' }}>
                          DIRECT DIAL / TOLL FREE
                        </div>
                        <a
                          href={`tel:${c.phone_number}`}
                          style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-ink)', textDecoration: 'none' }}
                        >
                          {c.phone_number}
                        </a>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopy(c.phone_number)}
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                      title="Copy Phone Number"
                    >
                      {copiedPhone === c.phone_number ? <Check size={13} color="var(--color-teal)" /> : <Copy size={13} />}
                      {copiedPhone === c.phone_number ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Notes / Hours */}
                  {c.notes && (
                    <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, marginBottom: '0.75rem' }}>
                      {c.notes}
                    </div>
                  )}
                </div>

                {/* Footer Portal Link */}
                {c.website && (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', color: 'var(--color-teal)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      Official Public Grievance Portal <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
