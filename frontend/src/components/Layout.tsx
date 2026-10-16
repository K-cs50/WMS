import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import { notifAPI } from '../api'
import {
  Radio, Database, Map, BarChart3, FileText, Truck, Package,
  Phone, MessageSquare, Bell, User as UserIcon, Shield,
  LogOut, Activity, ChevronRight, Layers, ExternalLink, Clock, Globe
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (user) {
      notifAPI.unreadCount().then(r => setUnreadCount(r.data.count)).catch(() => {})
      const interval = setInterval(() => {
        notifAPI.unreadCount().then(r => setUnreadCount(r.data.count)).catch(() => {})
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'admin'
  const isProvider = user?.role === 'provider'
  const isMapPage = location.pathname === '/map'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-paper)' }}>
      {/* ─── Ink Navigation Rail ─── */}
      <aside className="nav-rail">
        {/* Masthead */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '2px', background: 'var(--color-teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
              fontSize: '0.9rem', color: '#FFFFFF', letterSpacing: '-0.02em', flexShrink: 0
            }}>
              WMS
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#F4F1E9', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                WMS
              </div>
              <div style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'var(--color-slate)', letterSpacing: '0.06em' }}>
                WATER MANAGEMENT & SUPPLY
              </div>
            </div>
          </div>
        </div>

        {/* User Badge / Jurisdiction */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F4F1E9' }}>{user?.full_name}</div>
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-teal)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {user?.is_locality_rep ? 'Locality Representative' : (user?.role || 'Citizen')}
              </div>
            </div>
            <span style={{
              padding: '2px 6px', borderRadius: '2px', fontSize: '0.6rem',
              fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase',
              background: isAdmin ? 'var(--color-orange)' : 'rgba(255,255,255,0.12)', color: '#FFFFFF'
            }}>
              {isAdmin ? 'ADMIN' : isProvider ? 'LOGISTICS' : 'WARD 10'}
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav style={{ flex: 1, padding: '0.75rem 0.6rem', overflowY: 'auto' }}>
          
          {/* Operations Core */}
          <div className="nav-section-title">{t.nav_operations}</div>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <Activity size={16} />
            <span>{t.nav_dashboard}</span>
          </NavLink>
          <NavLink to="/broadcasts" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <Radio size={16} />
            <span>{t.nav_bulletins}</span>
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <Map size={16} />
            <span>{t.nav_map}</span>
          </NavLink>
          <NavLink to="/forecast" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <BarChart3 size={16} />
            <span>{t.nav_forecast}</span>
          </NavLink>

          {/* Services & Community */}
          <div className="nav-section-title" style={{ marginTop: '0.5rem' }}>{t.nav_civic}</div>
          <NavLink to="/report" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <FileText size={16} />
            <span>{t.nav_report}</span>
          </NavLink>
          <NavLink to="/book-tanker" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <Truck size={16} />
            <span>{t.nav_book_tanker}</span>
          </NavLink>
          <NavLink to="/bulk-water" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <Package size={16} />
            <span>{t.nav_bulk_pooling}</span>
          </NavLink>

          {/* Transparency & AI */}
          <div className="nav-section-title" style={{ marginTop: '0.5rem' }}>{t.nav_provenance}</div>
          <NavLink to="/sources" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <Database size={16} />
            <span>{t.nav_sources}</span>
          </NavLink>
          <NavLink to="/contacts" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <Phone size={16} />
            <span>{t.nav_helplines}</span>
          </NavLink>
          <NavLink to="/assistant" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <MessageSquare size={16} />
            <span>{t.nav_aquaassist}</span>
          </NavLink>

          {/* Role-Specific Links */}
          {isProvider && (
            <>
              <div className="nav-section-title" style={{ marginTop: '0.5rem' }}>{t.nav_provider}</div>
              <NavLink to="/provider/bookings" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
                <Truck size={16} />
                <span>{t.nav_dispatches}</span>
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <div className="nav-section-title" style={{ marginTop: '0.5rem' }}>{t.nav_admin}</div>
              <NavLink to="/admin/reports" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
                <Shield size={16} />
                <span>{t.nav_audit}</span>
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
                <UserIcon size={16} />
                <span>{t.nav_citizens}</span>
              </NavLink>
            </>
          )}

          {/* System */}
          <div className="nav-section-title" style={{ marginTop: '0.5rem' }}>{t.nav_prefs}</div>
          <NavLink to="/notifications" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <Bell size={16} />
            <span>{t.nav_notifications}</span>
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 'auto', background: 'var(--color-orange)', color: '#FFFFFF',
                borderRadius: '2px', padding: '1px 5px', fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)', fontWeight: 700
              }}>
                {unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-rail-link ${isActive ? 'active' : ''}`}>
            <UserIcon size={16} />
            <span>{t.nav_profile}</span>
          </NavLink>
        </nav>

        {/* Footer Logout */}
        <div style={{ padding: '0.75rem 0.9rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
              padding: '0.5rem 0.6rem', background: 'transparent', border: 'none',
              color: 'var(--color-slate)', cursor: 'pointer', fontSize: '0.8rem',
              fontWeight: 600, fontFamily: 'var(--font-sans)', textAlign: 'left',
              borderRadius: '2px', transition: 'color 0.12s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-slate)')}
          >
            <LogOut size={15} />
            <span>{t.nav_signout}</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content Canvas ─── */}
      <main className="main-content" style={{
        flex: 1, minWidth: 0,
        padding: isMapPage ? '1.25rem 1.5rem' : '2rem 2.5rem'
      }}>
        {/* Operations Top Header */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.85rem',
          marginBottom: isMapPage ? '1rem' : '2rem',
          borderBottom: '1px solid var(--color-border)'
        }}>
          {/* Left Context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{
              background: 'var(--color-ink)', color: '#F4F1E9', padding: '3px 8px',
              borderRadius: '2px', fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
              fontWeight: 700, letterSpacing: '0.04em'
            }}>
              {t.header_telemetry}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-slate)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-teal)', display: 'inline-block' }} />
              {t.header_active}
            </span>
          </div>

          {/* Right IST Clock, Lang Switcher & Notifs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink)', fontWeight: 600 }}>
              <span style={{ color: 'var(--color-slate)' }}>IST: </span>
              {currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' • '}
              <span style={{ color: 'var(--color-teal)' }}>
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Language Switcher */}
            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
              {(['en', 'te', 'hi'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  title={l === 'en' ? 'English' : l === 'te' ? 'తెలుగు' : 'हिंदी'}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    fontFamily: l === 'en' ? 'var(--font-mono)' : 'var(--font-sans)',
                    border: 'none',
                    borderLeft: l !== 'en' ? '1px solid var(--color-border)' : 'none',
                    background: lang === l ? 'var(--color-ink)' : '#FFFFFF',
                    color: lang === l ? '#FFFFFF' : 'var(--color-slate)',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    letterSpacing: l === 'en' ? '0.04em' : '0',
                  }}
                >
                  {l === 'en' ? 'EN' : l === 'te' ? 'తె' : 'हि'}
                </button>
              ))}
            </div>

            <NavLink
              to="/notifications"
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: '2px', border: '1px solid var(--color-border)',
                background: '#FFFFFF', color: 'var(--color-ink)', textDecoration: 'none'
              }}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4, background: 'var(--color-orange)',
                  color: 'white', borderRadius: '2px', padding: '1px 4px', fontSize: '0.625rem',
                  fontFamily: 'var(--font-mono)', fontWeight: 700, lineHeight: 1
                }}>
                  {unreadCount}
                </span>
              )}
            </NavLink>
          </div>
        </header>

        {/* Page Slot */}
        <div>
          {children}
        </div>
      </main>
    </div>
  )
}
