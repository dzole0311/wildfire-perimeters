import { useCallback, useState, useEffect, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl, ScaleControl, FullscreenControl, Popup } from 'react-map-gl';
import { MAPBOX_TOKEN } from '../config';
import type { EventFeature } from '../types/events';
import mapboxgl from 'mapbox-gl';
import { format } from 'date-fns';
import { Flame } from 'lucide-react';

import 'mapbox-gl/dist/mapbox-gl.css';

const DEFAULT_VIEW_STATE = {
  longitude: -114.185,
  latitude: 44.939,
  zoom: 8,
  pitch: 0,
  bearing: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 }
};

const COLORS = {
  yellow: '#f6a50b',
  orange: '#ea7434',
  red: '#c74956',
  smoke: '#ff8c00'
};

interface MapViewProps {
  features: EventFeature[];
  selectedId: string | null;
  onSelectFeature: (id: string) => void;
  resetView: boolean;
  shouldZoom?: boolean;
}

export default function MapView({ features, selectedId, onSelectFeature, resetView, shouldZoom = false }: MapViewProps) {
  const [viewState, setViewState] = useState(DEFAULT_VIEW_STATE);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [terrainEnabled, setTerrainEnabled] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<EventFeature | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (resetView) {
      setViewState({
        ...DEFAULT_VIEW_STATE,
        transitionDuration: 1000,
        transitionEasing: (t: number) => t * (2 - t),
      });
    }
  }, [resetView]);

  useEffect(() => {
    if (shouldZoom && selectedId && features.length) {
      const selectedFeature = features.find(f => f.properties.id.toString() === selectedId);
      if (selectedFeature && selectedFeature.geometry.type === 'Polygon') {
        const coordinates = selectedFeature.geometry.coordinates[0] as [number, number][];
        const bounds = coordinates.reduce(
          (bounds, coord) => {
            bounds.extend(coord);
            return bounds;
          },
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );

        const padding = { top: 50, bottom: 50, left: 50, right: 50 };

        setViewState(prev => ({
          ...prev,
          longitude: bounds.getCenter().lng,
          latitude: bounds.getCenter().lat,
          zoom: Math.min(16, prev.zoom + 1),
          padding,
          transitionDuration: 1000,
          transitionEasing: (t: number) => t * (2 - t),
        }));
      }
    }
  }, [selectedId, features, shouldZoom]);

  const onClick = useCallback((event: { features?: any[] }) => {
    const feature = event.features?.[0];
    if (feature) {
      onSelectFeature(feature.properties.id.toString());
    }
  }, [onSelectFeature]);

  const onMouseMove = useCallback((event: { features?: any[]; lngLat?: { lng: number; lat: number } }) => {
    if (!event.features) return;
    const feature = event.features.find((f: any) =>
      ['events-fill', 'events-outline'].includes(f.layer.id)
    );

    if (feature) {
      const matchingFeature = features.find(f => f.properties.id.toString() === feature.properties.id);
      setHoveredFeature(matchingFeature || null);
      setHoveredId(feature.properties.id.toString());
      if (event.lngLat) {
        setCursorPosition({ x: event.lngLat.lng, y: event.lngLat.lat });
      }
    } else {
      setHoveredFeature(null);
      setHoveredId(null);
      setCursorPosition(null);
    }
  }, [features]);

  const onMouseLeave = useCallback(() => {
    setHoveredFeature(null);
    setHoveredId(null);
    setCursorPosition(null);
  }, []);

  const processedGeojsonData = useMemo(() => {
    const fireGroups = features.reduce((acc, feature) => {
      const fireid = feature.properties.fireid;
      if (!acc[fireid]) {
        acc[fireid] = [];
      }
      acc[fireid].push(feature);
      return acc;
    }, {});

    const processedFeatures = Object.values(fireGroups).flatMap(fireGroup => {
      const timestamps = fireGroup.map(f => new Date(f.properties.t).getTime());
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      const timeRange = maxTime - minTime;

      return fireGroup.map(f => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          ...f.properties,
          isSelected: f.properties.id.toString() === selectedId,
          isHovered: f.properties.id.toString() === hoveredId,
          normalizedTime: timeRange === 0 ? 0 :
            (new Date(f.properties.t).getTime() - minTime) / timeRange
        }
      }));
    });

    return {
      type: 'FeatureCollection',
      features: processedFeatures
    };
  }, [features, selectedId, hoveredId]);

  const handleMove = useCallback((evt: { viewState: any }) => {
    setViewState(evt.viewState);
  }, []);

  return (
    <Map
      {...viewState}
      onMove={handleMove}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      interactiveLayerIds={['events-fill', 'events-outline']}
      mapboxAccessToken={MAPBOX_TOKEN}
      style={{ width: '100%', height: '100%' }}
      mapStyle={terrainEnabled
        ? "mapbox://styles/mapbox/satellite-v9"
        : "mapbox://styles/mapbox/dark-v11"
      }
      dragRotate={true}
      touchPitch={true}
      touchZoomRotate={true}
      minPitch={0}
      maxPitch={85}
      terrain={terrainEnabled ? { source: 'mapbox-terrain', exaggeration: 1.5 } : undefined}
    >
      <NavigationControl position="top-left" style={{ marginTop: '10px' }} />
      <FullscreenControl position="top-left" />
      <ScaleControl position="bottom-left" maxWidth={100} unit="metric" />

      <div className="absolute top-[145px] left-2.5">
        <button
          onClick={() => {
            setTerrainEnabled(prev => !prev);

            if (!terrainEnabled) {
              setViewState(prev => ({
                ...prev,
                pitch: 45,
                transitionDuration: 1000,
              }));
            } else {
              setViewState(prev => ({
                ...prev,
                pitch: 0,
                transitionDuration: 1000,
              }));
            }
          }}
          className={`px-1.5 py-1.5 rounded bg-white border border-white/20
            ${terrainEnabled ? 'bg-white' : ''}`}
          title={terrainEnabled ? "Disable 3D Terrain" : "Enable 3D Terrain"}
        >
          <span className="text-black text-xs font-medium">
            {terrainEnabled ? "2D" : "3D"}
          </span>
        </button>
      </div>

      <Source
        id="mapbox-terrain"
        type="raster-dem"
        url="mapbox://mapbox.terrain-rgb"
        tileSize={512}
      />

      <Source type="geojson" data={processedGeojsonData}>
        <Layer
          id="events-smoke"
          type="circle"
          paint={{
            'circle-radius': [
              'case',
              ['get', 'isHovered'], 10,
              ['get', 'isSelected'], 10,
              0
            ],
            'circle-color': COLORS.smoke,
            'circle-blur': 1,
            'circle-opacity': [
              'case',
              ['get', 'isHovered'], 0.1,
              ['get', 'isSelected'], 0.1,
              0
            ]
          }}
        />

        <Layer
          id="events-fill"
          type="fill"
          paint={{
            'fill-color': [
              'case',
              ['get', 'isHovered'], COLORS.yellow,
              ['get', 'isSelected'], COLORS.orange,
              [
                'interpolate',
                ['linear'],
                ['get', 'normalizedTime'],
                0, '#8B0000',
                0.3, '#B22222',
                0.6, '#CD5C5C',
                0.8, '#FF4500',
                1, '#FFD700'
              ]
            ],
            'fill-opacity': [
              'case',
              ['get', 'isHovered'], 0.7,
              ['get', 'isSelected'], 0.6,
              0.5
            ]
          }}
          layout={{
            'fill-sort-key': ['-', 0, ['get', 'duration']]
          }}
        />

        <Layer
          id="events-outline"
          type="line"
          paint={{
            'line-color': [
              'case',
              ['get', 'isHovered'], COLORS.yellow,
              ['get', 'isSelected'], COLORS.orange,
              COLORS.red
            ],
            'line-width': [
              'case',
              ['get', 'isHovered'], 4,
              ['get', 'isSelected'], 3,
              1
            ],
            'line-opacity': [
              'case',
              ['get', 'isHovered'], 1,
              ['get', 'isSelected'], 0.8,
              0.5
            ]
          }}
          layout={{
            'line-sort-key': ['-', 0, ['get', 'duration']]
          }}
        />
      </Source>

      <div className="absolute bottom-4 right-4 bg-black/70 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
        <div className="text-white text-sm mb-2">Fire Spread</div>
        <div className="space-y-2">
          <div className="w-[287px] h-4 bg-gradient-to-r from-[#8B0000] via-[#CD5C5C] via-[#FF4500] to-[#FFD700] rounded-lg" />
          <div className="flex justify-between text-white text-xs px-1">
            <div>Initial</div>
            <div>Recent</div>
          </div>
        </div>
      </div>

      {hoveredFeature && cursorPosition && (
        <Popup
          longitude={cursorPosition.x}
          latitude={cursorPosition.y}
          closeButton={false}
          closeOnClick={false}
          anchor="top"
          className="fire-popup z-[9999]"
          offset={15}
        >
          <div className="p-3 space-y-2 min-w-[200px]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                Fire Event {hoveredFeature.properties.id.toString().split('_')[0]}
              </div>
              {hoveredFeature.properties.isactive && (
                <div className="flex items-center gap-1 text-xs text-orange-400">
                  <Flame className="w-3 h-3" />
                  Active
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="text-gray-400">Last Update</div>
                <div>{format(new Date(hoveredFeature.properties.t), 'MMM d, HH:mm')}</div>

                <div className="text-gray-400">Area Affected</div>
                <div>{(hoveredFeature.properties.farea || 0).toFixed(1)} km²</div>

                <div className="text-gray-400">Duration</div>
                <div>{hoveredFeature.properties.duration} days</div>

                <div className="text-gray-400">Fire Intensity</div>
                <div>{(hoveredFeature.properties.meanfrp || 0).toFixed(1)} MW</div>

                <div className="text-gray-400">Perimeter</div>
                <div>{(hoveredFeature.properties.fperim || 0).toFixed(1)} km</div>

                <div className="text-gray-400">Region</div>
                <div>{hoveredFeature.properties.region}</div>
              </div>

              {hoveredFeature.properties.isactive && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="text-orange-300 font-medium">⚠️ Active Fire Area</div>
                  <div className="text-gray-400 text-[11px] mt-1">
                    This area is currently experiencing active fire activity. Exercise caution and follow local authorities' guidance.
                  </div>
                </div>
              )}
            </div>
          </div>
        </Popup>
      )}

    </Map>
  );
}