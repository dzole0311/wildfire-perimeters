import { useCallback, useState, useEffect, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl, ScaleControl, FullscreenControl } from 'react-map-gl';
import { MAPBOX_TOKEN } from '../config';
import type { EventFeature } from '../types/events';

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
}

export default function MapView({ features, selectedId, onSelectFeature, resetView }: MapViewProps) {
  const [viewState, setViewState] = useState(DEFAULT_VIEW_STATE);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [terrainEnabled, setTerrainEnabled] = useState(false);

  useEffect(() => {
    if (resetView) {
      setViewState({
        ...DEFAULT_VIEW_STATE,
        transitionDuration: 1000,
        transitionEasing: t => t * (2 - t),
      });
    }
  }, [resetView]);

  const onClick = useCallback((event) => {
    const feature = event.features?.[0];
    if (feature) {
      onSelectFeature(feature.properties.id.toString());
    }
  }, [onSelectFeature]);

  const onMouseMove = useCallback((event) => {
    if (!event.features) return;
    const feature = event.features.find(f =>
      ['events-fill', 'events-outline'].includes(f.layer.id)
    );
    setHoveredId(feature?.properties?.id?.toString() ?? null);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoveredId(null);
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
    console.log(`Map Position:`, {
      longitude: evt.viewState.longitude.toFixed(3),
      latitude: evt.viewState.latitude.toFixed(3),
      zoom: evt.viewState.zoom.toFixed(2),
      pitch: evt.viewState.pitch?.toFixed(2),
      bearing: evt.viewState.bearing?.toFixed(2),
    });
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
                // Dark red (initial fire area)
                0, '#8B0000',
                0.3, '#B22222',
                0.6, '#CD5C5C',
                0.8, '#FF4500',
                // Gold (most recent spread)
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

      <div className="absolute bottom-4 right-4 bg-black/70 p-4">
        <div className="text-white text-sm mb-2">Fire Spread</div>
        <div className="space-y-2">
          <div className="w-[287px] h-4 bg-gradient-to-r from-[#8B0000] via-[#CD5C5C] via-[#FF4500] to-[#FFD700]" />
          <div className="flex justify-between text-white text-xs px-1">
            <div>Initial</div>
            <div>Recent</div>
          </div>
        </div>
      </div>

    </Map>
  );
}