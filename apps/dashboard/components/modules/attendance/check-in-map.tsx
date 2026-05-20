'use client'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'

const dot = L.divIcon({
  className: '',
  html: `<div style="background:#1A2E5A;width:13px;height:13px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
  iconSize: [13, 13],
  iconAnchor: [6, 6],
  popupAnchor: [0, -10],
})

export interface CheckInLocation {
  lat: number
  lng: number
  name: string
  time: string | null
  status: string
}

function FitBounds({ locs }: { locs: CheckInLocation[] }) {
  const map = useMap()
  useEffect(() => {
    if (locs.length === 0) return
    const bounds = L.latLngBounds(locs.map(l => [l.lat, l.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  }, [map, locs])
  return null
}

export function CheckInMap({ locations }: { locations: CheckInLocation[] }) {
  const center: [number, number] = locations.length > 0
    ? [locations[0].lat, locations[0].lng]
    : [-1.2864, 36.8172]

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: 280, borderRadius: 12, zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {locations.map((loc, i) => (
        <Marker key={i} position={[loc.lat, loc.lng]} icon={dot}>
          <Popup>
            <p style={{ margin: 0, fontWeight: 600 }}>{loc.name}</p>
            {loc.time && <p style={{ margin: '2px 0 0', fontSize: 12 }}>{loc.time}</p>}
            <p style={{ margin: '2px 0 0', fontSize: 12, textTransform: 'capitalize' }}>{loc.status}</p>
          </Popup>
        </Marker>
      ))}
      {locations.length > 1 && <FitBounds locs={locations} />}
    </MapContainer>
  )
}
