import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { assistantAPI, localityAPI } from '../api'
import { useAuth } from '../AuthContext'
import {
  Send, Bot, User, Sparkles, ShieldAlert,
  Info, RefreshCw, Droplets, ArrowRight, HelpCircle, FileText, CheckCircle
} from 'lucide-react'

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  disclaimer?: string
  mode?: string
  contextData?: any
  timestamp: string
}

export default function AquaAssistPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [localities, setLocalities] = useState<any[]>([])
  const [selectedLocalityId, setSelectedLocalityId] = useState<number>(user?.locality_id || 1)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Municipal Hydro-Intelligence Terminal initialized. I synthesize verified HMWS&SB scheduled supply timings, statistical pressure reliability curves, ground-truth conflict resolution, and emergency tanker dispatch rules for Hyderabad civic zones. Inquire below regarding your ward or water network parameters.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localityAPI.search('').then(res => {
      setLocalities(res.data)
      if (!selectedLocalityId && res.data.length > 0) {
        setSelectedLocalityId(res.data[0].id)
      }
    }).catch(console.error)

    const params = new URLSearchParams(location.search)
    const q = params.get('q')
    if (q) {
      handleSendMessage(q)
    }
  }, [location.search])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim()
    if (!messageText || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const res = await assistantAPI.chat({
        message: messageText,
        locality_id: selectedLocalityId,
      })

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.data.response,
        disclaimer: res.data.disclaimer,
        mode: res.data.mode,
        contextData: res.data.context_data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Hydro-Intelligence Terminal encountered an API timeout communicating with the telemetry synthesis engine. Please verify connection and retry.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const promptSuggestions = [
    'Explain the mathematical formula for the Reliability Score (λ=0.01)',
    'How are contradictory neighbor supply reports reconciled?',
    'What are the statutory ceiling rates for licensed water tankers?',
    'How does collective neighborhood water pooling work?',
    'What are the official municipal water timings for my ward?'
  ]

  const activeLocalityObj = localities.find(l => l.id === selectedLocalityId)

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '1rem' }}>
      
      {/* Terminal Gazette Masthead */}
      <div className="gazette-masthead" style={{ paddingBottom: '0.75rem', marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="micro-label" style={{ color: 'var(--color-teal)' }}>
              SYNTHESIS ENGINE // CIVIC HYDRO-INTELLIGENCE
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--color-ink)' }}>
              AquaAssist Telemetry Terminal
            </h1>
            <p style={{ margin: 0, color: 'var(--color-slate)', fontSize: '0.85rem' }}>
              Synthesizing official gazette bulletins, decay-weighted ground observations, and municipal tariff schedules.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="micro-label" style={{ margin: 0 }}>TELEMETRY ZONE:</span>
            <select
              className="form-input"
              value={selectedLocalityId}
              onChange={(e) => setSelectedLocalityId(Number(e.target.value))}
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              {localities.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name} {loc.zone ? `(${loc.zone})` : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Terminal Conversation Chamber */}
      <div className="card" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        background: '#FAF8F5',
        border: '1px solid var(--border-color)'
      }}>
        {messages.map((m) => {
          const isUser = m.sender === 'user'
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: isUser ? '75%' : '88%',
                width: '100%'
              }}
            >
              {/* Message Metadata Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.35rem',
                justifyContent: isUser ? 'flex-end' : 'flex-start'
              }}>
                <span className="micro-label" style={{ color: isUser ? 'var(--color-ink)' : 'var(--color-teal)', margin: 0 }}>
                  {isUser ? `CITIZEN INQUIRY // ${user?.full_name || 'USER'}` : 'MUNICIPAL SYNTHESIS DISPATCH'}
                </span>
                <span className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-slate)' }}>
                  {m.timestamp}
                </span>
              </div>

              {/* Message Box */}
              <div style={{
                padding: '1.15rem 1.35rem',
                background: isUser ? '#FFFFFF' : '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderLeft: isUser ? '4px solid var(--color-ink)' : '4px solid var(--color-teal)',
                color: 'var(--color-ink)',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                borderRadius: '2px'
              }}>
                {m.text}

                {/* Technical Context Pill */}
                {m.contextData && m.contextData.score !== undefined && (
                  <div style={{
                    marginTop: '0.85rem',
                    padding: '0.5rem 0.75rem',
                    background: '#FAF8F5',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    fontSize: '0.75rem'
                  }}>
                    <span style={{ color: 'var(--color-slate)' }}>TELEMETRY CALIBRATION:</span>
                    <span className="tabular-num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-ink)' }}>
                      RELIABILITY: {Math.round(m.contextData.score * 100)}%
                    </span>
                    <span>•</span>
                    <span style={{ color: 'var(--color-teal)', fontWeight: 600 }}>
                      STATUS: {m.contextData.status?.toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Source Provenance Citation */}
                {!isUser && (
                  <div style={{
                    marginTop: '0.85rem',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    fontSize: '0.72rem',
                    color: 'var(--color-slate)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FileText size={12} color="var(--color-teal)" />
                      <span><strong>PROVENANCE:</strong> HMWS&SB Official Operating Bulletin & Verified Citizen Ground Reports</span>
                    </div>
                    <span className="tabular-num" style={{ fontFamily: 'var(--font-mono)' }}>CONFIDENCE: CALIBRATED</span>
                  </div>
                )}

                {/* Disclaimer */}
                {m.disclaimer && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-slate)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                    {m.disclaimer}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', maxWidth: '85%' }}>
            <div className="micro-label" style={{ color: 'var(--color-teal)', marginBottom: '0.35rem' }}>
              PROCESSING TELEMETRY STREAM...
            </div>
            <div style={{
              padding: '0.85rem 1.25rem',
              background: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderLeft: '4px solid var(--color-orange)',
              fontSize: '0.85rem',
              color: 'var(--color-slate)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <Sparkles size={16} color="var(--color-orange)" />
              Synthesizing municipal pressure logs and resolving contradictory report vectors for {activeLocalityObj?.name || 'Locality'}...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Inquiries Strip */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.2rem 0', scrollbarWidth: 'none' }}>
        {promptSuggestions.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="btn btn-outline btn-sm"
            style={{
              whiteSpace: 'nowrap',
              fontSize: '0.74rem',
              background: '#FFFFFF',
              padding: '0.35rem 0.75rem',
              borderRadius: '2px'
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSendMessage() }}
        style={{ display: 'flex', gap: '0.65rem' }}
      >
        <input
          type="text"
          className="form-input"
          placeholder="Inquire regarding ward water schedules, reliability metrics, tanker rates, or delay reports..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.9rem' }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !input.trim()}
          style={{ padding: '0 1.5rem', justifyContent: 'center' }}
        >
          <Send size={15} /> Submit Inquiry
        </button>
      </form>

    </div>
  )
}
