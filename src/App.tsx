import { useCallback, useState, useEffect } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import { EventFeature } from './types/events';
import RangeSlider from './components/RangeSlider';
import { API_URL } from './config';
// import { mockApiResponse } from './mocks/fireData';

interface ApiResponse {
  features: EventFeature[];
  type: string;
  numberMatched: number;
  numberReturned: number;
}

function App() {
  const [features, setFeatures] = useState<EventFeature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resetView, setResetView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `${API_URL}/collections/public.eis_fire_lf_perimeter_nrt/items?limit=3000`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const data: ApiResponse = await response.json();

        const seenEvents = new Set<string>();
        const transformedFeatures = data.features
          .map(feature => ({
            type: 'Feature',
            geometry: feature.geometry,
            properties: {
              id: `${feature.properties.fireid}_${feature.properties.t}_${feature.properties.farea}`,
              fireid: feature.properties.fireid,
              timestamp: feature.properties.t,
              farea: feature.properties.farea,
              duration: feature.properties.duration,
              meanfrp: feature.properties.meanfrp,
              fperim: feature.properties.fperim,
              region: feature.properties.region,
              pixden: feature.properties.pixden,
              n_newpixels: feature.properties.n_newpixels,
              n_pixels: feature.properties.n_pixels,
              isactive: feature.properties.isactive,
              t: feature.properties.t
            }
          }))
          .filter(feature => {
            const eventKey = `${feature.properties.fireid}_${feature.properties.t}_${feature.properties.farea}`;
            if (seenEvents.has(eventKey)) return false;
            seenEvents.add(eventKey);
            return true;
          });

        setFeatures(transformedFeatures);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleResetView = useCallback(() => {
    setSelectedId(null);
    setResetView(true);
  }, []);

  const handleSelectFeature = useCallback((id: string) => {
    setResetView(false);
    setSelectedId(id);
  }, []);

  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const filteredFeatures = dateRange
    ? features.filter(f => {
        const date = new Date(f.properties.timestamp);
        return date >= dateRange.start && date <= dateRange.end;
      })
    : features;

  const handleDateRangeChange = useCallback((range: { start: Date; end: Date }) => {
    setDateRange(range);
  }, []);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="space-y-2 text-center">
          <div className="text-lg text-red-400">Error loading data</div>
          <div className="text-sm text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="space-y-2 text-center">
          <div className="text-lg">Loading events...</div>
          <div className="text-sm text-gray-400">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex">
      <main className="flex-1 relative">
        <MapView
          features={filteredFeatures}
          selectedId={selectedId}
          onSelectFeature={handleSelectFeature}
          resetView={resetView}
        />
          <RangeSlider
            events={features}
            onRangeChange={handleDateRangeChange}
          />
      </main>
      <Sidebar
        features={filteredFeatures}
        selectedId={selectedId}
        onSelectFeature={handleSelectFeature}
        onResetView={handleResetView}
      />
    </div>
  );
}export default App;

