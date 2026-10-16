import React, { useState, useEffect } from 'react'
import { notifAPI, alertAPI, localityAPI } from '../api'
import { useAuth } from '../AuthContext'
import {
  Bell, CheckCircle, Clock, AlertTriangle, ShieldCheck,
  CheckCheck, Thermometer, Truck, Settings, Plus, X, Info, Radio
} from 'lucide-react'

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [localities, setLocalities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'feed' | 'settings'>('feed')

  // Subscriptions form
  const [subLocalityId, setSubLocalityId] = useState<number>(user?.locality_id || 1)
  const [subChannel, setSubChannel] = useState<string>('in_app')
  const [subMsg, setSubMsg] = useState('')

  const loadNotifications = () => {
    setLoading(true)
    notifAPI.list()
      .then(res => setNotifications(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const loadSubscriptions = () => {
    alertAPI.mySubscriptions()
      .then(res => setSubscriptions(res.data))
      .catch(console.error)
  }

  useEffect(() => {
    loadNotifications()
    loadSubscriptions()
    localityAPI.search('').then(res => setLocalities(res.data)).catch(console.error)
  }, [])

  const handleMarkRead = async (id: number) => {
    try {
      await notifAPI.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notifAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await alertAPI.subscribe({
        locality_id: subLocalityId,
        alert_types: ['supply_start', 'delay', 'conflict', 'weather'],
        channel: subChannel,
      })
      setSubMsg('Statutory alert protocol updated for selected locality!')
      loadSubscriptions()
      setTimeout(() => setSubMsg(''), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Gazette Masthead */}
      <div className="gazette-masthead">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="micro-label" style={{ color: 'var(--color-teal)' }}>
              DISPATCH NOTICES // PUBLIC SERVICE TELEMETRY
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--color-ink)' }}>
              Statutory Water Advisories & Alerts
            </h1>
            <p style={{ margin: 0, color: 'var(--color-slate)', fontSize: '0.9rem', maxWidth: 660 }}>
              Official service interruptions, acute heatwave water advisories, pipeline maintenance updates, and carrier delivery slips.
            </p>
          </div>

          {/* Tab Selector */}
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', background: '#FFFFFF' }}>
            <button
              onClick={() => setActiveTab('feed')}
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'feed' ? 'var(--color-ink)' : 'transparent',
                color: activeTab === 'feed' ? '#FFFFFF' : 'var(--color-ink)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Bell size={14} /> Advisory Bulletin {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                borderLeft: '1px solid var(--border-color)',
                background: activeTab === 'settings' ? 'var(--color-ink)' : 'transparent',
                color: activeTab === 'settings' ? '#FFFFFF' : 'var(--color-ink)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Settings size={14} /> Subscription Protocols
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'feed' ? (
        <>
          {/* Action Bar */}
          <div className="card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem' }}>
              <span className="micro-label" style={{ margin: 0 }}>UNREAD ADVISORIES:</span>
              <span className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: unreadCount > 0 ? 'var(--color-orange)' : 'var(--color-teal)' }}>
                {unreadCount} Item{unreadCount === 1 ? '' : 's'} Pending
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <CheckCheck size={14} /> Acknowledge All Advisories
              </button>
            )}
          </div>

          {/* Feed List */}
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-slate)' }}>
              <div className="micro-label">ACCESSING MUNICIPAL ADVISORY LOG...</div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>Loading recent dispatch notices...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-slate)' }}>
              <CheckCircle size={36} color="var(--color-teal)" style={{ margin: '0 auto 0.75rem', opacity: 0.7 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-ink)', fontWeight: 600 }}>
                No Urgent Advisories on Record
              </div>
              <p style={{ fontSize: '0.85rem', maxWidth: 460, margin: '0.5rem auto 0' }}>
                All civic water supplies in your monitored zones are operating within scheduled parameters.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {notifications.map((n) => {
                const isUnread = !n.is_read
                return (
                  <div
                    key={n.id}
                    className="card"
                    style={{
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1.25rem',
                      background: isUnread ? '#FFFFFF' : '#FAF8F5',
                      borderLeft: isUnread ? '4px solid var(--color-orange)' : '4px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 38, height: 38, background: '#FAF8F5', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {n.notification_type === 'weather' ? (
                          <Thermometer size={18} color="var(--color-orange)" />
                        ) : n.notification_type === 'booking_update' ? (
                          <Truck size={18} color="var(--color-teal)" />
                        ) : (
                          <Bell size={18} color="var(--color-ink)" />
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
                          <span className="micro-label" style={{ color: isUnread ? 'var(--color-orange)' : 'var(--color-slate)', margin: 0 }}>
                            {n.notification_type ? n.notification_type.replace(/_/g, ' ').toUpperCase() : 'CIVIC NOTICE'}
                          </span>
                          <span className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-slate)' }}>
                            {n.created_at ? new Date(n.created_at).toLocaleString() : 'Recent'}
                          </span>
                          {isUnread && (
                            <span className="status-badge badge-stale" style={{ fontSize: '0.65rem' }}>
                              NEW
                            </span>
                          )}
                        </div>

                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.35rem' }}>
                          {n.title || 'Water Supply Operation Notice'}
                        </div>

                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink)', lineHeight: 1.5 }}>
                          {n.message}
                        </p>
                      </div>
                    </div>

                    {isUnread && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.74rem', whiteSpace: 'nowrap' }}
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        /* Settings View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {subMsg && (
            <div style={{ background: '#FAF8F5', borderLeft: '4px solid var(--color-teal)', color: 'var(--color-teal)', padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}>
              {subMsg}
            </div>
          )}

          <div className="card" style={{ padding: '1.75rem' }}>
            <div className="micro-label" style={{ color: 'var(--color-teal)' }}>STATUTORY SUBSCRIPTION PROTOCOL</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, margin: '0.2rem 0 0.5rem', color: 'var(--color-ink)' }}>
              Configure Monitored Supply Zones
            </h2>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--color-slate)', maxWidth: 640 }}>
              Register automated alerts for supply commencement, pressure drops, pipeline maintenance, and summer heatwave groundwater stress.
            </p>

            <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 560 }}>
              <div>
                <label className="form-label">Target Ward / Neighborhood</label>
                <select
                  className="form-input"
                  value={subLocalityId}
                  onChange={(e) => setSubLocalityId(Number(e.target.value))}
                >
                  {localities.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.zone ? `— ${loc.zone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Preferred Transmission Channel</label>
                <select
                  className="form-input"
                  value={subChannel}
                  onChange={(e) => setSubChannel(e.target.value)}
                >
                  <option value="in_app">In-App Operations Feed (Immediate)</option>
                  <option value="sms">Priority SMS Text Broadcast</option>
                  <option value="whatsapp">Direct WhatsApp Civic Dispatch</option>
                </select>
              </div>

              <div style={{ background: '#FAF8F5', border: '1px solid var(--border-color)', padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--color-slate)' }}>
                <strong>Alert Classes Included:</strong> Supply Timing Changes • Severe Pressure Drops • Contamination Alerts • Emergency Tanker Quotas.
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                Save Monitored Protocol
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
