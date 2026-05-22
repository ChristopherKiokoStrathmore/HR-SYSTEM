'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Map, TileLayer } from 'leaflet'
import { Maximize2, Minimize2 } from 'lucide-react'

export interface CheckInLocation {
  lat: number
  lng: number
  name: string
  time: string | null
  status: string
}

const TILE_LAYERS = {
  Default: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    // Road-map thumbnail colours
    thumb: 'linear-gradient(135deg,#e8e0d8 25%,#fff 25%,#fff 50%,#e8e0d8 50%,#e8e0d8 75%,#fff 75%)',
    roads: true,
  },
  Satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a> World Imagery',
    maxZoom: 18,
    thumb: 'linear-gradient(160deg,#2d4a1e 0%,#3a5c28 40%,#1a3510 60%,#4a6e30 100%)',
    roads: false,
  },
  Terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
    thumb: 'linear-gradient(160deg,#c8d8a0 0%,#a0b870 40%,#d4c890 60%,#b8c880 100%)',
    roads: false,
  },
} as const

type LayerName = keyof typeof TILE_LAYERS

// Thumbnail that mimics the Google Maps layer card style
function LayerThumb({
  name,
  active,
  onClick,
}: {
  name: LayerName
  active: boolean
  onClick: () => void
}) {
  const cfg = TILE_LAYERS[name]
  return (
    <div
      onClick={onClick}
      title={name}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 6,
          background: cfg.thumb,
          border: active ? '3px solid #1A2E5A' : '2px solid rgba(0,0,0,0.25)',
          boxShadow: active
            ? '0 0 0 1px #1A2E5A, 0 2px 6px rgba(0,0,0,0.3)'
            : '0 1px 4px rgba(0,0,0,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Fake road lines for Default thumb */}
        {cfg.roads && (
          <>
            <div style={{ position:'absolute', top:'50%', left:0, right:0, height:3, background:'#fff', opacity:0.8 }} />
            <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:3, background:'#fff', opacity:0.6 }} />
          </>
        )}
      </div>
      <span style={{
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        color: active ? '#1A2E5A' : '#444',
        letterSpacing: '0.01em',
      }}>
        {name}
      </span>
    </div>
  )
}

export function CheckInMap({ locations }: { locations: CheckInLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const tileRef = useRef<TileLayer | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeLayer, setActiveLayer] = useState<LayerName>('Default')
  const [showPicker, setShowPicker] = useState(false)

  const toggleFullscreen = useCallback(() => setIsFullscreen(p => !p), [])

  // Invalidate map size on fullscreen change
  useEffect(() => {
    const id = setTimeout(() => mapRef.current?.invalidateSize(), 50)
    return () => clearTimeout(id)
  }, [isFullscreen])

  // Swap tile layer when selection changes
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

      const cfg = TILE_LAYERS['Default']
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
        position: 'fixed', inset: 0, zIndex: 9999,
      } : {
        position: 'relative', borderRadius: 12, overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        style={{ height: isFullscreen ? '100vh' : 280, width: '100%', zIndex: 0 }}
      />

      {/* Google Maps-style layer picker — appears above the button row */}
      {showPicker && (
        <div
          style={{
            position: 'absolute',
            bottom: 52,
            right: 8,
            zIndex: 1000,
            background: 'white',
            borderRadius: 10,
            padding: '12px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Map type
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {(Object.keys(TILE_LAYERS) as LayerName[]).map(name => (
              <LayerThumb
                key={name}
                name={name}
                active={activeLayer === name}
                onClick={() => { setActiveLayer(name); setShowPicker(false) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom-right controls row — mirrors Google Maps layout */}
      <div style={{
        position: 'absolute', bottom: 12, right: 8, zIndex: 1000,
        display: 'flex', gap: 6, alignItems: 'center',
      }}>
        {/* Layer toggle button — shows current layer's thumb */}
        <button
          onClick={() => setShowPicker(p => !p)}
          title="Map type"
          style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            border: showPicker ? '2px solid #1A2E5A' : '2px solid rgba(0,0,0,0.3)',
            background: TILE_LAYERS[activeLayer].thumb,
            cursor: 'pointer',
            boxShadow: '0 1px 5px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {TILE_LAYERS[activeLayer].roads && (
            <>
              <div style={{ position:'absolute', top:'50%', left:0, right:0, height:3, background:'#fff', opacity:0.8 }} />
              <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:3, background:'#fff', opacity:0.6 }} />
            </>
          )}
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          style={{
            width: 34,
            height: 34,
            borderRadius: 4,
            background: 'white',
            border: '2px solid rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 5px rgba(0,0,0,0.15)',
          }}
        >
          {isFullscreen ? <Minimize2 size={14} color="#333" /> : <Maximize2 size={14} color="#333" />}
        </button>
      </div>
    </div>
  )
}
