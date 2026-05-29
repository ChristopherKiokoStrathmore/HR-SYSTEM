'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Marker } from 'leaflet'

export interface CheckInLocation {
  lat: number
  lng: number
  name: string
  time: string | null
  status: string
  is_late?: boolean
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function markerStyle(status: string, is_late?: boolean): { bg: string; ring: string } {
  if (is_late)              return { bg: '#D97706', ring: '#FEF3C7' }  // amber  – late
  if (status === 'half_day') return { bg: '#7C3AED', ring: '#EDE9FE' } // purple – half-day
  return { bg: '#1A2E5A', ring: '#DBEAFE' }                            // navy   – present
}

function buildPopupHtml(loc: CheckInLocation, address?: string | null) {
  const { bg } = markerStyle(loc.status, loc.is_late)
  const statusLabel =
    loc.is_late ? '🟡 Late arrival'
    : loc.status === 'half_day' ? '🟣 Half day'
    : '🟢 Present'

  const mapsUrl       = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`
  const streetViewUrl = `https://www.google.com/maps?q=&layer=c&cbll=${loc.lat},${loc.lng}`

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;min-width:200px;padding:4px 0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="
          background:${bg};color:#fff;
          width:34px;height:34px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;flex-shrink:0
        ">${getInitials(loc.name)}</div>
        <div>
          <div style="font-weight:700;font-size:13px;color:#0F172A;line-height:1.2">${loc.name}</div>
          <div style="font-size:11px;color:#64748B">${statusLabel}</div>
        </div>
      </div>
      ${loc.time ? `<div style="font-size:12px;color:#475569;margin-bottom:6px">⏰ Check-in: <b>${loc.time}</b></div>` : ''}
      ${address ? `<div style="font-size:11px;color:#64748B;margin-bottom:8px">📍 ${address}</div>` : `<div style="font-size:11px;color:#94A3B8;margin-bottom:8px">📍 ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}</div>`}
      <div style="display:flex;gap:6px;border-top:1px solid #E2E8F0;padding-top:8px">
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
          style="flex:1;text-align:center;font-size:11px;font-weight:600;
                 padding:5px 0;border-radius:6px;text-decoration:none;
                 background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE">
          🗺️ Maps
        </a>
        <a href="${streetViewUrl}" target="_blank" rel="noopener noreferrer"
          style="flex:1;text-align:center;font-size:11px;font-weight:600;
                 padding:5px 0;border-radius:6px;text-decoration:none;
                 background:#F0FDF4;color:#15803D;border:1px solid #BBF7D0">
          📸 Street View
        </a>
      </div>
    </div>
  `
}

export function CheckInMap({ locations }: { locations: CheckInLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<LeafletMap | null>(null)
  const markersRef   = useRef<Marker[]>([])
  const geocodeCache = useRef<Record<string, string | null>>({})

  // ── Initialise the map once ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    let live = true

    import('leaflet').then(({ default: L }) => {
      if (!live || !containerRef.current || mapRef.current) return

      mapRef.current = L.map(containerRef.current, {
        center: [-1.2864, 36.8172], // Nairobi default
        zoom: 13,
        scrollWheelZoom: false,
        zoomControl: true,
      })

      // CartoDB Voyager — clean Google-Maps-like look, free, no API key
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(mapRef.current)
    })

    return () => {
      live = false
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // ── Update markers whenever locations change ─────────────────────────────
  useEffect(() => {
    if (!mapRef.current || locations.length === 0) return

    import('leaflet').then(({ default: L }) => {
      if (!mapRef.current) return

      // Remove old markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      const bounds = L.latLngBounds([])

      locations.forEach(loc => {
        const { bg, ring } = markerStyle(loc.status, loc.is_late)
        const initials = getInitials(loc.name)
        const cacheKey = `${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}`

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            background:${bg};
            color:#fff;
            width:38px;height:38px;
            border-radius:50%;
            border:3px solid ${ring};
            box-shadow:0 3px 12px rgba(0,0,0,0.28);
            display:flex;align-items:center;justify-content:center;
            font-size:12px;font-weight:700;font-family:system-ui,sans-serif;
            letter-spacing:0.3px;
            cursor:pointer;
          ">${initials}</div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          popupAnchor: [0, -24],
        })

        const popup = L.popup({ maxWidth: 240, className: 'sl-popup' })
          .setContent(buildPopupHtml(loc, geocodeCache.current[cacheKey]))

        const marker = L.marker([loc.lat, loc.lng], { icon }).bindPopup(popup)
        marker.addTo(mapRef.current!)
        markersRef.current.push(marker)
        bounds.extend([loc.lat, loc.lng])

        // Reverse-geocode and update popup content without re-creating the map
        if (cacheKey in geocodeCache.current) return // already fetched or null
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.lat}&lon=${loc.lng}`,
          { headers: { Accept: 'application/json' } }
        )
          .then(r => (r.ok ? r.json() : null))
          .then((data: { display_name?: string } | null) => {
            const address = data?.display_name?.split(',').slice(0, 3).join(', ')?.trim() ?? null
            geocodeCache.current[cacheKey] = address
            popup.setContent(buildPopupHtml(loc, address))
          })
          .catch(() => { geocodeCache.current[cacheKey] = null })
      })

      if (locations.length === 1) {
        mapRef.current.setView([locations[0].lat, locations[0].lng], 15)
      } else {
        mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
      }
    })
  }, [locations]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} style={{ height: 320, borderRadius: 12, zIndex: 0, isolation: 'isolate' }} />
  )
}
