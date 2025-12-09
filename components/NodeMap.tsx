'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pNode } from '@/types';
import { calculateHealthScore } from '@/lib/health';
import Link from 'next/link';
import { formatBytes, formatLatency } from '@/lib/utils';

// Fix for default marker icons in Next.js - only run on client
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface NodeMapProps {
  nodes: pNode[];
}

function FitBounds({ nodes }: { nodes: pNode[] }) {
  const map = useMap();
  const hasFitted = useRef(false);
  
  useEffect(() => {
    if (nodes.length > 0 && !hasFitted.current && map) {
      try {
        const nodesWithCoords = nodes.filter(
          node => node.location?.latitude && node.location?.longitude
        );
        
        if (nodesWithCoords.length > 0) {
          // Leaflet LatLngBounds expects [lat, lng] format
          const bounds = new LatLngBounds(
            nodesWithCoords.map(node => [
              node.location!.latitude!,  // latitude first
              node.location!.longitude!  // longitude second
            ] as [number, number])
          );
          
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
            hasFitted.current = true;
          }
        }
      } catch (error) {
        console.warn('Error fitting map bounds:', error);
      }
    }
  }, [map, nodes]);

  return null;
}

export function NodeMap({ nodes }: NodeMapProps) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const MAX_MARKERS = 800; // Cap markers to keep map performant

  useEffect(() => {
    // Only render map on client side after mount
    if (typeof window !== 'undefined') {
      // Small delay to ensure DOM is fully ready
      const timer = setTimeout(() => {
        setMounted(true);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {
            // Ignore cleanup errors
          }
          mapInstanceRef.current = null;
        }
      };
    }
  }, []);

  const nodesWithLocation = nodes.filter(
    (node): node is pNode & { location: NonNullable<pNode['location']> } =>
      node.location?.latitude !== undefined && node.location?.longitude !== undefined
  );
  const displayNodes = nodesWithLocation.slice(0, MAX_MARKERS);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">Error loading map</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="relative h-[600px] w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  if (nodesWithLocation.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 dark:bg-gray-900 rounded-lg">
        <p className="text-gray-500 dark:text-gray-500">
          No geographic data available for nodes
        </p>
      </div>
    );
  }

  // Calculate center point
  const avgLat = displayNodes.reduce((sum, n) => sum + n.location.latitude!, 0) / displayNodes.length;
  const avgLng = displayNodes.reduce((sum, n) => sum + n.location.longitude!, 0) / displayNodes.length;

  // Ensure we have valid coordinates before rendering map
  if (isNaN(avgLat) || isNaN(avgLng) || !isFinite(avgLat) || !isFinite(avgLng)) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 dark:bg-gray-900 rounded-lg">
        <p className="text-gray-500 dark:text-gray-500">
          Invalid coordinates for map display
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
      {typeof window !== 'undefined' && (
        <MapContainer
          key={`map-${mounted}`}
          center={[avgLat, avgLng]}
          zoom={nodesWithLocation.length === 1 ? 10 : 2}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          scrollWheelZoom={true}
        >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds nodes={displayNodes} />
        
        {displayNodes.map((node) => {
          const health = calculateHealthScore(node);
          const getMarkerColor = () => {
            if (node.status === 'offline') return '#6b7280';
            if (health.score >= 80) return '#10b981';
            if (health.score >= 50) return '#f59e0b';
            return '#ef4444';
          };

          // Create custom marker icon
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              width: 12px;
              height: 12px;
              background-color: ${getMarkerColor()};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });

          return (
            <Marker
              key={node.id}
              position={[node.location.latitude!, node.location.longitude!]}
              icon={customIcon}
            >
              <Popup>
                <div className="p-2 min-w-[250px]">
                  <div className="flex items-center justify-between mb-2">
                    <Link
                      href={`/nodes/${node.id}`}
                      className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {node.id}
                    </Link>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        node.status === 'online'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {node.location.country && (
                      <p>
                        <span className="font-medium">Location:</span> {node.location.country}
                        {node.location.region && `, ${node.location.region}`}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Health:</span> {health.score}/100
                    </p>
                    <p>
                      <span className="font-medium">Peers:</span> {node.peerCount}
                    </p>
                    {node.latency && (
                      <p>
                        <span className="font-medium">Latency:</span> {formatLatency(node.latency)}
                      </p>
                    )}
                    {node.storageUsed && node.storageCapacity && (
                      <p>
                        <span className="font-medium">Storage:</span>{' '}
                        {formatBytes(node.storageUsed)} / {formatBytes(node.storageCapacity)}
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        </MapContainer>
      )}
    </div>
  );
}
