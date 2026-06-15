import React from 'react'

const SIGNAL_COLORS = {
  excellent: '#39ff14',
  good: '#00d4ff',
  fair: '#ff9f1c',
  weak: '#ff6b35',
  none: '#4a5568'
}

const SIGNAL_LABELS = {
  excellent: '非常に強い',
  good: '良好',
  fair: '普通',
  weak: '弱い',
  none: '—'
}

function MiniChart({ history }) {
  if (!history || history.length < 2) return null
  const w = 80, h = 28
  const vals = history.map(h => h.rssi)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1

  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke="rgba(0,212,255,0.6)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function DeviceCard({ device, onRemove }) {
  const color = SIGNAL_COLORS[device.signalLevel]
  const bars = {
    excellent: 4,
    good: 3,
    fair: 2,
    weak: 1,
    none: 0
  }[device.signalLevel]

  const distText = device.distance !== null && device.distance !== undefined
    ? device.distance < 1
      ? `${Math.round(device.distance * 100)} cm`
      : `${device.distance.toFixed(1)} m`
    : '—'

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${color}22`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      position: 'relative',
      boxShadow: `0 0 20px ${color}10`
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Signal bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
            {[1,2,3,4].map(b => (
              <div key={b} style={{
                width: 4,
                height: 4 + b * 3,
                borderRadius: 1,
                background: b <= bars ? color : 'var(--gray)',
                opacity: b <= bars ? 1 : 0.3,
                transition: 'background 0.3s'
              }} />
            ))}
          </div>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text)',
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {device.name}
          </span>
          {device.isDemo && (
            <span style={{
              fontSize: 10,
              color: 'var(--text-dim)',
              background: 'var(--gray)',
              padding: '1px 5px',
              borderRadius: 3,
              opacity: 0.6
            }}>DEMO</span>
          )}
        </div>
        <button
          onClick={() => onRemove(device.id)}
          aria-label="削除"
          style={{
            background: 'none',
            color: 'var(--text-dim)',
            fontSize: 18,
            lineHeight: 1,
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >×</button>
      </div>

      {/* Main distance display */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 32,
          color,
          textShadow: `0 0 12px ${color}`,
          letterSpacing: '-0.02em',
          lineHeight: 1
        }}>
          {distText}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: 'var(--text-dim)'
        }}>
          RSSI: {device.rssi ?? '—'} dBm
        </span>
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: device.connected ? '#39ff14' : 'var(--gray)',
            boxShadow: device.connected ? '0 0 6px #39ff14' : 'none',
            animation: device.connected ? 'pulse 2s infinite' : 'none'
          }} />
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {device.connecting ? '接続中...' : device.connected ? '接続済み' : '未接続'}
          </span>
          {device.signalLevel !== 'none' && (
            <span style={{
              fontSize: 12,
              color,
              marginLeft: 8
            }}>
              {SIGNAL_LABELS[device.signalLevel]}
            </span>
          )}
        </div>
        <MiniChart history={device.history} />
      </div>

      {device.error && (
        <div style={{
          fontSize: 11,
          color: 'var(--orange)',
          background: 'var(--orange-dim)',
          padding: '4px 8px',
          borderRadius: 4
        }}>
          {device.error}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.4 }
        }
      `}</style>
    </div>
  )
}
