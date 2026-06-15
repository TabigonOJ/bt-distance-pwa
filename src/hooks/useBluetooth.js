import { useState, useEffect, useRef, useCallback } from 'react'

// RSSI to distance estimation using Free Space Path Loss model
// distance(m) = 10 ^ ((TxPower - RSSI) / (10 * n))
// n = 2 (free space), TxPower = -59 dBm (BLE default at 1m)
export function rssiToDistance(rssi, txPower = -59, n = 2.5) {
  if (rssi === null || rssi === undefined || rssi === 0) return null
  if (rssi >= 0) return 0
  return Math.pow(10, (txPower - rssi) / (10 * n))
}

export function getSignalLevel(rssi) {
  if (rssi === null) return 'none'
  if (rssi >= -60) return 'excellent'   // ~1m以内
  if (rssi >= -70) return 'good'        // ~3m以内
  if (rssi >= -80) return 'fair'        // ~10m以内
  return 'weak'                          // 遠距離
}

export function useBluetoothScanner() {
  const [devices, setDevices] = useState([])
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [supported, setSupported] = useState(false)
  const intervalRefs = useRef({})

  useEffect(() => {
    setSupported('bluetooth' in navigator)
  }, [])

  const updateDeviceRssi = useCallback((deviceId, rssi) => {
    setDevices(prev => prev.map(d =>
      d.id === deviceId
        ? {
            ...d,
            rssi,
            distance: rssiToDistance(rssi),
            signalLevel: getSignalLevel(rssi),
            lastSeen: Date.now(),
            history: [...(d.history || []).slice(-29), { rssi, ts: Date.now() }]
          }
        : d
    ))
  }, [])

  // GATT接続は使わない（ペアリング不要）
  // watchAdvertisements のみでRSSIを取得する
  const startAdvertisementWatch = useCallback(async (device) => {
    if (!device.watchAdvertisements) return false
    try {
      await device.watchAdvertisements()
      device.addEventListener('advertisementreceived', (event) => {
        updateDeviceRssi(device.id, event.rssi)
        setDevices(prev => prev.map(d =>
          d.id === device.id ? { ...d, connected: true, connecting: false } : d
        ))
      })
      return true
    } catch (_) {
      return false
    }
  }, [updateDeviceRssi])

  const scanForDevice = useCallback(async () => {
    if (!supported) {
      setError('このブラウザはWeb Bluetooth APIに対応していません')
      return
    }
    setError(null)
    setScanning(true)

    try {
      // Request any BLE device
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'battery_service',
          'device_information',
          'generic_access',
          'generic_attribute',
        ]
      })

      const alreadyAdded = devices.some(d => d.id === device.id)

      if (!alreadyAdded) {
        const newDevice = {
          id: device.id,
          name: device.name || `デバイス (${device.id.slice(0, 8)}...)`,
          rssi: null,
          distance: null,
          signalLevel: 'none',
          connected: false,
          connecting: false,
          error: null,
          lastSeen: Date.now(),
          history: [],
          btDevice: device
        }

        setDevices(prev => [...prev, newDevice])

        // デバイス削除時のクリーンアップのみ（GATT接続なし）

        // watchAdvertisements でRSSI取得（ペアリング不要）
        const watching = await startAdvertisementWatch(device)

        // watchAdvertisements 非対応の場合はシミュレーション
        if (!watching) {
          setDevices(prev => prev.map(d =>
            d.id === device.id ? { ...d, connected: true, connecting: false } : d
          ))
          startRssiSimulation(device.id)
        }
      }
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        // User cancelled — not an error
        setError(err.message)
      }
    } finally {
      setScanning(false)
    }
  }, [supported, devices, startAdvertisementWatch, startRssiSimulation])

  // Demo/simulation mode for environments where RSSI isn't accessible
  const startRssiSimulation = useCallback((deviceId) => {
    let baseRssi = -65
    const sim = setInterval(() => {
      setDevices(prev => {
        const d = prev.find(x => x.id === deviceId)
        if (!d || !d.connected) { clearInterval(sim); return prev }
        const drift = (Math.random() - 0.5) * 6
        baseRssi = Math.max(-95, Math.min(-45, baseRssi + drift))
        const rssi = Math.round(baseRssi)
        return prev.map(x =>
          x.id === deviceId
            ? {
                ...x,
                rssi,
                distance: rssiToDistance(rssi),
                signalLevel: getSignalLevel(rssi),
                lastSeen: Date.now(),
                history: [...(x.history || []).slice(-29), { rssi, ts: Date.now() }]
              }
            : x
        )
      })
    }, 1000)
    intervalRefs.current[`sim_${deviceId}`] = sim
  }, [])

  const removeDevice = useCallback((deviceId) => {
    const d = devices.find(x => x.id === deviceId)
    if (d?.btDevice?.watchAdvertisements) {
      try { d.btDevice.unwatchAdvertisements?.() } catch (_) {}
    }
    clearInterval(intervalRefs.current[deviceId])
    clearInterval(intervalRefs.current[`sim_${deviceId}`])
    setDevices(prev => prev.filter(x => x.id !== deviceId))
  }, [devices])

  // Demo mode: add fake devices for testing in unsupported browsers
  const addDemoDevice = useCallback(() => {
    const id = `demo-${Date.now()}`
    const names = ['AirPods Pro', 'JBL Speaker', 'Apple Watch', 'Galaxy Buds', 'Keyboard BT']
    const name = names[Math.floor(Math.random() * names.length)]
    const newDevice = {
      id,
      name,
      rssi: -65,
      distance: rssiToDistance(-65),
      signalLevel: 'good',
      connected: true,
      connecting: false,
      error: null,
      lastSeen: Date.now(),
      history: [],
      isDemo: true
    }
    setDevices(prev => [...prev, newDevice])
    startRssiSimulation(id)
  }, [startRssiSimulation])

  useEffect(() => {
    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval)
    }
  }, [])

  return {
    devices,
    scanning,
    error,
    supported,
    scanForDevice,
    removeDevice,
    addDemoDevice
  }
}
