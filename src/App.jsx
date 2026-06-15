import React, { useState, useEffect } from 'react'
import SonarDisplay from './components/SonarDisplay'
import DeviceCard from './components/DeviceCard'
import { useBluetoothScanner } from './hooks/useBluetooth'

function Header() {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px 0',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M6.5 6.5l11 11M6.5 17.5l5.5-5.5-5.5-5.5h11l-5.5 5.5 5.5 5.5" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          color: '#00d4ff',
          letterSpacing: '0.05em'
        }}>BT DISTANCE</span>
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-dim)',
        letterSpacing: '0.1em'
      }}>v1.0</span>
    </header>
  )
}

function EmptyState({ onDemo }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      padding: '20px 24px',
      textAlign: 'center'
    }}>
      <p style={{
        color: 'var(--text-dim)',
        fontSize: 13,
        lineHeight: 1.6
      }}>
        Bluetoothデバイスを追加して<br />距離をリアルタイムで確認できます
      </p>
      <button
        onClick={onDemo}
        style={{
          marginTop: 4,
          background: 'none',
          border: '1px solid var(--gray)',
          color: 'var(--text-dim)',
          fontSize: 12,
          padding: '6px 14px',
          borderRadius: 6,
        }}
      >
        デモデバイスを追加
      </button>
    </div>
  )
}

export default function App() {
  const { devices, scanning, error, supported, scanForDevice, removeDevice, addDemoDevice } = useBluetoothScanner()
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setPwaInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!pwaInstallPrompt) return
    pwaInstallPrompt.prompt()
    const { outcome } = await pwaInstallPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setPwaInstallPrompt(null)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      maxWidth: 480,
      margin: '0 auto',
      position: 'relative'
    }}>
      <Header />

      {/* PWA install banner */}
      {pwaInstallPrompt && !isInstalled && (
        <div style={{
          margin: '12px 20px 0',
          background: 'var(--cyan-dim)',
          border: '1px solid var(--cyan-glow)',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexShrink: 0
        }}>
          <span style={{ fontSize: 13, color: 'var(--cyan)' }}>
            ホーム画面に追加できます
          </span>
          <button
            onClick={handleInstall}
            style={{
              background: 'var(--cyan)',
              color: '#0a0e1a',
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: 5
            }}
          >
            インストール
          </button>
        </div>
      )}

      {/* Sonar */}
      <div style={{ padding: '20px 20px 10px', flexShrink: 0 }}>
        <SonarDisplay devices={devices} />
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 32,
        padding: '0 20px 14px',
        flexShrink: 0
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--cyan)' }}>
            {devices.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
            デバイス
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: '#39ff14' }}>
            {devices.filter(d => d.connected).length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
            接続中
          </div>
        </div>
        {devices.length > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--orange)' }}>
              {(() => {
                const closest = devices
                  .filter(d => d.distance !== null)
                  .reduce((a, b) => a.distance < b.distance ? a : b, { distance: Infinity })
                return closest.distance !== Infinity
                  ? closest.distance < 1
                    ? `${Math.round(closest.distance * 100)}cm`
                    : `${closest.distance.toFixed(1)}m`
                  : '—'
              })()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
              最近
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          margin: '0 20px 12px',
          background: 'var(--orange-dim)',
          border: '1px solid rgba(255,107,53,0.3)',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
          color: 'var(--orange)',
          flexShrink: 0
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Not supported */}
      {!supported && (
        <div style={{
          margin: '0 20px 12px',
          background: 'rgba(74,85,104,0.2)',
          border: '1px solid var(--gray)',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
          color: 'var(--text-dim)',
          lineHeight: 1.5,
          flexShrink: 0
        }}>
          このブラウザはWeb Bluetooth APIに非対応です。<br />
          Chrome (PC/Android) をお使いください。<br />
          <span style={{ color: '#00d4ff' }}>デモモードで動作を確認できます。</span>
        </div>
      )}

      {/* Device list */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '0 20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        {devices.length === 0
          ? <EmptyState onDemo={addDemoDevice} />
          : devices.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                onRemove={removeDevice}
              />
            ))
        }
      </div>

      {/* Scan button */}
      <div style={{
        padding: '12px 20px 24px',
        flexShrink: 0,
        display: 'flex',
        gap: 10
      }}>
        <button
          onClick={scanForDevice}
          disabled={scanning || !supported}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 10,
            background: scanning
              ? 'rgba(0,212,255,0.1)'
              : 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.05))',
            border: '1px solid rgba(0,212,255,0.4)',
            color: scanning ? 'var(--text-dim)' : 'var(--cyan)',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.03em',
            opacity: (scanning || !supported) ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          {scanning ? (
            <>
              <span style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                border: '2px solid rgba(0,212,255,0.3)',
                borderTopColor: 'var(--cyan)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              スキャン中...
            </>
          ) : '+ デバイスをスキャン'}
        </button>
        {!supported && (
          <button
            onClick={addDemoDevice}
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(57,255,20,0.08)',
              border: '1px solid rgba(57,255,20,0.3)',
              color: '#39ff14',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            DEMO
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg) }
        }
      `}</style>
    </div>
  )
}
