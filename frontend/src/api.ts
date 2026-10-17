import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wms_token')
      localStorage.removeItem('wms_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const authAPI = {
  login: (username: string, password: string) => {
    const form = new FormData()
    form.append('username', username)
    form.append('password', password)
    return api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  },
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/me', data),
}

// Localities
export const localityAPI = {
  cities: () => api.get('/localities/cities'),
  search: (q: string, cityId?: number) => api.get('/localities/search', { params: { q, city_id: cityId } }),
  get: (id: number) => api.get(`/localities/${id}`),
}

// Reports
export const reportAPI = {
  create: (data: any) => api.post('/reports/', data),
  getByLocality: (id: number, hours = 24) => api.get(`/reports/locality/${id}`, { params: { hours } }),
  getReliability: (id: number) => api.get(`/reports/reliability/${id}`),
  getStatus: (id: number) => api.get(`/reports/status/${id}`),
  list: (params?: any) => api.get('/reports/', { params }),
  broadcast: (data: any) => api.post('/reports/broadcast', data),
  getActiveBroadcasts: (localityId?: number) =>
    api.get('/reports/broadcasts/active', { params: localityId ? { locality_id: localityId } : {} }),
}

// Providers & Bookings
export const providerAPI = {
  list: (params?: any) => api.get('/providers/', { params }),
  myProfile: () => api.get('/providers/my-profile'),
  updateServiceAreas: (data: any) => api.put('/providers/my-profile/service-areas', data),
  addTanker: (data: any) => api.post('/providers/tankers', data),
  createBooking: (data: any) => api.post('/providers/bookings', data),
  myBookings: () => api.get('/providers/bookings/mine'),
  bookingAction: (id: number, data: any) => api.put(`/providers/bookings/${id}/action`, data),
  getTracking: (id: number) => api.get(`/providers/bookings/${id}/tracking`),
  createBulkRequest: (data: any) => api.post('/providers/bulk-requests', data),
  joinBulkRequest: (data: any) => api.post('/providers/bulk-requests/join', data),
  getBulkRequests: (localityId: number) => api.get(`/providers/bulk-requests/locality/${localityId}`),
  getTankers: (params?: any) => api.get('/providers/tankers', { params }),
  dispatchTanker: (tankerId: number, data: any) => api.post(`/providers/tankers/${tankerId}/dispatch`, data),
  returnTanker: (tankerId: number) => api.post(`/providers/tankers/${tankerId}/return`),
}

// Notifications
export const notifAPI = {
  list: () => api.get('/notifications/'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
  unreadCount: () => api.get('/notifications/unread-count'),
}

// Alerts
export const alertAPI = {
  subscribe: (data: any) => api.post('/alerts/subscribe', data),
  mySubscriptions: () => api.get('/alerts/my-subscriptions'),
}

// Weather
export const weatherAPI = {
  get: (cityId: number) => api.get(`/weather/${cityId}`),
}

// Map
export const mapAPI = {
  stress: (params?: { city_id?: number; locality_id?: number }) => api.get('/map/stress', { params }),
  reportsGeo: (cityId?: number) => api.get('/map/reports-geo', { params: { city_id: cityId } }),
  tankers: (params?: { locality_id?: number; water_category?: string; is_available?: boolean }) =>
    api.get('/map/tankers', { params }),
}

// Forecasts
export const forecastAPI = {
  get: (localityId: number) => api.get(`/forecasts/${localityId}`),
}

// Contacts
export const contactAPI = {
  list: (params?: any) => api.get('/contacts/', { params }),
}

// Sources
export const sourcesAPI = {
  list: () => api.get('/sources/'),
  sync: () => api.post('/sources/sync'),
}

// Admin
export const adminAPI = {
  users: () => api.get('/admin/users'),
  toggleUser: (id: number) => api.put(`/admin/users/${id}/toggle-active`),
  verifyProvider: (id: number) => api.put(`/admin/providers/${id}/verify`),
  stats: () => api.get('/admin/stats'),
  pendingReports: () => api.get('/admin/reports/pending'),
  moderateReport: (id: number, action: string, note?: string) =>
    api.put(`/admin/reports/${id}/moderate`, null, { params: { action, note } }),
}

// AI Assistant
export const assistantAPI = {
  chat: (data: any) => api.post('/assistant/chat', data),
}

// Machine Learning & Weather-Constrained Forecasting
export const mlAPI = {
  metrics: () => api.get('/ml/metrics'),
  predictStress: (data: any) => api.post('/ml/predict-stress', data),
  wardForecast: () => api.get('/ml/ward-forecast'),
}
