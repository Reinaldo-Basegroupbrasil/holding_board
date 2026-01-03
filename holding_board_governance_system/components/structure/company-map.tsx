"use client"

import React, { useMemo } from "react"
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"
import { Tooltip } from "react-tooltip"
import { MapPin } from "lucide-react"

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

const COUNTRY_COORDS: Record<string, [number, number]> = {
  // América do Sul
  "Brazil": [-55, -10],
  "Brasil": [-55, -10],
  "Paraguay": [-58, -23],   
  "Uruguay": [-56, -33],    
  "Colombia": [-74, 4.6],   
  "Argentina": [-64, -34],
  "Chile": [-71, -33],
  

  // América do Norte / Central
  "United States": [-100, 40],
  "USA": [-100, 40],
  "Cayman Islands": [-81.25, 19.3],
  "Bahamas": [-77.4, 25.0],
  "Mexico": [-102, 23],

  // Europa
  "Portugal": [-8, 39.5],
  "United Kingdom": [-2, 54],
  "Estonia": [25, 59],
  "Spain": [-3, 40],
  
  // Ásia
  "China": [105, 35],
  "Hong Kong": [114, 22],
  "Singapore": [103.8, 1.35],
}

export function CompanyMap({ companies }: { companies: any[] }) {
  const groupedData = useMemo(() => {
    const groups: Record<string, string[]> = {}
    companies.forEach(comp => {
      const country = comp.country || "Desconhecido"
      if (!groups[country]) groups[country] = []
      groups[country].push(comp.name)
    })
    return Object.entries(groups).map(([country, names]) => {
      const coords = COUNTRY_COORDS[country]
      return coords ? { country, names, coordinates: coords } : null
    }).filter(Boolean) as { country: string, names: string[], coordinates: [number, number] }[]
  }, [companies])

  return (
    <div className="w-full h-[550px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800 relative">
      
      <div className="absolute top-6 left-6 z-10 bg-slate-900/80 backdrop-blur-sm p-3 rounded-lg border border-slate-800 pointer-events-none">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5 text-rose-600" /> Presença Global
        </h3>
        <p className="text-slate-400 text-xs">
          {companies.length} entidades em {groupedData.length} jurisdições.
        </p>
      </div>

      <ComposableMap 
        projection="geoMercator" 
        // --- ZOOM MAIOR (MAIS PERTO) ---
        // Scale 120: Aproxima bem os continentes
        // Center [0, 10]: Centraliza levemente ao Norte do Equador para equilibrar EUA e Brasil na tela
        projectionConfig={{ scale: 180, center: [0, 22] }} 
        className="w-full h-full"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1e293b"
                stroke="#334155"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { fill: "#334155", outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {groupedData.map(({ country, names, coordinates }) => (
          <Marker key={country} coordinates={coordinates}>
            <g
              data-tooltip-id="map-tooltip"
              data-tooltip-html={`
                <div class='font-bold text-sm text-white mb-2 pb-1 border-b border-slate-600 uppercase tracking-wider'>${country}</div>
                ${names.map(n => `<div class='text-xs text-slate-300'>• ${n}</div>`).join('')}
              `}
              className="cursor-pointer group"
            >
              <circle r={6} fill="#e11d48" stroke="#fff" strokeWidth={1.5} className="group-hover:fill-rose-500 transition-colors" />
            </g>
          </Marker>
        ))}
      </ComposableMap>

      <Tooltip 
        id="map-tooltip" 
        float={true}
        className="z-50"
        style={{ 
            backgroundColor: "#0f172a", 
            color: "white", 
            padding: "12px", 
            borderRadius: "8px", 
            border: "1px solid #334155", 
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            zIndex: 9999
        }}
      />
    </div>
  )
}