'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Map } from 'leaflet'

export interface CheckInLocation {
  lat: number
  lng: number
  name: string
  time: string | null
  status: string
}

export function CheckInMap({ locations }: { locations: CheckInLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let live = true

    import('leaflet').then(({ default: L }) => {
      if (!live || !containerRef.current) return

      const center: [number, number] = locations.length > 0
        ? [locations[0].lat, locations[0].lng]
        : [-1.2864, 36.8172]

      const map = L.map(containerRef.current, {
        center,
        zoom: 13,
        scrollWheelZoom: false,
        zoomControl: true,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      const icon = L.divIcon({
        className: '',
        html: '<div style="background:#1A2E5A;width:13px;height:13px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>',
        iconSize: [13, 13],
        iconAnchor: [6, 6],
        popupAnchor: [0, -10],
      })

      const bounds = L.latLngBounds([])
      locations.forEach(loc => {
        L.marker([loc.lat, loc.lng], { icon })
          .bindPopup(
            `<b>${loc.name}</b>${loc.time ? `<br>${loc.time}` : ''}<br><span style="text-transform:capitalize">${loc.status}</span>`
          )
          .addTo(map)
        bounds.extend([loc.lat, loc.lng])
      })

      if (locations.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
      }
    })

    return () => {
      live = false
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} style={{ height: 280, borderRadius: 12, zIndex: 0 }} />
  )
}
