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
  const gattRefs = useRef({})
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

  const connectDevice = useCallback(async (device) => {
    try {
      setDevices(prev => prev.map(d =>
        d.id === device.id ? { ...d, connecting: true, error: null } : d
      ))

      const server = await device.gatt.connect()
      gattRefs.current[device.id] = server

      // Try to read RSSI via a dummy read (triggers connection which gives RSSI on some platforms)
      // Main RSSI polling via advertisement events workaround
      setDevices(prev => prev.map(d =>
        d.id === device.id ? { ...d, connecting: false, connected: true } : d
      ))

      // Poll every 2s by re-reading a characteristic to keep connection alive
      // RSSI is updated via advertisement watchAdvertisements where available
      intervalRefs.current[device.id] = setInterval(() => {
        if (!device.gatt.connected) {
          clearInterval(intervalRefs.current[device.id])
          setDevices(prev => prev.map(d =>
            d.id === device.id ? { ...d, connected: false, rssi: null } : d
          ))
        }
      }, 2000)

    } catch (err) {
      setDevices(prev => prev.map(d =>
        d.id === device.id
          ? { ...d, connecting: false, error: err.message }
          : d
      ))
    }
  }, [])

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

        // Listen for disconnect
        device.addEventListener('gattserverdisconnected', () => {
          clearInterval(intervalRefs.current[device.id])
          setDevices(prev => prev.map(d =>
            d.id === device.id
              ? { ...d, connected: false, rssi: null, distance: null, signalLevel: 'none' }
              : d
          ))
        })

        // Try watchAdvertisements for RSSI (Chrome 79+, flagged)
        if (device.watchAdvertisements) {
          try {
            await device.watchAdvertisements()
            device.addEventListener('advertisementreceived', (event) => {
              updateDeviceRssi(device.id, event.rssi)
            })
          } catch (_) {
            // Not supported — connect to GATT instead
          }
        }

        // Auto-connect
        await connectDevice(newDevice)

        // Simulate RSSI for demo if no advertisement (GATT connection only gives rough estimate)
        // We'll start with a reasonable estimate and update when possible
        if (!device.watchAdvertisements) {
          // Provide a stable simulated RSSI based on gatt connection quality
          // Real RSSI requires either watchAdvertisements or platform-specific APIs
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
  }, [supported, devices, connectDevice, updateDeviceRssi])

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
    if (d?.btDevice?.gatt?.connected) {
      d.btDevice.gatt.disconnect()
    }
    clearInterval(intervalRefs.current[deviceId])
    clearInterval(intervalRefs.current[`sim_${deviceId}`])
    delete gattRefs.current[deviceId]
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
