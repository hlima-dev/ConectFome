import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { RoutePlan } from '../types/logistics'

interface RouteMapProps {
  plan: RoutePlan
}

// Marcadores como HTML (divIcon): numerados para as paradas de coleta e "R"
// para os receptores. Evita os ícones em imagem do Leaflet, que quebram com
// bundlers, e deixa o mapa legível sem depender de arquivos externos.
function numberedIcon(label: string, tone: 'stop' | 'recipient') {
  const color = tone === 'stop' ? '#047857' : '#1d4ed8'
  const radius = tone === 'stop' ? '9999px' : '6px'
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;border-radius:${radius};background:${color};color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font:600 13px system-ui,sans-serif">${label}</div>`,
  })
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

// Mapa da rota: paradas na ordem sugerida, ligadas por linhas retas, e os
// receptores. Os mosaicos vêm do OpenStreetMap (uso leve, com atribuição).
export function RouteMap({ plan }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([-23.5, -47.45], 11)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    const points: L.LatLngTuple[] = []

    plan.stops.forEach((stop) => {
      const point: L.LatLngTuple = [stop.latitude, stop.longitude]
      points.push(point)
      L.marker(point, { icon: numberedIcon(String(stop.sequence), 'stop'), title: stop.donorName })
        .bindPopup(`<strong>${stop.sequence}. ${escapeHtml(stop.donorName)}</strong><br/>${escapeHtml(stop.address ?? '')}`)
        .addTo(layer)
    })

    if (plan.stops.length > 1) {
      L.polyline(
        plan.stops.map((s) => [s.latitude, s.longitude] as L.LatLngTuple),
        { color: '#047857', weight: 3, opacity: 0.7, dashArray: '6 6' },
      ).addTo(layer)
    }

    plan.recipients.forEach((recipient) => {
      const point: L.LatLngTuple = [recipient.latitude, recipient.longitude]
      points.push(point)
      L.marker(point, { icon: numberedIcon('R', 'recipient'), title: recipient.name })
        .bindPopup(`<strong>Receptor: ${escapeHtml(recipient.name)}</strong><br/>${escapeHtml(recipient.address ?? '')}`)
        .addTo(layer)
    })

    if (points.length === 1) map.setView(points[0], 14)
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [32, 32] })
  }, [plan])

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa da rota"
      className="h-80 w-full overflow-hidden rounded-xl border border-slate-200"
    />
  )
}
