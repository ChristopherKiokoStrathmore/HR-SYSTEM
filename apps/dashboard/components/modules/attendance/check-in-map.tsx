'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Map, TileLayer } from 'leaflet'
import { Maximize2, Minimize2, Layers } from 'lucide-react'

export interface CheckInLocation {
  lat: number
  lng: number
  name: string
  time: string | null
  status: string
}

const TILE_LAYERS = {
  Street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  Satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a> World Imagery',
    maxZoom: 18,
  },
  Dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
} as const

type LayerName = keyof typeof TILE_LAYERS

export function CheckInMap({ locations }: { locations: CheckInLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const tileRef = useRef<TileLayer | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeLayer, setActiveLayer] = useState<LayerName>('Street')
  const [showLayers, setShowLayers] = useState(false)

  const toggleFullscreen = useCallback(() => setIsFullscreen(p => !p), [])

  // Re-render map when fullscreen toggles
  useEffect(() => {
    const id = setTimeout(() => mapRef.current?.invalidateSize(), 50)
    return () => clearTimeout(id)
  }, [isFullscreen])

  // Swap tile layer when user picks a different view
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    import('leaflet').then(({ default: L }) => {
      if (tileRef.current) map.removeLayer(tileRef.current)
      const cfg = TILE_LAYERS[activeLayer]
      tileRef.current = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
      }).addTo(map)
    })
  }, [activeLayer])

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

      const cfg = TILE_LAYERS['Street']
      tileRef.current = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
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
      tileRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={isFullscreen ? {
        position: 'fixed', inset: 0, zIndex: 9999, borderRadius: 0,
      } : {
        position: 'relative', borderRadius: 12, overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        style={{ height: isFullscreen ? '100vh' : 280, width: '100%', zIndex: 0 }}
      />

      {/* Layer switcher */}
      <div style={{ position: 'absolute', bottom: 12, right: 50, zIndex: 1000 }}>
        {showLayers && (
          <div style={{
            position: 'absolute', bottom: 36, right: 0,
            background: 'white', border: '2px solid rgba(0,0,0,0.2)',
            borderRadius: 6, overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)', minWidth: 100,
          }}>
            {(Object.keys(TILE_LAYERS) as LayerName[]).map(name => (
              <button
                key={name}
                onClick={() => { setActiveLayer(name); setShowLayers(false) }}
                style={{
                  display: 'block', width: '100%', padding: '7px 14px',
                  textAlign: 'left', background: activeLayer === name ? '#f0f4ff' : 'white',
                  fontWeight: activeLayer === name ? 700 : 400,
                  fontSize: 13, color: '#1A2E5A', cursor: 'pointer',
                  border: 'none', borderBottom: name !== 'Dark' ? '1px solid #eee' : 'none',
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowLayers(p => !p)}
          title="Change map view"
          style={{
            background: 'white', border: '2px solid rgba(0,0,0,0.2)',
            borderRadius: 4, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 1px 5px rgba(0,0,0,0.15)',
          }}
        >
          <Layers size={14} color="#333" />
        </button>
      </div>

      {/* Fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        style={{
          position: 'absolute', bottom: 12, right: 12, zIndex: 1000,
          background: 'white', border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: 4, width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 1px 5px rgba(0,0,0,0.15)',
        }}
      >
        {isFullscreen ? <Minimize2 size={14} color="#333" /> : <Maximize2 size={14} color="#333" />}
      </button>
    </div>
  )
}
