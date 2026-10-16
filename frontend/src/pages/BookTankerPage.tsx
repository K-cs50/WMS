import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { providerAPI, localityAPI } from '../api'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import {
  Truck, CheckCircle, Clock, AlertCircle, Phone, MapPin,
  Calendar, ShieldCheck, DollarSign, X, Navigation, Filter, Info, ShieldAlert, Crosshair
} from 'lucide-react'

// Controller to dynamically pan/zoom map when user GPS updates
function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, 13)
  }, [center, map])
  return null
}

// Custom DivIcons for visual elegance and reliability
const userBeaconIcon = L.divIcon({
  className: 'user-pin-beacon',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#167D78;border:3px solid #FFFFFF;box-shadow:0 0 0 5px rgba(22,125,120,0.4);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const tankerPinIcon = L.divIcon({
  className: 'tanker-pin',
  html: `<div style="background:#172B32;color:#FFFFFF;padding:4px 8px;border-radius:3px;border:1px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px;"><span>🚛</span></div>`,
  iconSize: [32, 28],
  iconAnchor: [16, 14],
})

const nearestTankerPinIcon = L.divIcon({
  className: 'nearest-tanker-pin',
  html: `<div style="background:#C85A17;color:#FFFFFF;padding:4px 8px;border-radius:3px;border:2px solid #FFFFFF;box-shadow:0 0 0 4px rgba(200,90,23,0.35);font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;white-space:nowrap;"><span>🚚</span><span>NEAREST</span></div>`,
  iconSize: [85, 28],
  iconAnchor: [42, 14],
})

