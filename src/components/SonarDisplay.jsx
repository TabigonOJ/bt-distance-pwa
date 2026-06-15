import React, { useEffect, useRef } from 'react'

const SIGNAL_COLORS = {
  excellent: '#39ff14',
  good: '#00d4ff',
  fair: '#ff9f1c',
  weak: '#ff6b35',
  none: '#4a5568'
}

export default function SonarDisplay({ devices }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const sweepAngleRef = useRef(0)
  const trailsRef = useRef([]) // ping trails

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      const size = Math.min(canvas.parentElement.offsetWidth, 340)
      canvas.width = size
      canvas.height = size
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2
      const maxR = Math.min(cx, cy) - 10

      ctx.clearRect(0, 0, W, H)

      // Background
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
      bgGrad.addColorStop(0, 'rgba(0,212,255,0.04)')
      bgGrad.addColorStop(1, 'rgba(10,14,26,0.95)')
      ctx.fillStyle = bgGrad
      ctx.beginPath()
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2)
      ctx.fill()

      // Concentric range rings
      const rings = 4
      for (let i = 1; i <= rings; i++) {
        const r = (maxR * i) / rings
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0, 212, 255, ${0.08 + i * 0.02})`
        ctx.lineWidth = 1
        ctx.stroke()

        // Range labels
        const dist = Math.round((i / rings) * 15)
        ctx.fillStyle = 'rgba(0, 212, 255, 0.3)'
        ctx.font = `${Math.max(9, W * 0.028)}px 'Share Tech Mono', monospace`
        ctx.fillText(`${dist}m`, cx + r + 3, cy - 3)
      }

      // Cross hairs
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx, cy - maxR)
      ctx.lineTo(cx, cy + maxR)
      ctx.moveTo(cx - maxR, cy)
      ctx.lineTo(cx + maxR, cy)
      ctx.stroke()

      // Sweep gradient
      const sweep = sweepAngleRef.current
      const sweepGrad = ctx.createConicalGradient
        ? null
        : null

      // Draw sweep as a filled wedge
      const sweepSpan = Math.PI / 3
      for (let i = 0; i < 20; i++) {
        const alpha = (1 - i / 20) * 0.18
        const angle = sweep - (i / 20) * sweepSpan
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, maxR, angle - sweepSpan / 20, angle)
        ctx.closePath()
        ctx.fillStyle = `rgba(0, 212, 255, ${alpha})`
        ctx.fill()
      }

      // Sweep line
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(
        cx + Math.cos(sweep) * maxR,
        cy + Math.sin(sweep) * maxR
      )
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.9)'
      ctx.lineWidth = 2
      ctx.shadowBlur = 8
      ctx.shadowColor = '#00d4ff'
      ctx.stroke()
      ctx.shadowBlur = 0

      // Device blips
      devices.forEach((device, idx) => {
        if (!device.distance && !device.rssi) return

        const dist = Math.min(device.distance || 10, 15)
        const r = (dist / 15) * maxR
        // Spread devices angularly so they don't overlap
        const angleOffset = (idx / Math.max(devices.length, 1)) * Math.PI * 2
        const blipAngle = angleOffset
        const bx = cx + Math.cos(blipAngle) * r
        const by = cy + Math.sin(blipAngle) * r

        const color = SIGNAL_COLORS[device.signalLevel] || SIGNAL_COLORS.none
        const pulse = 0.6 + Math.sin(Date.now() / 400 + idx) * 0.4

        // Glow ring around blip
        ctx.beginPath()
        ctx.arc(bx, by, 12, 0, Math.PI * 2)
        ctx.strokeStyle = color.replace(')', `, ${0.15 * pulse})`).replace('rgb', 'rgba')
        ctx.lineWidth = 8
        ctx.stroke()

        // Blip dot
        ctx.beginPath()
        ctx.arc(bx, by, 5, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.shadowBlur = 16
        ctx.shadowColor = color
        ctx.fill()
        ctx.shadowBlur = 0

        // Device name label
        ctx.fillStyle = color
        ctx.font = `${Math.max(10, W * 0.03)}px 'Share Tech Mono', monospace`
        const label = device.name.length > 12 ? device.name.slice(0, 12) + '…' : device.name
        const lx = bx + (bx > cx ? 10 : -(ctx.measureText(label).width + 10))
        ctx.fillText(label, lx, by - 8)
      })

      // Center dot
      ctx.beginPath()
      ctx.arc(cx, cy, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#00d4ff'
      ctx.shadowBlur = 12
      ctx.shadowColor = '#00d4ff'
      ctx.fill()
      ctx.shadowBlur = 0

      // Advance sweep
      sweepAngleRef.current = (sweepAngleRef.current + 0.025) % (Math.PI * 2)

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [devices])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        margin: '0 auto',
        borderRadius: '50%',
        boxShadow: '0 0 40px rgba(0,212,255,0.15), inset 0 0 40px rgba(0,0,0,0.5)'
      }}
    />
  )
}
