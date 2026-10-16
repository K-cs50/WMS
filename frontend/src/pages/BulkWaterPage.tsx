import React, { useState, useEffect } from 'react'
import { providerAPI, localityAPI } from '../api'
import { useAuth } from '../AuthContext'
import {
  Package, Users, CheckCircle, Clock, MapPin, Plus,
  ShieldCheck, AlertCircle, X, ChevronRight, Droplets, TrendingDown, Info
} from 'lucide-react'

export default function BulkWaterPage() {
  const { user } = useAuth()
  const [localities, setLocalities] = useState<any[]>([])
  const [selectedLocalityId, setSelectedLocalityId] = useState<number>(user?.locality_id || 1)
  const [bulkRequests, setBulkRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false)
  const [category, setCategory] = useState('potable')
  const [quantityPerUnit, setQuantityPerUnit] = useState(2000)
  const [threshold, setThreshold] = useState(10)
  const [description, setDescription] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Join Modal
  const [joinTarget, setJoinTarget] = useState<any>(null)
  const [joinQty, setJoinQty] = useState(2000)
  const [joinAddress, setJoinAddress] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)

  useEffect(() => {
    localityAPI.search('').then(res => {
      setLocalities(res.data)
      if (!selectedLocalityId && res.data.length > 0) {
        setSelectedLocalityId(res.data[0].id)
      }
    }).catch(console.error)
  }, [])

  const loadBulkRequests = () => {
    setLoading(true)
    providerAPI.getBulkRequests(selectedLocalityId)
      .then(res => setBulkRequests(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (selectedLocalityId) {
      loadBulkRequests()
    }
  }, [selectedLocalityId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      await providerAPI.createBulkRequest({
        locality_id: selectedLocalityId,
        water_category: category,
        quantity_liters_per_unit: quantityPerUnit,
        threshold: threshold,
        description: description || 'RWA collective pooling for synchronized supply delivery',
        expires_in_hours: 48,
      })
      setMsg('Bulk pool request registered on the municipal bulletin!')
      setCreateOpen(false)
      loadBulkRequests()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create bulk pool')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoinLoading(true)
    try {
      await providerAPI.joinBulkRequest({
        bulk_request_id: joinTarget.id,
        quantity_liters: joinQty,
        delivery_address: joinAddress,
      })
      setMsg('You have registered your residential unit to this collective pool!')
      setJoinTarget(null)
      loadBulkRequests()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to join bulk pool')
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Gazette Masthead */}
      <div className="gazette-masthead">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="micro-label" style={{ color: 'var(--color-teal)' }}>
              COMMUNITY LOGISTICS // COLLECTIVE PROCUREMENT
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--color-ink)' }}>
              Neighborhood Water Pooling Aggregator
            </h1>
            <p style={{ margin: 0, color: 'var(--color-slate)', fontSize: '0.9rem', maxWidth: 700 }}>
              Enables Resident Welfare Associations (RWAs) and neighboring streets to pool tanker orders. 
              Aggregating volume triggers statutory wholesale discounts while reducing neighborhood traffic congestion.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => setCreateOpen(true)} className="btn btn-primary">
              <Plus size={14} /> Initiate Locality Pool
            </button>
          </div>
        </div>
      </div>

      {/* Locality Selector and Stat Banner */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span className="micro-label" style={{ margin: 0 }}>LOCALITY FILTER:</span>
          <select
            className="form-input"
            value={selectedLocalityId}
            onChange={(e) => setSelectedLocalityId(Number(e.target.value))}
            style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.85rem', fontWeight: 600 }}
          >
            {localities.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name} {loc.zone ? `(${loc.zone})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.82rem' }}>
          <div>
            <span style={{ color: 'var(--color-slate)' }}>Active Locality Pools: </span>
            <span className="tabular-num" style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{bulkRequests.length}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-slate)' }}>Target Tariff: </span>
            <span className="tabular-num" style={{ fontWeight: 700, color: 'var(--color-teal)' }}>₹0.11/L (-28%)</span>
          </div>
        </div>
      </div>

      {msg && (
        <div style={{ background: '#FAF8F5', borderLeft: '4px solid var(--color-teal)', color: 'var(--color-teal)', padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> {msg}
        </div>
      )}

      {/* Engineering Workflow Steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.15rem' }}>
          <div className="micro-label" style={{ color: 'var(--color-teal)' }}>STEP 01 // INITIATIVE</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-ink)', margin: '0.2rem 0' }}>
            Street Demand Intake
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-slate)', lineHeight: 1.5 }}>
            An RWA representative or resident establishes a delivery pool for their street or apartment cluster.
          </p>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div className="micro-label" style={{ color: 'var(--color-orange)' }}>STEP 02 // THRESHOLD</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-ink)', margin: '0.2rem 0' }}>
            Quorum Activation (10 Units)
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-slate)', lineHeight: 1.5 }}>
            When 10 neighboring sumps join, the pool automatically locks in the municipal wholesale rate of ₹0.11/L.
          </p>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div className="micro-label" style={{ color: 'var(--color-teal)' }}>STEP 03 // DISPATCH</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-ink)', margin: '0.2rem 0' }}>
            Synchronized Conveyance
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-slate)', lineHeight: 1.5 }}>
            Tankers execute consecutive drops in a single convoy route, saving transport fuel and water waiting time.
          </p>
        </div>
      </div>

      {/* Pool Requests List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-slate)' }}>
          <div className="micro-label">COMMUNICATING WITH LOCALITY REGISTRY...</div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>Fetching active RWA collective pools...</p>
        </div>
      ) : bulkRequests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-slate)' }}>
          <Users size={36} color="var(--color-slate)" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-ink)', fontWeight: 600 }}>
            No Active Bulk Aggregations in This Locality
          </div>
          <p style={{ fontSize: '0.85rem', maxWidth: 480, margin: '0.5rem auto 1.25rem' }}>
            No neighborhood water pooling requisitions are currently active for this ward. 
            Be the first resident to register a collective delivery order.
          </p>
          <button onClick={() => setCreateOpen(true)} className="btn btn-primary" style={{ margin: '0 auto' }}>
            <Plus size={14} /> Register Street Pool
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {bulkRequests.map((pool) => {
            const memberCount = pool.members_count || 1
            const pct = Math.min(100, Math.round((memberCount / (pool.threshold || 10)) * 100))
            const isMet = memberCount >= pool.threshold

            return (
              <div key={pool.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div className="micro-label" style={{ color: 'var(--color-teal)', margin: 0 }}>
                        {pool.water_category?.toUpperCase()} SPECIFICATION
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--color-ink)' }}>
                        {pool.quantity_liters_per_unit?.toLocaleString()}L per Household
                      </h3>
                    </div>
                    <span className={`status-badge ${isMet ? 'badge-verified' : 'badge-stale'}`} style={{ fontSize: '0.7rem' }}>
                      {isMet ? 'THRESHOLD REACHED' : `${memberCount} / ${pool.threshold} HOMES`}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--color-ink)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                    {pool.description}
                  </p>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                      <span className="micro-label" style={{ margin: 0 }}>AGGREGATION QUORUM</span>
                      <span className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: isMet ? 'var(--color-teal)' : 'var(--color-orange)' }}>
                        {pct}% Complete
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#EAE6DC', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: isMet ? 'var(--color-teal)' : 'var(--color-orange)', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>

                  <div style={{ background: '#FAF8F5', border: '1px solid var(--border-color)', padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--color-slate)' }}>Group Wholesale Tariff:</span>
                    <span className="tabular-num" style={{ fontWeight: 700, color: 'var(--color-teal)', fontFamily: 'var(--font-mono)' }}>
                      ₹0.11 / L (Saves ~28%)
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    onClick={() => setJoinTarget(pool)}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Join Neighborhood Pool
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(23, 43, 50, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', padding: '1.75rem', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div className="micro-label" style={{ color: 'var(--color-teal)' }}>COMMUNITY NOTICE</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--color-ink)' }}>
                  Initiate Street Water Pool
                </h2>
              </div>
              <button onClick={() => setCreateOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Water Supply Grade</label>
                <select
                  className="form-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="potable">Grade A: Potable Drinking Water (Chlorinated)</option>
                  <option value="non_potable">Grade B: Utility / Domestic Sump Wash</option>
                </select>
              </div>

              <div>
                <label className="form-label">Allocation per Household (Liters)</label>
                <select
                  className="form-input"
                  value={quantityPerUnit}
                  onChange={(e) => setQuantityPerUnit(Number(e.target.value))}
                >
                  <option value={1000}>1,000 Liters (Small household)</option>
                  <option value={2000}>2,000 Liters (Standard domestic sump)</option>
                  <option value={3000}>3,000 Liters (Joint family)</option>
                  <option value={5000}>5,000 Liters (Apartment sub-tank)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Quorum Threshold (Number of Households to Trigger Rate)</label>
                <input
                  type="number"
                  className="form-input"
                  min={2}
                  max={50}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="form-label">Pool Notice / Delivery Notes</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="E.g., Street 4 RWA residents pooling for Saturday morning 9 AM delivery drop."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={createLoading}
                style={{ justifyContent: 'center', padding: '0.85rem', marginTop: '0.5rem' }}
              >
                {createLoading ? 'Publishing Pool Notice...' : 'Publish Locality Pool Requisition'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {joinTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(23, 43, 50, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 500, width: '100%', padding: '1.75rem', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div className="micro-label" style={{ color: 'var(--color-teal)' }}>COLLECTIVE DEMAND INTAKE</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--color-ink)' }}>
                  Join Neighborhood Pool
                </h2>
              </div>
              <button onClick={() => setJoinTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Selected Delivery Volume</label>
                <input
                  type="text"
                  className="form-input"
                  disabled
                  value={`${joinQty.toLocaleString()} Liters (${joinTarget.water_category?.toUpperCase()})`}
                />
              </div>

              <div>
                <label className="form-label">Sump Address / Flat Identification</label>
                <textarea
                  className="form-input"
                  rows={2}
                  required
                  placeholder="E.g., House No. 24-B, Road No. 3 (Ground level inlet pipe marked blue)"
                  value={joinAddress}
                  onChange={(e) => setJoinAddress(e.target.value)}
                />
              </div>

              <div style={{ background: '#FAF8F5', border: '1px solid var(--border-color)', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--color-slate)' }}>
                Upon reaching the {joinTarget.threshold}-home threshold, a verified carrier will execute sequential deliveries.
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={joinLoading}
                style={{ justifyContent: 'center', padding: '0.85rem', marginTop: '0.5rem' }}
              >
                {joinLoading ? 'Recording Unit Entry...' : 'Confirm Entry to Street Pool'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