export default function BookTankerPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'browse' | 'orders'>('browse')
  const [localities, setLocalities] = useState<any[]>([])
  const [selectedLocalityId, setSelectedLocalityId] = useState<number>(user?.locality_id || 1)
  const [waterCategory, setWaterCategory] = useState<string>('potable')
  const [providers, setProviders] = useState<any[]>([])
  const [myBookings, setMyBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Live Location & Nearest Tanker state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [showLiveMap, setShowLiveMap] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [nearestProvider, setNearestProvider] = useState<any>(null)
  const [nearestDistance, setNearestDistance] = useState<number | null>(null)

  // Booking Modal State
  const [selectedProvider, setSelectedProvider] = useState<any>(null)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [quantityLiters, setQuantityLiters] = useState(5000)
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10))
  const [scheduledTime, setScheduledTime] = useState('11:00')
  const [consumerNotes, setConsumerNotes] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState('')
  const [bookingError, setBookingError] = useState('')

  // Tracking Modal State
  const [trackingBooking, setTrackingBooking] = useState<any>(null)
  const [trackingUpdates, setTrackingUpdates] = useState<any[]>([])

  useEffect(() => {
    localityAPI.search('').then(res => {
      setLocalities(res.data)
      if (!selectedLocalityId && res.data.length > 0) {
        setSelectedLocalityId(res.data[0].id)
      }
    }).catch(console.error)
  }, [])

  const loadProviders = () => {
    setLoading(true)
    providerAPI.list({ locality_id: selectedLocalityId })
      .then(res => setProviders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const loadMyBookings = () => {
    providerAPI.myBookings()
      .then(res => setMyBookings(res.data))
      .catch(console.error)
  }

  useEffect(() => {
    if (selectedLocalityId) {
      loadProviders()
    }
  }, [selectedLocalityId])

  useEffect(() => {
    if (activeTab === 'orders') {
      loadMyBookings()
    }
  }, [activeTab])

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setBookingLoading(true)
    setBookingError('')
    setBookingSuccess('')

    try {
      const payload = {
        provider_id: selectedProvider.id,
        locality_id: selectedLocalityId,
        delivery_address: deliveryAddress,
        water_category: waterCategory,
        quantity_liters: quantityLiters,
        requested_date: deliveryDate,
        scheduled_time: scheduledTime,
        consumer_notes: consumerNotes,
      }

      const res = await providerAPI.createBooking(payload)
      setBookingSuccess(`Booking confirmed! Reference: ${res.data.booking_reference}`)
      setTimeout(() => {
        setSelectedProvider(null)
        setActiveTab('orders')
        loadMyBookings()
      }, 1500)
    } catch (err: any) {
      setBookingError(err.response?.data?.detail || 'Failed to submit booking')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleOpenTracking = async (booking: any) => {
    setTrackingBooking(booking)
    try {
      const res = await providerAPI.getTracking(booking.id)
      setTrackingUpdates(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  // Haversine distance in km
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  // Hyderabad locality fallback coordinates
  const LOCALITY_COORDS: Record<number, [number, number]> = {
    1: [17.4399, 78.4983], // Jubilee Hills
    2: [17.4156, 78.4500], // Banjara Hills
    3: [17.4833, 78.3833], // Kondapur
    4: [17.3850, 78.4867], // Hyderabad central
    5: [17.4500, 78.3800], // Gachibowli
  }

  const getLocalityCoords = (locId: number): [number, number] => {
    const loc = localities.find(l => l.id === locId)
    if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      return [loc.latitude, loc.longitude]
    }
    return LOCALITY_COORDS[locId] || [17.3850, 78.4867]
  }

  const handleFindNearest = () => {
    setGpsError('')
    setGpsLoading(true)
    if (!navigator.geolocation) {
      setGpsError(t.book_no_gps)
      setGpsLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude
        const userLng = pos.coords.longitude
        setUserLocation([userLat, userLng])
        setShowLiveMap(true)
        setGpsLoading(false)

        // Find nearest provider by computing distance to each provider's locality
        let minDist = Infinity
        let nearest: any = null
        providers.forEach((prov) => {
          const coords = getLocalityCoords(prov.locality_id || selectedLocalityId)
          const d = haversineKm(userLat, userLng, coords[0], coords[1])
          if (d < minDist) {
            minDist = d
            nearest = prov
          }
        })
        setNearestProvider(nearest)
        setNearestDistance(nearest ? Math.round(minDist * 10) / 10 : null)
      },
      (err) => {
        setGpsError(t.book_no_gps)
        setGpsLoading(false)
      },
      { timeout: 10000, maximumAge: 60000 }
    )
  }

  // Calculate ETA based on urban transit velocity (~15-20 km/h)
  const estimatedEta = nearestDistance !== null ? Math.max(12, Math.round(nearestDistance * 4 + 8)) : null

  // Providers sorted by proximity to citizen when user location is known
  const sortedProviders = useMemo(() => {
    if (!userLocation) return providers
    return [...providers].sort((a, b) => {
      const aCoords = getLocalityCoords(a.locality_id || selectedLocalityId)
      const bCoords = getLocalityCoords(b.locality_id || selectedLocalityId)
      const distA = haversineKm(userLocation[0], userLocation[1], aCoords[0], aCoords[1])
      const distB = haversineKm(userLocation[0], userLocation[1], bCoords[0], bCoords[1])
      return distA - distB
    })
  }, [providers, userLocation, localities, selectedLocalityId])

  // Price estimate: approx ₹0.16 per liter for potable, ₹0.12 for non-potable
  const estimatedPrice = Math.round(quantityLiters * (waterCategory === 'potable' ? 0.16 : 0.12))

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Gazette Masthead */}
      <div className="gazette-masthead">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="micro-label" style={{ color: 'var(--color-teal)' }}>
              MUNICIPAL LOGISTICS // DISPATCH REGISTRY
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--color-ink)' }}>
              {t.book_title}
            </h1>
            <p style={{ margin: 0, color: 'var(--color-slate)', fontSize: '0.9rem', maxWidth: 680 }}>
              {t.book_subtitle}
            </p>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', background: '#FFFFFF' }}>
            <button
              onClick={() => setActiveTab('browse')}
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'browse' ? 'var(--color-ink)' : 'transparent',
                color: activeTab === 'browse' ? '#FFFFFF' : 'var(--color-ink)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Truck size={14} /> {t.book_carrier_dir}
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                borderLeft: '1px solid var(--border-color)',
                background: activeTab === 'orders' ? 'var(--color-ink)' : 'transparent',
                color: activeTab === 'orders' ? '#FFFFFF' : 'var(--color-ink)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Clock size={14} /> {t.book_dispatch_slips} ({myBookings.length})
            </button>
          </div>
        </div>
      </div>

      {/* Statutory Price Advisory Banner */}
      <div style={{
        background: '#FAF8F5',
        border: '1px solid var(--border-color)',
        borderLeft: '4px solid var(--color-teal)',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.82rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Info size={16} color="var(--color-teal)" />
          <span>{t.book_statutory}</span>
        </div>
        <div className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-slate)' }}>
          TARIFF-VERIFIED // HYD-2026-Q4
        </div>
      </div>

      {activeTab === 'browse' ? (
        <>
          {/* Live Location + Nearest Tanker Finder */}
          <div className="card" style={{ padding: '1.1rem 1.25rem', background: '#FAF8F5', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 38, height: 38, background: 'var(--color-teal)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Crosshair size={18} color="#FFFFFF" />
              </div>
              <div>
                <div className="micro-label" style={{ margin: 0, color: 'var(--color-teal)' }}>GPS LOCATION SERVICES</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-ink)', fontWeight: 600, marginTop: '0.15rem' }}>
                  {userLocation ? t.book_location_found : t.book_nearest_tanker}
                </div>
                {userLocation && (
                  <div className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-slate)', marginTop: '0.1rem' }}>
                    {userLocation[0].toFixed(5)}°N, {userLocation[1].toFixed(5)}°E
                  </div>
                )}
                {gpsError && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-red)', marginTop: '0.15rem' }}>{gpsError}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              {nearestProvider && nearestDistance !== null && (
                <div style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-teal)', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div>
                    <div className="micro-label" style={{ margin: 0, color: 'var(--color-teal)' }}>{t.book_nearest}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)', marginTop: '0.1rem' }}>
                      {nearestProvider.business_name}
                    </div>
                    <div className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-slate)', marginTop: '0.05rem' }}>
                      {t.book_distance}: <strong style={{ color: 'var(--color-teal)' }}>{nearestDistance} {t.km_away}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProvider(nearestProvider)}
                    className="btn btn-teal"
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
                  >
                    <Truck size={13} /> {t.book_request_dispatch}
                  </button>
                </div>
              )}
              {userLocation && (
                <button
                  type="button"
                  onClick={() => setShowLiveMap(!showLiveMap)}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}
                >
                  <Navigation size={14} />
                  {showLiveMap ? 'Hide Map' : 'View Live Map'}
                </button>
              )}
              <button
                onClick={handleFindNearest}
                disabled={gpsLoading}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}
              >
                <Crosshair size={14} className={gpsLoading ? 'animate-spin' : ''} />
                {gpsLoading ? t.book_locating : t.book_locate_me}
              </button>
            </div>
          </div>

          {/* Interactive Live Fleet Telemetry Map */}
          {showLiveMap && userLocation && (
            <div className="card" style={{ padding: '1rem', border: '1px solid var(--color-border)', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Navigation size={16} color="var(--color-teal)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)' }}>
                    {t.book_live_map}
                  </span>
                  {nearestDistance !== null && (
                    <span className="tabular-num" style={{ fontSize: '0.75rem', color: 'var(--color-teal)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      • {t.book_eta}: ~{estimatedEta} mins ({nearestDistance} {t.km_away})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowLiveMap(false)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                >
                  <X size={12} /> Hide Map
                </button>
              </div>

              <div style={{ height: 320, width: '100%', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <MapContainer
                  center={userLocation}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapController center={userLocation} />

                  {/* Citizen Live GPS Marker */}
                  <Marker position={userLocation} icon={userBeaconIcon}>
                    <Popup>
                      <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-sans)', padding: '2px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-teal)' }}>📍 {t.book_you_are_here}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                          {userLocation[0].toFixed(4)}°N, {userLocation[1].toFixed(4)}°E
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Tanker Providers */}
                  {providers.map((prov) => {
                    const provCoords = getLocalityCoords(prov.locality_id || selectedLocalityId)
                    const isNearest = nearestProvider?.id === prov.id
                    const dist = haversineKm(userLocation[0], userLocation[1], provCoords[0], provCoords[1])
                    const dRound = Math.round(dist * 10) / 10

                    return (
                      <React.Fragment key={prov.id}>
                        <Marker
                          position={provCoords}
                          icon={isNearest ? nearestTankerPinIcon : tankerPinIcon}
                        >
                          <Popup>
                            <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-sans)', minWidth: 190 }}>
                              <div style={{ fontWeight: 700, color: '#172B32' }}>{prov.business_name}</div>
                              <div style={{ fontSize: '0.75rem', color: isNearest ? '#C85A17' : '#167D78', fontWeight: 600, marginTop: '2px' }}>
                                {dRound} {t.km_away} {isNearest ? `• ~${estimatedEta} mins` : ''}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#777', marginTop: '2px' }}>
                                Desk: {prov.contact_phone || '+91 98490 12345'}
                              </div>
                              <button
                                onClick={() => setSelectedProvider(prov)}
                                style={{
                                  marginTop: '8px', width: '100%', padding: '5px 8px',
                                  background: '#167D78', color: '#fff', border: 'none',
                                  borderRadius: '2px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                                }}
                              >
                                {t.book_request_dispatch}
                              </button>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Connecting trajectory to nearest tanker */}
                        {isNearest && (
                          <Polyline
                            positions={[userLocation, provCoords]}
                            pathOptions={{ color: '#167D78', weight: 3, dashArray: '6, 6', opacity: 0.8 }}
                          />
                        )}
                      </React.Fragment>
                    )
                  })}
                </MapContainer>
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="card" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="micro-label" style={{ margin: 0 }}>{t.book_locality}</span>
                <select
                  className="form-input"
                  style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                  value={selectedLocalityId}
                  onChange={(e) => setSelectedLocalityId(Number(e.target.value))}
                >
                  {localities.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.zone ? `— ${loc.zone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="micro-label" style={{ margin: 0 }}>{t.book_grade}</span>
                <select
                  className="form-input"
                  style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                  value={waterCategory}
                  onChange={(e) => setWaterCategory(e.target.value)}
                >
                  <option value="potable">{t.book_grade_a}</option>
                  <option value="non_potable">{t.book_grade_b}</option>
                  <option value="irrigation">{t.book_grade_c}</option>
                </select>
              </div>
            </div>

            <div className="tabular-num" style={{ fontSize: '0.8rem', color: 'var(--color-slate)' }}>
              {providers.length > 0 ? `${providers.length} ${t.book_carriers}${providers.length === 1 ? '' : 's'}` : ''}
            </div>
          </div>

          {/* Providers List */}
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-slate)' }}>
              <div className="micro-label">INTERFACING MUNICIPAL FLEET TELEMETRY...</div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>Querying active tanker registration certificates for Ward Zone...</p>
            </div>
          ) : providers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-slate)' }}>
              <Truck size={36} color="var(--color-slate)" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-ink)', fontWeight: 600 }}>
                {t.book_no_carriers}
              </div>
              <p style={{ fontSize: '0.85rem', maxWidth: 480, margin: '0.5rem auto 1rem' }}>
                Currently no private carriers with active GPS validation are deployed in this ward. 
                You may dispatch an emergency municipal tanker via HMWS&SB Dial-a-Tanker at 155313.
              </p>
              <button onClick={() => setSelectedLocalityId(1)} className="btn btn-primary" style={{ margin: '0 auto' }}>
                Switch to Central Zone Registry
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {sortedProviders.map((prov) => {
                const provCoords = getLocalityCoords(prov.locality_id || selectedLocalityId)
                const provDist = userLocation ? Math.round(haversineKm(userLocation[0], userLocation[1], provCoords[0], provCoords[1]) * 10) / 10 : null
                const provEta = provDist !== null ? Math.max(12, Math.round(provDist * 4 + 8)) : null
                const isNearest = nearestProvider?.id === prov.id

                return (
                  <div
                    key={prov.id}
                    className="card"
                    style={{
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem',
                      border: isNearest ? '2px solid var(--color-teal)' : '1px solid var(--color-border)',
                      boxShadow: isNearest ? '0 0 0 3px rgba(22,125,120,0.12)' : undefined,
                      position: 'relative'
                    }}
                  >
                    {isNearest && (
                      <div style={{
                        position: 'absolute', top: -1, right: 12,
                        background: 'var(--color-teal)', color: '#FFFFFF',
                        fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                        padding: '2px 8px', letterSpacing: '0.06em'
                      }}>
                        📍 {t.book_nearest} · {nearestDistance} {t.km_away} (~{estimatedEta} min)
                      </div>
                    )}
                    <div>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
                              {prov.business_name}
                            </h2>
                            {prov.is_verified && (
                              <span title="Statutory Verification Passed" style={{ color: 'var(--color-teal)', display: 'inline-flex' }}>
                                <ShieldCheck size={16} />
                              </span>
                            )}
                          </div>
                          <div className="tabular-num" style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                            REG #{prov.registration_number || 'TS-WMS-CERT-904'}
                          </div>
                        </div>
                        <span className="status-badge badge-active" style={{ fontSize: '0.7rem' }}>
                          TELEMETRY VERIFIED
                        </span>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--color-ink)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                        {prov.description || 'Verified potable water transport with digital flow-metering and source provenance records.'}
                      </p>

                      {/* Operational Details Table */}
                      <div style={{ border: '1px solid var(--border-color)', background: '#FAF8F5', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-slate)' }}>Active Fleet Units:</span>
                          <span className="tabular-num" style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{prov.tankers?.length || 2} Tankers (GPS-tagged)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-slate)' }}>Operational Window:</span>
                          <span className="tabular-num" style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{prov.operating_hours || '06:00 — 22:00 IST'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-slate)' }}>Verified Dispatch Desk:</span>
                          <span className="tabular-num" style={{ fontWeight: 600, color: 'var(--color-teal)' }}>{prov.contact_phone || '+91 98490 12345'}</span>
                        </div>
                        {provDist !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                            <span style={{ color: 'var(--color-slate)', fontWeight: 600 }}>Proximity to Your GPS:</span>
                            <span className="tabular-num" style={{ fontWeight: 700, color: isNearest ? 'var(--color-orange)' : 'var(--color-teal)' }}>
                              {provDist} {t.km_away} (ETA: ~{provEta} mins)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={() => setSelectedProvider(prov)}
                        className={isNearest ? 'btn btn-teal' : 'btn btn-primary'}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <Truck size={14} /> {t.book_request_dispatch}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        /* Orders / Dispatch Slips View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {myBookings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-slate)' }}>
              <Clock size={36} color="var(--color-slate)" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-ink)', fontWeight: 600 }}>
                {t.book_no_orders}
              </div>
              <p style={{ fontSize: '0.85rem', maxWidth: 460, margin: '0.5rem auto 1rem' }}>
                You have no historical or in-flight tanker deliveries registered under this municipal session.
              </p>
              <button onClick={() => setActiveTab('browse')} className="btn btn-primary" style={{ margin: '0 auto' }}>
                {t.book_browse_dir}
              </button>
            </div>
          ) : (
            myBookings.map((b) => (
              <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: 44, height: 44, background: '#FAF8F5', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={22} color="var(--color-teal)" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                        {b.booking_reference}
                      </span>
                      <span className={`status-badge ${
                        b.status === 'delivered' ? 'badge-verified' :
                        b.status === 'in_progress' ? 'badge-active' :
                        b.status === 'accepted' ? 'badge-stale' : 'badge-disabled'
                      }`} style={{ fontSize: '0.7rem' }}>
                        {b.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-slate)', marginTop: '0.2rem' }}>
                      <span className="tabular-num" style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{b.quantity_liters?.toLocaleString()} Liters</span> • Grade: {b.water_category?.toUpperCase()} • Scheduled: {b.requested_date}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)', marginTop: '0.15rem' }}>
                      Destination: {b.delivery_address}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                      ₹{b.agreed_price || b.quoted_price || 800}
                    </div>
                    <div className="micro-label" style={{ margin: 0, color: 'var(--color-teal)' }}>
                      STATUTORY TARIFF
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenTracking(b)}
                    className="btn btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}
                  >
                    <Navigation size={14} /> View GPS Slip
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Booking Form Modal */}
      {selectedProvider && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(23, 43, 50, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 540, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div className="micro-label" style={{ color: 'var(--color-teal)' }}>DISPATCH AUTHORIZATION ORDER</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--color-ink)' }}>
                  Water Delivery Requisition
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-slate)', marginTop: '0.2rem' }}>
                  Carrier: <strong>{selectedProvider.business_name}</strong>
                </div>
              </div>
              <button onClick={() => setSelectedProvider(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate)' }}>
                <X size={20} />
              </button>
            </div>

            {bookingSuccess && (
              <div style={{ background: '#FAF8F5', borderLeft: '4px solid var(--color-teal)', color: 'var(--color-teal)', padding: '0.75rem 1rem', marginBottom: '1rem', fontWeight: 600, fontSize: '0.85rem' }}>
                {bookingSuccess}
              </div>
            )}

            {bookingError && (
              <div style={{ background: '#FAF8F5', borderLeft: '4px solid var(--color-critical)', color: 'var(--color-critical)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {bookingError}
              </div>
            )}

            <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Water Grade & Treatment Certification</label>
                <select
                  className="form-input"
                  value={waterCategory}
                  onChange={(e) => setWaterCategory(e.target.value)}
                >
                  <option value="potable">Grade A: Potable Drinking Water (Chlorinated & Tested)</option>
                  <option value="non_potable">Grade B: Utility / Domestic Sump Wash</option>
                </select>
              </div>

              <div>
                <label className="form-label">Requisition Volume (Liters)</label>
                <select
                  className="form-input"
                  value={quantityLiters}
                  onChange={(e) => setQuantityLiters(Number(e.target.value))}
                >
                  <option value={1000}>1,000 Liters — Mini Utility Carrier</option>
                  <option value={3000}>3,000 Liters — Standard Residential Tanker</option>
                  <option value={5000}>5,000 Liters — Medium Apartment Sump Delivery</option>
                  <option value={10000}>10,000 Liters — High-Capacity Heavy Tanker</option>
                </select>
              </div>

              <div>
                <label className="form-label">Delivery Street Address & Landmarks</label>
                <textarea
                  className="form-input"
                  rows={2}
                  required
                  placeholder="Street / House No., Society Name, Landmark (e.g. Near Water Tank, Road No. 45)"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Required Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Window Time (IST)</label>
                  <input
                    type="time"
                    className="form-input"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Price Calculation Box */}
              <div style={{ background: '#FAF8F5', border: '1px solid var(--border-color)', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="micro-label" style={{ margin: 0 }}>STATUTORY CEILING COST</div>
                  <div className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                    ₹{estimatedPrice}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="status-badge badge-active" style={{ fontSize: '0.7rem' }}>
                    NO SURGE MULTIPLIER
                  </span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-slate)', marginTop: '0.2rem' }}>
                    Payment upon flow-meter inspection
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={bookingLoading}
                style={{ justifyContent: 'center', padding: '0.85rem', marginTop: '0.5rem' }}
              >
                {bookingLoading ? 'Issuing Requisition Slip...' : 'Issue Water Dispatch Requisition'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Live Tracking Modal */}
      {trackingBooking && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(23, 43, 50, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', padding: '1.75rem', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div className="micro-label" style={{ color: 'var(--color-teal)' }}>GPS TELEMETRY SLIP</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--color-ink)' }}>
                  Delivery Progress Telemetry
                </h2>
                <div className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-slate)', marginTop: '0.2rem' }}>
                  REF #{trackingBooking.booking_reference}
                </div>
              </div>
              <button onClick={() => setTrackingBooking(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--color-slate)' }}>Current Carrier Status:</span>
                <span className="status-badge badge-active" style={{ textTransform: 'uppercase' }}>
                  {trackingBooking.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--color-slate)' }}>Delivery Destination:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-ink)', maxWidth: 260, textAlign: 'right' }}>
                  {trackingBooking.delivery_address}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--color-slate)' }}>Carrier Telemetry Logs:</span>
                <span className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }}>
                  {trackingUpdates.length} Waypoints Recorded
                </span>
              </div>
            </div>

            {/* Waypoint stream */}
            <div style={{ background: '#FAF8F5', border: '1px solid var(--border-color)', padding: '0.85rem 1rem', maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {trackingUpdates.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-slate)', textAlign: 'center', padding: '1rem' }}>
                  Carrier dispatching from hub. Live GPS lock establishing...
                </div>
              ) : (
                trackingUpdates.map((u, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-color)', paddingBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--color-ink)' }}>{u.status_message || 'In Transit'}</span>
                    <span className="tabular-num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-slate)' }}>{u.timestamp ? new Date(u.timestamp).toLocaleTimeString() : '11:15 IST'}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <button onClick={() => setTrackingBooking(null)} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                Close Telemetry View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
