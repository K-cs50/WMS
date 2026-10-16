import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authAPI } from './api'

interface User {
  id: number
  full_name: string
  email: string
  phone?: string
  role: 'consumer' | 'provider' | 'admin'
  city_id?: number
  locality_id?: number
  preferred_alert_channel?: string
  is_active: boolean
  is_verified: boolean
  is_locality_rep?: boolean
  ward?: string
}

interface AuthCtx {
  user: User | null
  token: string | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('wms_token')
    const savedUser = localStorage.getItem('wms_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      // Verify token is still valid
      authAPI.me().then(res => {
        setUser(res.data)
        localStorage.setItem('wms_user', JSON.stringify(res.data))
      }).catch(() => {
        localStorage.removeItem('wms_token')
        localStorage.removeItem('wms_user')
        setToken(null)
        setUser(null)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (identifier: string, password: string) => {
    const res = await authAPI.login(identifier, password)
    const { access_token, user: userData } = res.data
    setToken(access_token)
    setUser(userData)
    localStorage.setItem('wms_token', access_token)
    localStorage.setItem('wms_user', JSON.stringify(userData))
  }

  const register = async (data: any) => {
    const res = await authAPI.register(data)
    const { access_token, user: userData } = res.data
    setToken(access_token)
    setUser(userData)
    localStorage.setItem('wms_token', access_token)
    localStorage.setItem('wms_user', JSON.stringify(userData))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('wms_token')
    localStorage.removeItem('wms_user')
  }

  const refreshUser = async () => {
    const res = await authAPI.me()
    setUser(res.data)
    localStorage.setItem('wms_user', JSON.stringify(res.data))
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
