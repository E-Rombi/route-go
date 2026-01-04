"use client"

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { VehicleRoute } from '../api/routeService';
import { Order } from '@/features/orders/api/orderService';
import { useState, useEffect } from 'react';
import { Map, Layers, Navigation } from 'lucide-react';

interface RouteMapProps {
    vehicles: VehicleRoute[];
    ordersMap: Record<number, Order>;
}

// Modern color palette with gradients
const VEHICLE_COLORS = [
    { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' }, // Indigo
    { main: '#f43f5e', light: '#fb7185', dark: '#e11d48' }, // Rose
    { main: '#10b981', light: '#34d399', dark: '#059669' }, // Emerald
    { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' }, // Amber
    { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed' }, // Violet
    { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2' }, // Cyan
    { main: '#ec4899', light: '#f472b6', dark: '#db2777' }, // Pink
];

// Map tile styles
const MAP_STYLES = {
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        name: 'Escuro'
    },
    light: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        name: 'Claro'
    }
};

// Create numbered marker icon with vehicle color
function createNumberedIcon(number: number, color: { main: string; light: string; dark: string }, vehicleId: number) {
    // Use vehicleId + number to create unique IDs and avoid SVG gradient conflicts
    const uniqueId = `v${vehicleId}-${number}`;
    const svg = `
        <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad${uniqueId}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${color.light};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${color.dark};stop-opacity:1" />
                </linearGradient>
                <filter id="shadow${uniqueId}" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
            </defs>
            <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.059 27.941 0 18 0z" 
                  fill="url(#grad${uniqueId})" filter="url(#shadow${uniqueId})"/>
            <circle cx="18" cy="16" r="12" fill="white" opacity="0.95"/>
            <text x="18" y="21" text-anchor="middle" font-family="Inter, system-ui, sans-serif" 
                  font-size="12" font-weight="700" fill="${color.dark}">${number}</text>
        </svg>
    `;

    return L.divIcon({
        html: svg,
        className: 'custom-marker',
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -44]
    });
}

// Create depot/start icon
function createDepotIcon() {
    const svg = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="depotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
                </linearGradient>
                <filter id="depotShadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.25"/>
                </filter>
            </defs>
            <circle cx="20" cy="20" r="18" fill="url(#depotGrad)" filter="url(#depotShadow)"/>
            <circle cx="20" cy="20" r="14" fill="white" opacity="0.95"/>
            <path d="M20 10 L28 18 L25 18 L25 28 L15 28 L15 18 L12 18 Z" fill="#16a34a"/>
        </svg>
    `;

    return L.divIcon({
        html: svg,
        className: 'depot-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
}

// Component to fit bounds
function FitBounds({ positions }: { positions: [number, number][] }) {
    const map = useMap();

    useEffect(() => {
        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, positions]);

    return null;
}

export default function RouteMap({ vehicles, ordersMap }: RouteMapProps) {
    const [mapStyle, setMapStyle] = useState<'dark' | 'light'>('light');
    const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);

    // Calculate center and all positions
    const orderValues = Object.values(ordersMap);
    const allPositions: [number, number][] = orderValues.map(o => [o.lat, o.lon]);

    const centerLat = orderValues.length > 0
        ? orderValues.reduce((sum, o) => sum + o.lat, 0) / orderValues.length
        : -23.55052;
    const centerLon = orderValues.length > 0
        ? orderValues.reduce((sum, o) => sum + o.lon, 0) / orderValues.length
        : -46.633309;

    const currentStyle = MAP_STYLES[mapStyle];

    return (
        <div className="relative group">
            {/* Glassmorphism container */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl -z-10" />

            {/* Map Style Switcher - Floating buttons */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-1.5 flex flex-col gap-1">
                    {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((style) => (
                        <button
                            key={style}
                            onClick={() => setMapStyle(style)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${mapStyle === style
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            {MAP_STYLES[style].name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Vehicle Legend - Floating panel */}
            {vehicles.length > 0 && (
                <div className="absolute bottom-4 left-4 z-[1000]">
                    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-3">
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <Navigation className="w-3 h-3" />
                            Veículos
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {vehicles.map((vehicle, idx) => {
                                const color = VEHICLE_COLORS[idx % VEHICLE_COLORS.length];
                                const isSelected = selectedVehicle === idx;
                                return (
                                    <button
                                        key={vehicle.vehicle_db_id}
                                        onClick={() => setSelectedVehicle(isSelected ? null : idx)}
                                        className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-200 ${isSelected
                                            ? 'bg-gray-100 dark:bg-gray-800 ring-2 ring-offset-1'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                            }`}
                                        style={{
                                            '--tw-ring-color': color.main
                                        } as React.CSSProperties}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full shadow-sm"
                                            style={{
                                                background: `linear-gradient(135deg, ${color.light}, ${color.dark})`
                                            }}
                                        />
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                            Veículo {vehicle.vehicle_db_id}
                                        </span>
                                        <span className="text-[10px] text-gray-400 ml-auto">
                                            {vehicle.route.filter(s => s.order_id).length} paradas
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Map Container */}
            <MapContainer
                center={[centerLat, centerLon]}
                zoom={13}
                style={{
                    height: '600px',
                    width: '100%',
                    borderRadius: '0.75rem',
                }}
                scrollWheelZoom={true}
                className="shadow-xl ring-1 ring-black/5"
            >
                <TileLayer
                    attribution={currentStyle.attribution}
                    url={currentStyle.url}
                />

                <FitBounds positions={allPositions} />

                {vehicles.map((vehicle, vIdx) => {
                    const color = VEHICLE_COLORS[vIdx % VEHICLE_COLORS.length];
                    const isSelected = selectedVehicle === null || selectedVehicle === vIdx;
                    const opacity = isSelected ? 1 : 0.3;

                    // Construct path coordinates
                    const positions: [number, number][] = [];
                    const ordersInRoute: { order: Order; stepIndex: number; step: typeof vehicle.route[0] }[] = [];

                    vehicle.route.forEach((step, sIdx) => {
                        if (step.order_id && ordersMap[step.order_id]) {
                            const o = ordersMap[step.order_id];
                            positions.push([o.lat, o.lon]);
                            ordersInRoute.push({ order: o, stepIndex: sIdx, step });
                        }
                    });

                    return (
                        <div key={vehicle.vehicle_db_id}>
                            {/* Route line with glow effect */}
                            <Polyline
                                positions={positions}
                                pathOptions={{
                                    color: color.light,
                                    weight: 8,
                                    opacity: opacity * 0.3,
                                    lineCap: 'round',
                                    lineJoin: 'round'
                                }}
                            />
                            <Polyline
                                positions={positions}
                                pathOptions={{
                                    color: color.main,
                                    weight: 4,
                                    opacity: opacity * 0.9,
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                    dashArray: undefined
                                }}
                            />

                            {/* Markers */}
                            {ordersInRoute.map(({ order, stepIndex, step }, orderIdx) => (
                                <Marker
                                    key={`${vehicle.vehicle_db_id}-${orderIdx}`}
                                    position={[order.lat, order.lon]}
                                    icon={createNumberedIcon(orderIdx + 1, color, vehicle.vehicle_db_id)}
                                    opacity={opacity}
                                >
                                    <Popup className="custom-popup">
                                        <div className="p-1 min-w-[200px]">
                                            {/* Header */}
                                            <div className="flex items-center gap-2 pb-2 mb-2 border-b border-gray-100">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${color.light}, ${color.dark})`
                                                    }}
                                                >
                                                    {orderIdx + 1}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 text-sm">
                                                        {order.customer_name}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400">
                                                        Pedido #{order.id}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500">Janela de Entrega</span>
                                                    <span className="font-medium text-gray-700">
                                                        {step.min_time} - {step.max_time} min
                                                    </span>
                                                </div>
                                                {order.demand && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-500">Demanda</span>
                                                        <span className="font-medium text-gray-700">
                                                            {order.demand} kg
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500">Veículo</span>
                                                    <span
                                                        className="font-medium px-1.5 py-0.5 rounded text-white text-[10px]"
                                                        style={{ backgroundColor: color.main }}
                                                    >
                                                        Veículo {vehicle.vehicle_db_id}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </div>
                    );
                })}
            </MapContainer>

            {/* Custom CSS for Leaflet popups */}
            <style jsx global>{`
                .custom-marker {
                    background: transparent !important;
                    border: none !important;
                }
                
                .depot-marker {
                    background: transparent !important;
                    border: none !important;
                }
                
                .leaflet-popup-content-wrapper {
                    border-radius: 12px !important;
                    padding: 0 !important;
                    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2) !important;
                    border: 1px solid rgba(0,0,0,0.05) !important;
                }
                
                .leaflet-popup-content {
                    margin: 8px !important;
                }
                
                .leaflet-popup-tip {
                    box-shadow: 0 4px 12px -4px rgba(0,0,0,0.15) !important;
                }
                
                .leaflet-control-zoom {
                    border: none !important;
                    border-radius: 10px !important;
                    overflow: hidden !important;
                    box-shadow: 0 4px 12px -2px rgba(0,0,0,0.15) !important;
                }
                
                .leaflet-control-zoom a {
                    background: rgba(255,255,255,0.95) !important;
                    backdrop-filter: blur(8px) !important;
                    color: #374151 !important;
                    border: none !important;
                    width: 36px !important;
                    height: 36px !important;
                    line-height: 36px !important;
                    font-size: 18px !important;
                    transition: all 0.2s ease !important;
                }
                
                .leaflet-control-zoom a:hover {
                    background: rgba(255,255,255,1) !important;
                    color: #111827 !important;
                }
                
                .dark .leaflet-control-zoom a {
                    background: rgba(17,24,39,0.95) !important;
                    color: #e5e7eb !important;
                }
                
                .dark .leaflet-control-zoom a:hover {
                    background: rgba(31,41,55,1) !important;
                    color: #f9fafb !important;
                }
            `}</style>
        </div>
    );
}
