import React, { useState, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { mapAPI, localityAPI, reportAPI, providerAPI } from '../api'
import { useAuth } from '../AuthContext'
import {
  Droplets, Truck, AlertTriangle, ShieldCheck, Info, Filter, MapPin,
  Search, Crosshair, Shield, Clock, AlertCircle, RefreshCw, Layers,
  ChevronRight, CheckCircle2, X, Send, Radio, Building2, PhoneCall,
  RotateCcw, ExternalLink, ArrowRight, Check
} from 'lucide-react'
import toast from 'react-hot-toast'

// Fix default leaflet marker asset paths
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const HYDERABAD_CENTER: [number, number] = [17.3850, 78.4867]
const DEFAULT_ZOOM = 12

// Custom Map Controller to smoothly pan & zoom
function MapController({ target, zoom }: { target: [number, number] | null; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo(target, zoom, { duration: 1.2, easeLinearity: 0.25 })
    }
  }, [target, zoom, map])
  return null
}

// Marker Icons for Reports by Verification Status
const createReportIcon = (status: string) => {
  let bg = '#75858A'
  let border = '#FFFFFF'
  let symbol = '💧'

  if (status === 'official') {
    bg = '#167D78'
    symbol = '🏛️'
  } else if (status === 'community_reported') {
    bg = '#1F7A3F'
    symbol = '✅'
  } else if (status === 'conflicting') {
    bg = '#D96B3B'
    symbol = '⚠️'
  } else if (status === 'outdated') {
    bg = '#8A979B'
    symbol = '🕒'
  }

  return new L.DivIcon({
    className: 'custom-report-marker',
    html: `<div style="
      background: ${bg};
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(23,43,50,0.35);
      border: 2px solid ${border};
      font-size: 12px;
      cursor: pointer;
    ">${symbol}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// Marker Icon for Tankers (Available vs Dispatched)
const createTankerIcon = (isAvailable: boolean) => {
  const bg = isAvailable ? '#1E6FBF' : '#75858A'
  const badgeColor = isAvailable ? '#16A34A' : '#D96B3B'

  return new L.DivIcon({
    className: 'custom-tanker-marker',
    html: `<div style="
      background: ${bg};
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(23,43,50,0.35);
      border: 2px solid #FFFFFF;
      position: relative;
      cursor: pointer;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
        <path d="M15 18H9"/>
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
        <circle cx="17" cy="18" r="2"/>
        <circle cx="7" cy="18" r="2"/>
      </svg>
      <span style="
        position: absolute;
        top: -4px;
        right: -4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${badgeColor};
        border: 2px solid #FFFFFF;
      "></span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

// User GPS Pin Icon
const userGpsIcon = new L.DivIcon({
  className: 'custom-user-gps-marker',
  html: `<div style="background: #B93838; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 6px rgba(185,56,56,0.25); border: 2px solid white; font-size: 12px;">
    📍
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

export default function WaterMapPage() {
  const { user } = useAuth()

  // Primary Data Collections
  const [localities, setLocalities] = useState<any[]>([])
  const [stressData, setStressData] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [tankers, setTankers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Map Controls State
  const [mapTarget, setMapTarget] = useState<[number, number] | null>(HYDERABAD_CENTER)
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM)
  const [selectedLocalityId, setSelectedLocalityId] = useState<number | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Layer Toggles
  const [showStress, setShowStress] = useState<boolean>(true)
  const [showReports, setShowReports] = useState<boolean>(true)
  const [showTankers, setShowTankers] = useState<boolean>(true)

  // Filters
  const [filterStress, setFilterStress] = useState<string>('all')
  const [filterReportType, setFilterReportType] = useState<string>('all')

  // Modals
  const [dispatchModalTanker, setDispatchModalTanker] = useState<any>(null)
  const [dispatchAddress, setDispatchAddress] = useState('')
  const [dispatchNotes, setDispatchNotes] = useState('')
  const [dispatchLoading, setDispatchLoading] = useState(false)

  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false)
  const [broadcastReportType, setBroadcastReportType] = useState('supply_delayed')
  const [broadcastStatus, setBroadcastStatus] = useState('Service Interruption')
  const [broadcastNote, setBroadcastNote] = useState('')
  const [broadcastExpectedTime, setBroadcastExpectedTime] = useState('')
  const [broadcastIsOfficial, setBroadcastIsOfficial] = useState(false)
  const [broadcastSource, setBroadcastSource] = useState('HMWS&SB Ward Operations Desk')
  const [broadcastLoading, setBroadcastLoading] = useState(false)

  const isAdmin = user?.role === 'admin'

  // Fetch initial telemetry
  const fetchAllTelemetry = async () => {
    try {
      setRefreshing(true)
      const [locsRes, stressRes, reportsRes, tankersRes] = await Promise.all([
        localityAPI.search('').catch(() => ({ data: [] })),
        mapAPI.stress().catch(() => ({ data: [] })),
        reportAPI.list({ limit: 60 }).catch(() => ({ data: [] })),
        mapAPI.tankers().catch(() => ({ data: [] })),
      ])

      const locs = locsRes.data || []
      setLocalities(locs)
      setStressData(stressRes.data || [])
      setReports(reportsRes.data || [])
      setTankers(tankersRes.data || [])
    } catch (err) {
      console.error('Failed to load map data', err)
      toast.error('Unable to fetch live geospatial telemetry')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAllTelemetry()
  }, [])

  // Currently selected locality object
  const currentLocality = useMemo(() => {
    if (!selectedLocalityId) return null
    return localities.find(l => l.id === selectedLocalityId) || null
  }, [selectedLocalityId, localities])

  // Handle locality selection
  const handleSelectLocality = (locId: number | null) => {
    setSelectedLocalityId(locId)

    if (locId === null) {
      // Reset to All Hyderabad View
      setMapTarget(HYDERABAD_CENTER)
      setMapZoom(DEFAULT_ZOOM)
      setSelectedEntity(null)
      return
    }

    const loc = localities.find(l => l.id === locId)
    if (loc && loc.latitude && loc.longitude) {
      setMapTarget([loc.latitude, loc.longitude])
      setMapZoom(14)
      const stress = stressData.find(s => s.locality_id === loc.id)
      setSelectedEntity({
        type: 'locality',
        locality_id: loc.id,
        locality_name: loc.name,
        district: loc.district,
        zone: loc.zone,
        ward: loc.ward,
        postal_code: loc.postal_code,
        latitude: loc.latitude,
        longitude: loc.longitude,
        stress_level: stress?.stress_level || 'moderate',
        stress_label: stress?.stress_label || 'Groundwater and surface supply under routine monitoring',
        groundwater_level_m: stress?.groundwater_level_m,
        reservoir_storage_pct: stress?.reservoir_storage_pct,
        data_source: stress?.data_source || 'CGWB & HMWSSB Telemetry Grid',
        is_official: stress?.is_official || false,
        is_demo: stress?.is_demo ?? true,
        observation_date: stress?.observation_date || new Date().toISOString().slice(0, 10),
      })
    }
  }

  // Filtered stress indicators based on locality selection and stress filter
  const filteredStress = useMemo(() => {
    return stressData.filter((loc) => {
      if (selectedLocalityId && loc.locality_id !== selectedLocalityId) {
        return false
      }
      if (filterStress === 'critical') return loc.stress_level === 'critical'
      if (filterStress === 'high') return loc.stress_level === 'high' || loc.stress_level === 'critical'
      if (filterStress === 'moderate') return loc.stress_level === 'moderate'
      if (filterStress === 'low') return loc.stress_level === 'low'
      return true
    })
  }, [stressData, selectedLocalityId, filterStress])

  // Filtered reports based on locality selection and verification filter
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      if (!rep.latitude || !rep.longitude) return false
      if (selectedLocalityId && rep.locality_id !== selectedLocalityId) {
        // Also check affected localities if broadcast
        const affected = rep.affected_locality_ids || []
        if (!affected.includes(selectedLocalityId)) {
          return false
        }
      }
      if (filterReportType === 'official') return rep.verification_status === 'official'
      if (filterReportType === 'community_reported') return rep.verification_status === 'community_reported'
      if (filterReportType === 'conflicting') return rep.verification_status === 'conflicting'
      if (filterReportType === 'outdated') return rep.verification_status === 'outdated'
      return true
    })
  }, [reports, selectedLocalityId, filterReportType])

  // Tankers eligible for currently selected locality
  const eligibleTankersForLocality = useMemo(() => {
    if (!selectedLocalityId) return tankers
    return tankers.filter((t) => {
      return (t.supported_localities || []).some((l: any) => l.id === selectedLocalityId)
    })
  }, [tankers, selectedLocalityId])

  // Filtered tankers visible on map
  const filteredTankersOnMap = useMemo(() => {
    return eligibleTankersForLocality.filter((t) => {
      return t.latitude && t.longitude
    })
  }, [eligibleTankersForLocality])

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return localities.filter(
      l => l.name.toLowerCase().includes(q) ||
           (l.district && l.district.toLowerCase().includes(q)) ||
           (l.ward && l.ward.toLowerCase().includes(q))
    ).slice(0, 6)
  }, [searchQuery, localities])

  // Geolocation Handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.')
      return
    }

    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserLocation(coords)
        setMapTarget(coords)
        setMapZoom(14)
        setGpsLoading(false)

        // Find nearest locality
        let nearest: any = null
        let minDistance = Infinity
        localities.forEach((loc) => {
          if (loc.latitude && loc.longitude) {
            const dist = Math.hypot(loc.latitude - coords[0], loc.longitude - coords[1])
            if (dist < minDistance) {
              minDistance = dist
              nearest = loc
            }
          }
        })

        if (nearest) {
          handleSelectLocality(nearest.id)
          toast.success(`Closest monitored locality: ${nearest.name}`)
        } else {
          toast.success('Position identified on Hyderabad grid')
        }
      },
      (err) => {
        setGpsLoading(false)
        let msg = 'Could not access location.'
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Select a locality from the dropdown.'
        }
        toast.error(msg)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Get color by stress level
  const getStressColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical': return '#DC2626'
      case 'high': return '#EA580C'
      case 'moderate': return '#D97706'
      case 'low': return '#167D78'
      default: return '#167D78'
    }
  }

  // Tanker Dispatch Execution
  const handleExecuteDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispatchModalTanker || !selectedLocalityId) {
      toast.error('Select a valid target locality first')
      return
    }

    setDispatchLoading(true)
    try {
      const res = await providerAPI.dispatchTanker(dispatchModalTanker.id, {
        locality_id: selectedLocalityId,
        delivery_address: dispatchAddress || `Priority Municipal Dispatch to ${currentLocality?.name}`,
        consumer_notes: dispatchNotes || `Urgent deployment for ${currentLocality?.name}`,
      })

      toast.success(res.data.message || 'Tanker dispatched successfully')
      setDispatchModalTanker(null)
      setDispatchAddress('')
      setDispatchNotes('')

      // Refresh telemetry
      await fetchAllTelemetry()

      // If entity inspector was displaying this tanker or locality, update it
      if (selectedEntity?.type === 'tanker' && selectedEntity.id === dispatchModalTanker.id) {
        setSelectedEntity({
          ...selectedEntity,
          is_available: false,
          current_dispatch: {
            locality_id: selectedLocalityId,
            locality_name: currentLocality?.name,
            status: 'in_progress',
          }
        })
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.detail || 'Failed to dispatch tanker')
    } finally {
      setDispatchLoading(false)
    }
  }

  // Tanker Return / Release Execution
  const handleReturnTanker = async (tankerId: number) => {
    try {
      const res = await providerAPI.returnTanker(tankerId)
      toast.success(res.data.message || 'Tanker marked as returned and available')
      await fetchAllTelemetry()
      if (selectedEntity?.type === 'tanker' && selectedEntity.id === tankerId) {
        setSelectedEntity({
          ...selectedEntity,
          is_available: true,
          current_dispatch: null,
        })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update tanker status')
    }
  }

  // Broadcast Locality Report Submission
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocalityId) {
      toast.error('Please select a locality to broadcast for')
      return
    }

    setBroadcastLoading(true)
    try {
      if (broadcastIsOfficial && !isAdmin) {
        toast.error('Only authenticated Municipal Admins can publish official notices.')
        setBroadcastLoading(false)
        return
      }

      await reportAPI.broadcast({
        locality_id: selectedLocalityId,
        affected_locality_ids: [selectedLocalityId],
        report_type: broadcastReportType,
        expected_supply_time: broadcastExpectedTime || undefined,
        water_availability_status: broadcastStatus || 'Notice Issued',
        description: broadcastNote.trim() || `Advisory bulletin for ${currentLocality?.name}`,
        source: broadcastSource.trim() || (broadcastIsOfficial ? 'HMWS&SB Gazette Desk' : 'Ward Operations Liaison'),
        is_official: isAdmin && broadcastIsOfficial,
        observed_at: new Date().toISOString(),
      })

      toast.success(`Locality bulletin broadcast published for ${currentLocality?.name}`)
      setBroadcastModalOpen(false)
      setBroadcastNote('')
      setBroadcastExpectedTime('')
      await fetchAllTelemetry()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to publish locality broadcast')
    } finally {
      setBroadcastLoading(false)
    }
  }

  // Quick Locality Chips
  const popularLocalities = ['LB Nagar', 'Uppal', 'Kukatpally', 'Banjara Hills', 'Dilsukhnagar', 'Vanasthalipuram']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      
      {/* ─── Top Horizontal Operations Toolbar ─── */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          
          {/* Left: Locality Selector + Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, fontSize: '0.8rem', color: 'var(--color-ink)' }}>
              <MapPin size={15} color="var(--color-teal)" />
              <span className="micro-label" style={{ color: 'var(--color-ink)' }}>Locality:</span>
            </div>

            {/* Dropdown Selector */}
            <select
              className="form-select"
              style={{ width: '190px', padding: '0.35rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}
              value={selectedLocalityId || ''}
              onChange={(e) => handleSelectLocality(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All Hyderabad View</option>
              {localities.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.zone || loc.district || 'Hyd'})
                </option>
              ))}
            </select>

            {/* All Hyderabad Reset Button */}
            {selectedLocalityId && (
              <button
                onClick={() => handleSelectLocality(null)}
                className="btn btn-outline"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', fontWeight: 700 }}
                title="Return to overall Hyderabad map view"
              >
                <RotateCcw size={12} /> Reset to Hyderabad Overview
              </button>
            )}

            {/* Quick Locality Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: '0.2rem' }}>
              {popularLocalities.map(pName => {
                const loc = localities.find(l => l.name === pName)
                if (!loc) return null
                const isSelected = selectedLocalityId === loc.id
                return (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectLocality(isSelected ? null : loc.id)}
                    style={{
                      border: `1px solid ${isSelected ? 'var(--color-teal)' : 'var(--color-border)'}`,
                      background: isSelected ? 'var(--color-teal)' : 'var(--color-surface)',
                      color: isSelected ? '#FFFFFF' : 'var(--color-ink)',
                      borderRadius: '3px',
                      padding: '2px 7px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {loc.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Center / Right: Layer Controls & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--color-slate)" style={{ position: 'absolute', left: 8, top: 9 }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search locality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '1.75rem', width: 170, padding: '0.3rem 0.5rem 0.3rem 1.75rem', fontSize: '0.78rem' }}
              />
              {searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF',
                  boxShadow: '0 6px 16px rgba(23,43,50,0.18)', borderRadius: '3px', zIndex: 1100,
                  border: '1px solid var(--color-border)', marginTop: '2px'
                }}>
                  {searchResults.map(loc => (
                    <div
                      key={loc.id}
                      onClick={() => {
                        handleSelectLocality(loc.id)
                        setSearchQuery('')
                      }}
                      style={{
                        padding: '0.45rem 0.65rem', fontSize: '0.78rem', cursor: 'pointer',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        display: 'flex', justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                    >
                      <span style={{ fontWeight: 700 }}>{loc.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-slate)' }}>{loc.zone || loc.district}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GPS Locate Me */}
            <button
              onClick={handleLocateMe}
              disabled={gpsLoading}
              className="btn btn-outline"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}
              title="Locate via GPS"
            >
              <Crosshair size={13} className={gpsLoading ? 'animate-spin' : ''} />
              <span>{gpsLoading ? 'Locating...' : 'Locate Me'}</span>
            </button>

            {/* Refresh Telemetry */}
            <button
              onClick={fetchAllTelemetry}
              disabled={refreshing}
              className="btn btn-ghost"
              style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
              title="Refresh live map telemetry"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

        </div>

        {/* Second Row: Layer Toggles & Filter Dropdowns */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.65rem', paddingTop: '0.65rem',
          borderTop: '1px solid var(--color-border-subtle)'
        }}>
          {/* Layer Checkboxes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, color: 'var(--color-ink)' }}>
              <Layers size={14} color="var(--color-teal)" />
              <span className="micro-label" style={{ color: 'var(--color-ink)' }}>Active Layers:</span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={showStress}
                onChange={(e) => setShowStress(e.target.checked)}
                style={{ accentColor: 'var(--color-teal)' }}
              />
              <span>Water Stress Index ({filteredStress.length})</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={showReports}
                onChange={(e) => setShowReports(e.target.checked)}
                style={{ accentColor: 'var(--color-teal)' }}
              />
              <span>Water Supply Reports ({filteredReports.length})</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={showTankers}
                onChange={(e) => setShowTankers(e.target.checked)}
                style={{ accentColor: 'var(--color-teal)' }}
              />
              <span>Active Tankers ({filteredTankersOnMap.length})</span>
            </label>
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: 'var(--color-slate)', fontWeight: 600 }}>Stress Level:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '28px' }}
                value={filterStress}
                onChange={(e) => setFilterStress(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="critical">Critical Only</option>
                <option value="high">High & Critical</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: 'var(--color-slate)', fontWeight: 600 }}>Report Type:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '28px' }}
                value={filterReportType}
                onChange={(e) => setFilterReportType(e.target.value)}
              >
                <option value="all">All Reports</option>
                <option value="official">Official Notices (HMWS&SB)</option>
                <option value="community_reported">Community Verified</option>
                <option value="conflicting">Conflicting Observations</option>
                <option value="outdated">Outdated (&gt; 2h)</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Main Map + Entity Inspector Grid ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 380px',
        gap: '1rem',
        height: 'calc(100vh - 195px)',
        minHeight: '620px'
      }}>
        
        {/* Central Interactive Leaflet Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '100%', position: 'relative', border: '1px solid var(--color-border)' }}>
          <MapContainer
            center={HYDERABAD_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController target={mapTarget} zoom={mapZoom} />

            {/* 1. Water Stress Heat Markers */}
            {showStress && filteredStress.map((loc) => {
              const lat = loc.latitude || 17.385
              const lng = loc.longitude || 78.486
              const color = getStressColor(loc.stress_level)
              const isSelected = selectedLocalityId === loc.locality_id

              return (
                <CircleMarker
                  key={`stress-${loc.locality_id}`}
                  center={[lat, lng]}
                  radius={isSelected ? 24 : 18}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: isSelected ? 0.75 : 0.55,
                    color: isSelected ? '#172B32' : '#FFFFFF',
                    weight: isSelected ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => handleSelectLocality(loc.locality_id),
                  }}
                >
                  <Popup>
                    <div style={{ padding: '0.2rem', minWidth: 200 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-ink)' }}>{loc.locality_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-slate)', marginBottom: '0.4rem' }}>
                        Zone: {loc.zone || 'Central'} • Lat/Lng: {lat.toFixed(4)}, {lng.toFixed(4)}
                      </div>
                      <div style={{
                        display: 'inline-block', background: color, color: '#FFFFFF',
                        padding: '1px 6px', borderRadius: '2px', fontSize: '0.7rem',
                        fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem'
                      }}>
                        {loc.stress_level} Stress
                      </div>
                      <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div><strong>Groundwater:</strong> {loc.groundwater_level_m ? `${loc.groundwater_level_m} m bgl` : 'Monitored'}</div>
                        <div><strong>Reservoir:</strong> {loc.reservoir_storage_pct ? `${loc.reservoir_storage_pct}%` : '55%'}</div>
                        <div><strong>Source:</strong> {loc.data_source || 'CGWB & HMWSSB'}</div>
                      </div>
                      <div style={{ marginTop: '0.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.35rem' }}>
                        <button
                          onClick={() => handleSelectLocality(loc.locality_id)}
                          style={{
                            background: 'none', border: 'none', color: 'var(--color-teal)',
                            padding: 0, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.2rem'
                          }}
                        >
                          Inspect Locality Details <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}

            {/* Selected Locality Outer Pulse Halo */}
            {selectedLocalityId && currentLocality && currentLocality.latitude && currentLocality.longitude && (
              <CircleMarker
                center={[currentLocality.latitude, currentLocality.longitude]}
                radius={36}
                pathOptions={{
                  fillColor: 'transparent',
                  color: 'var(--color-teal)',
                  weight: 2,
                  dashArray: '4, 4',
                }}
              />
            )}

            {/* 2. Water Supply Reports Markers */}
            {showReports && filteredReports.map((rep) => {
              const lat = rep.latitude
              const lng = rep.longitude
              const icon = createReportIcon(rep.verification_status)

              return (
                <Marker
                  key={`report-${rep.id}`}
                  position={[lat, lng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedEntity({ ...rep, type: 'report' }),
                  }}
                >
                  <Popup>
                    <div style={{ padding: '0.2rem', maxWidth: 220 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-ink)' }}>{rep.locality_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-teal)', fontWeight: 700, margin: '0.2rem 0' }}>
                        {rep.water_availability_status || rep.report_type?.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-ink)', marginBottom: '0.35rem', lineHeight: 1.35 }}>
                        {rep.note ? (rep.note.length > 70 ? rep.note.substring(0, 70) + '...' : rep.note) : 'Report recorded.'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)' }}>
                        Source: <strong>{rep.source}</strong>
                      </div>
                      <button
                        onClick={() => setSelectedEntity({ ...rep, type: 'report' })}
                        style={{
                          background: 'none', border: 'none', color: 'var(--color-teal)',
                          padding: 0, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.4rem'
                        }}
                      >
                        View in Inspector <ArrowRight size={11} />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* 3. Delivery Tanker Markers */}
            {showTankers && filteredTankersOnMap.map((tanker) => {
              const icon = createTankerIcon(tanker.is_available)
              return (
                <Marker
                  key={`tanker-${tanker.id}`}
                  position={[tanker.latitude, tanker.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedEntity({ ...tanker, type: 'tanker' }),
                  }}
                >
                  <Popup>
                    <div style={{ padding: '0.25rem', minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-ink)', fontWeight: 800, fontSize: '0.85rem' }}>
                        <Truck size={14} color="var(--color-teal)" /> {tanker.provider_name}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', margin: '0.2rem 0', fontFamily: 'var(--font-mono)' }}>
                        {tanker.registration_number}
                      </div>
                      <div style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: tanker.is_available ? '#16A34A' : '#D96B3B',
                        marginBottom: '0.35rem'
                      }}>
                        {tanker.is_available ? '● Available for Dispatch' : '● Dispatched / Active'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-slate)' }}>
                        Capacity: {tanker.capacity_liters?.toLocaleString()} Liters ({tanker.water_category})
                      </div>
                      <button
                        onClick={() => setSelectedEntity({ ...tanker, type: 'tanker' })}
                        style={{
                          background: 'none', border: 'none', color: 'var(--color-teal)',
                          padding: 0, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.4rem'
                        }}
                      >
                        Inspect Tanker Status <ArrowRight size={11} />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* User GPS Pin if active */}
            {userLocation && (
              <Marker position={userLocation} icon={userGpsIcon}>
                <Popup>
                  <div style={{ padding: '0.2rem', fontWeight: 700, fontSize: '0.8rem' }}>
                    📍 Your Position: {userLocation[0].toFixed(4)}° N, {userLocation[1].toFixed(4)}° E
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Floating Map Legend (Bottom-Left) */}
          <div style={{
            position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(8px)',
            borderRadius: '3px', padding: '0.7rem 0.9rem', boxShadow: '0 4px 14px rgba(23,43,50,0.15)',
            fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.35rem',
            border: '1px solid var(--color-border)', maxWidth: 220
          }}>
            <div style={{ fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
              Map Symbols & Legend
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#DC2626', border: '1px solid #B91C1C' }} />
              <span>Critical Stress Area</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#167D78', border: '1px solid #11625E' }} />
              <span>Low / Normal Stress Area</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#167D78', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>🏛️</span>
              <span>Official HMWS&SB Notice</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#1F7A3F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>✅</span>
              <span>Community Ground Report</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#D96B3B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>⚠️</span>
              <span>Conflicting / Unverified</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 14, height: 14, borderRadius: '2px', background: '#1E6FBF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>🚚</span>
              <span>Available Tanker</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 14, height: 14, borderRadius: '2px', background: '#75858A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>🚚</span>
              <span>Dispatched Tanker</span>
            </div>
          </div>
        </div>

        {/* ─── Right-Side Entity Inspector Panel ─── */}
        <div className="card" style={{
          display: 'flex', flexDirection: 'column', height: '100%',
          overflowY: 'auto', padding: '1.25rem', border: '1px solid var(--color-border)',
          background: 'var(--color-surface)'
        }}>
          
          {/* Header of Inspector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={14} color="var(--color-teal)" />
              <div className="micro-label" style={{ color: 'var(--color-ink)', margin: 0 }}>
                Entity Inspector
              </div>
            </div>
            {selectedLocalityId && (
              <span style={{
                background: 'var(--color-teal-light)', color: 'var(--color-teal)',
                padding: '2px 6px', borderRadius: '2px', fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)', fontWeight: 700
              }}>
                WARD SCOPE ACTIVE
              </span>
            )}
          </div>

          {/* Dynamic Inspector Content */}
          <div style={{ flex: 1 }}>
            {selectedEntity ? (
              <div>
                {/* ─── Entity Type: Locality ─── */}
                {selectedEntity.type === 'locality' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
                            {selectedEntity.locality_name}
                          </h2>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '0.15rem' }}>
                            Zone: <strong>{selectedEntity.zone || 'Central Area'}</strong> • {selectedEntity.district || 'Hyderabad'}
                            {selectedEntity.postal_code && ` • PIN: ${selectedEntity.postal_code}`}
                          </div>
                        </div>

                        <span style={{
                          background: selectedEntity.stress_level === 'critical' ? '#FCE8E8' : selectedEntity.stress_level === 'high' ? '#FDF1EA' : 'var(--color-teal-light)',
                          color: selectedEntity.stress_level === 'critical' ? '#B93838' : selectedEntity.stress_level === 'high' ? '#D96B3B' : 'var(--color-teal)',
                          padding: '3px 8px', borderRadius: '2px', fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)', fontWeight: 800, textTransform: 'uppercase'
                        }}>
                          {selectedEntity.stress_level} STRESS
                        </span>
                      </div>
                    </div>

                    {/* Stress Assessment Card */}
                    <div style={{
                      padding: '0.75rem', borderRadius: '3px',
                      background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)',
                      fontSize: '0.78rem'
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                        Geospatial Stress Assessment
                      </div>
                      <div style={{ color: 'var(--color-slate)', fontSize: '0.75rem', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                        {selectedEntity.stress_label}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '0.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Groundwater Level</div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>
                            {selectedEntity.groundwater_level_m ? `${selectedEntity.groundwater_level_m} m bgl` : '20.5 m bgl'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Reservoir Storage</div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>
                            {selectedEntity.reservoir_storage_pct ? `${selectedEntity.reservoir_storage_pct}%` : '55%'}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Source: <strong>{selectedEntity.data_source}</strong></span>
                        <span style={{ color: selectedEntity.is_demo ? 'var(--color-orange)' : 'var(--color-teal)' }}>
                          {selectedEntity.is_demo ? 'DEMO TELEMETRY' : 'VERIFIED OFFICIAL'}
                        </span>
                      </div>
                    </div>

                    {/* Eligible Tankers Section for THIS Locality */}
                    <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.78rem' }}>
                          <Truck size={14} color="var(--color-teal)" />
                          <span>Locality Tanker Fleet ({eligibleTankersForLocality.length})</span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-slate)' }}>
                          Authorized service units
                        </span>
                      </div>

                      {eligibleTankersForLocality.length === 0 ? (
                        <div style={{
                          padding: '0.85rem', background: 'var(--color-surface-subtle)',
                          borderRadius: '3px', fontSize: '0.75rem', color: 'var(--color-slate)',
                          textAlign: 'center'
                        }}>
                          No registered tanker providers currently cover {selectedEntity.locality_name}.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '180px', overflowY: 'auto' }}>
                          {eligibleTankersForLocality.map((t) => (
                            <div
                              key={t.id}
                              style={{
                                padding: '0.55rem 0.65rem',
                                background: t.is_available ? '#FFFFFF' : 'var(--color-surface-subtle)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '3px',
                                fontSize: '0.75rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{t.registration_number}</span>
                                  <span style={{
                                    fontSize: '0.625rem', padding: '1px 4px', borderRadius: '2px',
                                    background: t.is_available ? '#EAF5ED' : '#FDF1EA',
                                    color: t.is_available ? '#1F7A3F' : '#D96B3B',
                                    fontWeight: 700
                                  }}>
                                    {t.is_available ? 'AVAILABLE' : 'DISPATCHED'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)', marginTop: '0.1rem' }}>
                                  {t.capacity_liters?.toLocaleString()}L • {t.water_category} • {t.provider_name}
                                </div>
                              </div>

                              <div>
                                {t.is_available ? (
                                  <button
                                    onClick={() => setDispatchModalTanker(t)}
                                    className="btn btn-teal"
                                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.68rem', fontWeight: 700 }}
                                  >
                                    Dispatch Tanker
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleReturnTanker(t.id)}
                                    className="btn btn-outline"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
                                    title="Mark tanker returned"
                                  >
                                    Release
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Locality Ground Reports */}
                    <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '0.75rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                        Recent Supply Reports in {selectedEntity.locality_name} ({filteredReports.length})
                      </div>

                      {filteredReports.length === 0 ? (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-slate)', fontStyle: 'italic' }}>
                          No recent incident reports filed for this locality window.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto' }}>
                          {filteredReports.slice(0, 3).map((r) => (
                            <div
                              key={r.id}
                              onClick={() => setSelectedEntity({ ...r, type: 'report' })}
                              style={{
                                padding: '0.45rem', background: 'var(--color-surface-subtle)',
                                border: '1px solid var(--color-border-subtle)', borderRadius: '2px',
                                fontSize: '0.72rem', cursor: 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                <span>{r.water_availability_status}</span>
                                <span style={{
                                  fontSize: '0.625rem',
                                  color: r.verification_status === 'official' ? 'var(--color-teal)' : '#1F7A3F'
                                }}>
                                  {r.verification_status?.toUpperCase()}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)', marginTop: '0.15rem' }}>
                                "{r.note?.substring(0, 65)}..."
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* ─── Entity Type: Report ─── */}
                {selectedEntity.type === 'report' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <div style={{ display: 'inline-block', marginBottom: '0.4rem' }}>
                        <span style={{
                          background: selectedEntity.verification_status === 'official' ? 'var(--color-teal-light)' : selectedEntity.verification_status === 'community_reported' ? '#EAF5ED' : '#FDF1EA',
                          color: selectedEntity.verification_status === 'official' ? 'var(--color-teal)' : selectedEntity.verification_status === 'community_reported' ? '#1F7A3F' : '#D96B3B',
                          padding: '2px 8px', borderRadius: '2px', fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)', fontWeight: 800, textTransform: 'uppercase'
                        }}>
                          {selectedEntity.verification_status === 'official' ? '🏛️ Official HMWS&SB Notice' :
                           selectedEntity.verification_status === 'community_reported' ? '✅ Community Verified' :
                           selectedEntity.verification_status === 'conflicting' ? '⚠️ Conflicting Report' : '🕒 Outdated Report'}
                        </span>
                      </div>

                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
                        {selectedEntity.locality_name}
                      </h2>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-teal)', fontWeight: 700, margin: '0.2rem 0' }}>
                        Status: {selectedEntity.water_availability_status}
                      </div>
                    </div>

                    <div style={{
                      padding: '0.75rem', background: 'var(--color-surface-subtle)',
                      borderRadius: '3px', fontSize: '0.78rem', color: 'var(--color-ink)',
                      lineHeight: 1.45, border: '1px solid var(--color-border)'
                    }}>
                      "{selectedEntity.note}"
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--color-slate)' }}>Reported Schedule:</span>
                        <span style={{ fontWeight: 600 }}>{selectedEntity.expected_supply_time || 'Regular Cycle'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--color-slate)' }}>Observation Time:</span>
                        <span style={{ fontWeight: 600 }}>{selectedEntity.observed_at ? new Date(selectedEntity.observed_at).toLocaleTimeString() : 'Recent'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--color-slate)' }}>Data Source:</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-teal)' }}>{selectedEntity.source}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--color-slate)' }}>Reporter Attribution:</span>
                        <span style={{ fontWeight: 600 }}>{selectedEntity.reporter_name || 'Citizen'}</span>
                      </div>
                    </div>

                    {selectedLocalityId && (
                      <button
                        onClick={() => handleSelectLocality(selectedLocalityId)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}
                      >
                        Return to {selectedEntity.locality_name} Locality View
                      </button>
                    )}
                  </div>
                )}

                {/* ─── Entity Type: Tanker ─── */}
                {selectedEntity.type === 'tanker' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <span style={{
                        background: selectedEntity.is_available ? '#EAF5ED' : '#FDF1EA',
                        color: selectedEntity.is_available ? '#1F7A3F' : '#D96B3B',
                        padding: '2px 8px', borderRadius: '2px', fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)', fontWeight: 800, textTransform: 'uppercase'
                      }}>
                        {selectedEntity.is_available ? '● TANKER AVAILABLE' : '● TANKER DISPATCHED'}
                      </span>

                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)', margin: '0.3rem 0 0 0' }}>
                        {selectedEntity.registration_number}
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-slate)' }}>
                        Provider: <strong>{selectedEntity.provider_name}</strong>
                      </div>
                    </div>

                    <div style={{
                      padding: '0.75rem', background: 'var(--color-surface-subtle)',
                      borderRadius: '3px', border: '1px solid var(--color-border)',
                      fontSize: '0.75rem'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)' }}>Capacity</div>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                            {selectedEntity.capacity_liters?.toLocaleString()} L
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)' }}>Water Type</div>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                            {selectedEntity.water_category}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '0.4rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)' }}>Provider Contact Phone</div>
                        <div style={{ fontWeight: 700, color: 'var(--color-teal)', fontFamily: 'var(--font-mono)' }}>
                          {selectedEntity.contact_phone || '040-23227801'}
                        </div>
                      </div>
                    </div>

                    {/* Supported Localities / Authorized Service Areas */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                        Authorized Service Areas ({selectedEntity.supported_localities?.length || 0}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {(selectedEntity.supported_localities || []).map((l: any) => (
                          <span
                            key={l.id}
                            onClick={() => handleSelectLocality(l.id)}
                            style={{
                              padding: '2px 6px', borderRadius: '2px', fontSize: '0.68rem',
                              background: selectedLocalityId === l.id ? 'var(--color-teal)' : '#FFFFFF',
                              color: selectedLocalityId === l.id ? '#FFFFFF' : 'var(--color-ink)',
                              border: '1px solid var(--color-border)', cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Dispatch or Release Action */}
                    <div style={{ marginTop: '0.5rem' }}>
                      {selectedEntity.is_available ? (
                        <button
                          onClick={() => {
                            if (!selectedLocalityId) {
                              toast('Please select a target locality on map first', { icon: 'ℹ️' })
                            } else {
                              setDispatchModalTanker(selectedEntity)
                            }
                          }}
                          className="btn btn-teal"
                          style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
                        >
                          <Truck size={14} /> Dispatch Tanker to {currentLocality ? currentLocality.name : 'Target Locality'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReturnTanker(selectedEntity.id)}
                          className="btn btn-outline"
                          style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
                        >
                          Mark Service Complete & Return Tanker
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State (Hyderabad Overview) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem 1rem' }}>
                  <Building2 size={36} color="var(--color-slate)" style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                    Hyderabad Metropolitan Overview
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                    Select a locality from the toolbar or click any map marker to inspect real-time municipal telemetry, stress levels, and tanker fleets.
                  </div>
                </div>

                {/* Overview Key Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ padding: '0.65rem', background: 'var(--color-surface-subtle)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Monitored Localities</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>
                      {localities.length}
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem', background: '#FCE8E8', borderRadius: '3px', border: '1px solid #F5B8B8' }}>
                    <div style={{ fontSize: '0.68rem', color: '#B93838', textTransform: 'uppercase', fontWeight: 700 }}>Critical Stress Areas</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#B93838', fontFamily: 'var(--font-mono)' }}>
                      {stressData.filter(s => s.stress_level === 'critical').length}
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem', background: '#EAF5ED', borderRadius: '3px', border: '1px solid #BEE3C8' }}>
                    <div style={{ fontSize: '0.68rem', color: '#1F7A3F', textTransform: 'uppercase', fontWeight: 700 }}>Available Tankers</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1F7A3F', fontFamily: 'var(--font-mono)' }}>
                      {tankers.filter(t => t.is_available).length}
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem', background: 'var(--color-surface-subtle)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Active Reports</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>
                      {reports.length}
                    </div>
                  </div>
                </div>

                {/* Popular Localities Explorer */}
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-slate)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Key Monitored Localities:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {localities.slice(0, 5).map(l => {
                      const stress = stressData.find(s => s.locality_id === l.id)
                      const color = getStressColor(stress?.stress_level || 'moderate')
                      return (
                        <div
                          key={l.id}
                          onClick={() => handleSelectLocality(l.id)}
                          style={{
                            padding: '0.45rem 0.65rem', background: '#FFFFFF',
                            border: '1px solid var(--color-border)', borderRadius: '3px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            cursor: 'pointer', transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-teal)')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                        >
                          <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{l.name}</div>
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700, color: color,
                            textTransform: 'uppercase'
                          }}>
                            {stress?.stress_level || 'Moderate'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action CTAs in Inspector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem' }}>
            <button
              onClick={() => {
                if (!selectedLocalityId) {
                  toast('Select a locality first to broadcast an advisory report', { icon: 'ℹ️' })
                } else {
                  setBroadcastModalOpen(true)
                }
              }}
              className="btn btn-primary"
              style={{ justifyContent: 'center', fontSize: '0.8rem' }}
            >
              <Radio size={14} /> Broadcast Locality Report
            </button>

            {selectedLocalityId && (
              <button
                onClick={() => handleSelectLocality(null)}
                className="btn btn-outline"
                style={{ justifyContent: 'center', fontSize: '0.75rem' }}
              >
                <RotateCcw size={12} /> Return to Hyderabad Overview
              </button>
            )}
          </div>

        </div>

      </div>

      {/* ─── Modal 1: Location-Based Tanker Dispatch ─── */}
      {dispatchModalTanker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(23,43,50,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: '1.5rem', background: '#FFFFFF', borderRadius: '4px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
                  Dispatch Water Tanker
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)' }}>
                  Target Locality: <strong>{currentLocality?.name}</strong>
                </div>
              </div>
              <button
                onClick={() => setDispatchModalTanker(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--color-surface-subtle)', borderRadius: '3px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Vehicle Registration:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{dispatchModalTanker.registration_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                  <span>Fleet Provider:</span>
                  <strong>{dispatchModalTanker.provider_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                  <span>Tanker Capacity:</span>
                  <strong>{dispatchModalTanker.capacity_liters?.toLocaleString()} Liters ({dispatchModalTanker.water_category})</strong>
                </div>
              </div>

              <div>
                <label className="form-label">Delivery Address in {currentLocality?.name}</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder={`e.g. Ward Community Point, Main Road, ${currentLocality?.name}`}
                  value={dispatchAddress}
                  onChange={(e) => setDispatchAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Priority Dispatch Notes</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Urgent emergency dispatch for water stress mitigation."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setDispatchModalTanker(null)}
                  className="btn btn-outline"
                  disabled={dispatchLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-teal"
                  disabled={dispatchLoading}
                >
                  <Truck size={14} />
                  <span>{dispatchLoading ? 'Confirming Dispatch...' : 'Confirm Dispatch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Broadcast Locality Report ─── */}
      {broadcastModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(23,43,50,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 540, width: '100%', padding: '1.5rem', background: '#FFFFFF', borderRadius: '4px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
                  Broadcast Locality Report
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)' }}>
                  Locality: <strong>{currentLocality?.name}</strong>
                </div>
              </div>
              <button
                onClick={() => setBroadcastModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBroadcastSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              {/* Report Classification */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Report Category</label>
                  <select
                    className="form-select"
                    value={broadcastReportType}
                    onChange={(e) => setBroadcastReportType(e.target.value)}
                  >
                    <option value="supply_delayed">Supply Cycle Delayed</option>
                    <option value="emergency_shortage">Emergency Water Shortage</option>
                    <option value="supply_started">Supply Commenced</option>
                    <option value="no_supply">No Piped Supply</option>
                    <option value="low_pressure">Low Pressure</option>
                    <option value="tanker_availability">Tanker Support Active</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Water Availability Status</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={broadcastStatus}
                    onChange={(e) => setBroadcastStatus(e.target.value)}
                    placeholder="e.g. Valve Maintenance / Delayed"
                  />
                </div>
              </div>

              {/* Expected Timing & Official Authority Toggle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Expected Window (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 07:00 - 09:30 AM"
                    value={broadcastExpectedTime}
                    onChange={(e) => setBroadcastExpectedTime(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Official Authority Level</label>
                  <div style={{ marginTop: '0.4rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: isAdmin ? 'pointer' : 'not-allowed' }}>
                      <input
                        type="checkbox"
                        checked={broadcastIsOfficial}
                        disabled={!isAdmin}
                        onChange={(e) => setBroadcastIsOfficial(e.target.checked)}
                        style={{ accentColor: 'var(--color-teal)' }}
                      />
                      <span>Mark as Official HMWS&SB Notice {isAdmin ? '(Admin)' : '(Requires Admin)'}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Bulletin Summary / Advisory Note</label>
                <textarea
                  required
                  className="form-textarea"
                  rows={3}
                  placeholder={`Describe the operational update or shortage notice for ${currentLocality?.name}...`}
                  value={broadcastNote}
                  onChange={(e) => setBroadcastNote(e.target.value)}
                />
              </div>

              {/* Live Preview Box */}
              <div style={{
                padding: '0.75rem', background: 'var(--color-surface-subtle)',
                borderRadius: '3px', border: '1px solid var(--color-border)', fontSize: '0.75rem'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', fontSize: '0.65rem', marginBottom: '0.2rem' }}>
                  Publication Preview
                </div>
                <div style={{ fontWeight: 800, color: 'var(--color-ink)' }}>
                  [{broadcastIsOfficial ? 'OFFICIAL HMWS&SB NOTICE' : 'VERIFIED WARD ADVISORY'}] {currentLocality?.name} — {broadcastStatus}
                </div>
                <div style={{ color: 'var(--color-ink)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                  "{broadcastNote || 'Preview text will appear here as you type...'}"
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-slate)', marginTop: '0.35rem' }}>
                  Attribution: {broadcastSource} • Verification: {broadcastIsOfficial ? 'Official Statutory' : 'Community Validated'}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="btn btn-outline"
                  disabled={broadcastLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={broadcastLoading}
                >
                  <Send size={13} />
                  <span>{broadcastLoading ? 'Publishing...' : 'Publish Locality Broadcast'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
