import React, { useState, useEffect } from 'react'
import { providerAPI } from '../api'
import {
  Truck, CheckCircle, XCircle, Clock, Navigation,
  ShieldCheck, RefreshCw, AlertCircle, Package
} from 'lucide-react'

export default function ProviderBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'active' | 'delivered'>('all')

  const loadData = async () => {
    setLoading(true)
    try {
      const [bRes, pRes] = await Promise.all([
        providerAPI.myBookings().catch(() => ({ data: [] })),
        providerAPI.myProfile().catch(() => ({ data: null })),
      ])
      setBookings(bRes.data)
      setProfile(pRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAction = async (id: number, action: string) => {
    try {
      await providerAPI.bookingAction(id, { action })
      setActionMsg(`Booking status updated to ${action.replace(/_/g, ' ')}`)
      loadData()
      setTimeout(() => setActionMsg(''), 4000)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update booking status')
    }
  }

  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const activeCount = bookings.filter(b => b.status === 'in_progress' || b.status === 'accepted').length
  const deliveredCount = bookings.filter(b => b.status === 'delivered').length

  const filteredBookings = bookings.filter(b => {
    if (activeFilter === 'pending') return b.status === 'pending'
    if (activeFilter === 'active') return b.status === 'in_progress' || b.status === 'accepted'
    if (activeFilter === 'delivered') return b.status === 'delivered'
    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered': return 'badge-verified'
      case 'in_progress': return 'badge-info'
      case 'accepted': return 'badge-stale'
      case 'cancelled':
      case 'rejected': return 'badge-danger'
      default: return 'badge-disabled'
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Gazette Masthead */}
      <div className="gazette-masthead">
        <div>
          <div className="micro-label" style={{ color: 'var(--color-teal)' }}>
            LOGISTICS OPERATIONS // DISPATCH CONSOLE
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--color-ink)' }}>
            {profile?.business_name || 'Provider Dispatch Console'}
          </h1>
          <p style={{ margin: 0, color: 'var(--color-slate)', fontSize: '0.9rem' }}>
            Manage incoming residential and commercial tanker dispatch orders, fleet telemetry, and delivery confirmations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {profile?.is_verified && (
            <span className="status-badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={13} /> HMWSSB VERIFIED
            </span>
          )}
          <button
            onClick={loadData}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Queue
          </button>
        </div>
      </div>

      {/* Success message */}
      {actionMsg && (
        <div style={{ background: '#FAF8F5', borderLeft: '4px solid var(--color-teal)', color: 'var(--color-teal)', padding: '0.85rem 1.15rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> {actionMsg}
        </div>
      )}

      {/* Fleet Operations KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="micro-label">FLEET UNITS</div>
          <div className="tabular-num" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-ink)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
            {profile?.tankers?.length || '—'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.1rem' }}>GPS-Tagged Tankers</div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="micro-label" style={{ color: 'var(--color-orange)' }}>PENDING AUTHORIZATION</div>
          <div className="tabular-num" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-orange)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.1rem' }}>Orders awaiting accept</div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="micro-label" style={{ color: '#1E6FBF' }}>IN TRANSIT</div>
          <div className="tabular-num" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1E6FBF', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.1rem' }}>Active deliveries</div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="micro-label" style={{ color: 'var(--color-teal)' }}>DELIVERED TODAY</div>
          <div className="tabular-num" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-teal)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
            {deliveredCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.1rem' }}>Completed dispatches</div>
        </div>
      </div>

      {/* Orders Queue */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="micro-label" style={{ color: 'var(--color-teal)' }}>DISPATCH QUEUE REGISTRY</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--color-ink)' }}>
              Delivery Orders ({filteredBookings.length})
            </h2>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', border: '1px solid var(--color-border)', background: '#FFFFFF' }}>
            {(['all', 'pending', 'active', 'delivered'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  borderLeft: f !== 'all' ? '1px solid var(--color-border)' : 'none',
                  background: activeFilter === f ? 'var(--color-ink)' : 'transparent',
                  color: activeFilter === f ? '#FFFFFF' : 'var(--color-ink)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-slate)' }}>
            <div className="micro-label">QUERYING DISPATCH REGISTRY...</div>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>Fetching active tanker allocation records...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-slate)' }}>
            <Truck size={36} color="var(--color-slate)" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-ink)', fontWeight: 600 }}>
              No Orders in This Category
            </div>
            <p style={{ fontSize: '0.85rem', maxWidth: 440, margin: '0.5rem auto 0' }}>
              {activeFilter === 'pending'
                ? 'No pending authorization requests. All incoming orders have been processed.'
                : 'No orders in this queue segment.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredBookings.map((b, idx) => (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  padding: '1.25rem 0',
                  borderBottom: idx < filteredBookings.length - 1 ? '1px solid var(--color-border)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                  <div style={{ width: 44, height: 44, background: '#FAF8F5', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Truck size={20} color="var(--color-teal)" />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
                      <span className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                        {b.booking_reference}
                      </span>
                      <span className={`status-badge ${getStatusBadge(b.status)}`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--color-slate)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>Customer:</span>{' '}
                        {b.consumer_name || 'Citizen'} • {b.consumer_phone || '+91 98490 00000'}
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>Address:</span>{' '}
                        {b.delivery_address}
                      </div>
                      <div>
                        <span className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }}>
                          {b.quantity_liters?.toLocaleString()} L
                        </span>
                        {' '}• Grade: {b.water_category?.toUpperCase()}{' '}
                        • Scheduled: {b.requested_date} at {b.scheduled_time || '11:00'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.65rem' }}>
                  <div>
                    <div className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-ink)', textAlign: 'right' }}>
                      ₹{b.agreed_price || b.quoted_price || 800}
                    </div>
                    <div className="micro-label" style={{ margin: 0, color: 'var(--color-teal)', textAlign: 'right' }}>
                      STATUTORY TARIFF
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {b.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(b.id, 'accept')}
                          className="btn btn-primary"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
                        >
                          <CheckCircle size={13} /> Accept
                        </button>
                        <button
                          onClick={() => handleAction(b.id, 'reject')}
                          className="btn btn-outline"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', color: 'var(--color-red)', borderColor: '#F5B8B8' }}
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </>
                    )}

                    {b.status === 'accepted' && (
                      <button
                        onClick={() => handleAction(b.id, 'start_delivery')}
                        className="btn btn-teal"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
                      >
                        <Navigation size={13} /> Dispatch Tanker
                      </button>
                    )}

                    {b.status === 'in_progress' && (
                      <button
                        onClick={() => handleAction(b.id, 'deliver')}
                        className="btn btn-primary"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', background: 'var(--color-teal)', borderColor: 'var(--color-teal)' }}
                      >
                        <CheckCircle size={13} /> Confirm Delivered
                      </button>
                    )}

                    {b.status === 'delivered' && (
                      <span className="status-badge badge-verified" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle size={12} /> Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
