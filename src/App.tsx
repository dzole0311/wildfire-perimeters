import { useCallback, useState, useEffect } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import { EventFeature } from './types/events';
import RangeSlider from './components/RangeSlider';
import { Toaster, toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface RawFireEvent {
  collectionId: string;
  itemId: string;
  duration: number;
  farea: number;
  fireid: number;
  flinelen: number;
  fperim: number;
  meanfrp: number;
  n_newpixels: number;
  n_pixels: number;
  pixden: number;
  region: string;
  t: string;
  geometry: string;
  isactive: number;
}

function App() {
  const [features, setFeatures] = useState<EventFeature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [resetView, setResetView] = useState(false);
  const [shouldZoom, setShouldZoom] = useState(false);
  const [filters, setFilters] = useState<Record<string, { min: number; max: number }>>({});
  const [activeToastId, setActiveToastId] = useState<string | undefined>();

  const debouncedFilters = useDebounce(filters, 500);

  useEffect(() => {
    if (activeToastId) {
      toast.dismiss(activeToastId);
    }

    async function fetchData() {
      const toastId = toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'}
          max-w-md w-full bg-black/80 shadow-lg rounded-lg pointer-events-auto
          flex items-center gap-3 p-4 text-white border border-white/10 backdrop-blur-sm`}
        >
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          <p className="text-sm">Querying events...</p>
        </div>
      ), {
        position: 'top-center',
        duration: Infinity
      });

      setActiveToastId(toastId);

      try {
        const response = await fetch('/fire_perimeters.geojson');
        const data: RawFireEvent[] = await response.json();

        console.log('Raw data sample:', data[0]);

        const transformedFeatures = data.map(item => {
          const geometry = item.geometry;
          let coordinates: [number, number][][] = [];

          if (geometry.includes('MULTIPOLYGON')) {
            const multiPolygonString = geometry
              .replace('SRID=4326;MULTIPOLYGON(((', '')
              .replace(')))', '')
              .trim();

            const polygons = multiPolygonString.split(')),((')
              .map(poly => poly.split(',')
                .map(coord => {
                  const [lon, lat] = coord.trim().split(' ');
                  return [parseFloat(lon), parseFloat(lat)] as [number, number];
                })
                .filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]))
              )
              .filter(poly => poly.length >= 3);

            if (polygons.length > 0) {
              coordinates = [polygons.reduce((a, b) => a.length > b.length ? a : b)];
            }
          } else {
            const polygonString = geometry
              .replace('SRID=4326;POLYGON((', '')
              .replace('))', '')
              .trim();

            const coords = polygonString.split(',')
              .map(coord => {
                const [lon, lat] = coord.trim().split(' ');
                return [parseFloat(lon), parseFloat(lat)] as [number, number];
              })
              .filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));

            if (coords.length >= 3) {
              coordinates = [coords];
            }
          }

          if (coordinates.length === 0 || coordinates[0].length < 3) {
            return null;
          }

          const firstPoly = coordinates[0];
          const firstPoint = firstPoly[0];
          const lastPoint = firstPoly[firstPoly.length - 1];
          if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            firstPoly.push([...firstPoint]);
          }

          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: coordinates
            },
            properties: {
              id: item.itemId,
              fireid: item.fireid,
              timestamp: item.t,
              duration: item.duration,
              farea: item.farea,
              meanfrp: item.meanfrp,
              fperim: item.fperim,
              region: item.region,
              pixden: item.pixden,
              n_newpixels: item.n_newpixels,
              n_pixels: item.n_pixels,
              isactive: item.isactive,
              t: item.t
            }
          };
        }).filter((feature): feature is EventFeature => feature !== null);

        const filteredFeatures = transformedFeatures.filter(feature => {
          if (debouncedFilters.farea?.min !== undefined && feature.properties.farea < debouncedFilters.farea.min) return false;
          if (debouncedFilters.farea?.max !== undefined && feature.properties.farea > debouncedFilters.farea.max) return false;
          if (debouncedFilters.duration?.min !== undefined && feature.properties.duration < debouncedFilters.duration.min) return false;
          if (debouncedFilters.duration?.max !== undefined && feature.properties.duration > debouncedFilters.duration.max) return false;
          if (debouncedFilters.meanfrp?.min !== undefined && feature.properties.meanfrp < debouncedFilters.meanfrp.min) return false;
          if (debouncedFilters.meanfrp?.max !== undefined && feature.properties.meanfrp > debouncedFilters.meanfrp.max) return false;
          return true;
        });

        setFeatures(filteredFeatures);
      } catch (err) {
        console.error('Error loading GeoJSON:', err);
      } finally {
        toast.dismiss(toastId);
        setActiveToastId(undefined);
      }
    }

    fetchData();
  }, [debouncedFilters]);

  const handleResetView = useCallback(() => {
    setSelectedId(null);
    setLastSelectedId(null);
    setResetView(true);
    setShouldZoom(false);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedId(lastSelectedId);
    setShouldZoom(false);
  }, [lastSelectedId]);

  const handleSelectFeature = useCallback((id: string, fromSidebar = false) => {
    setResetView(false);
    setShouldZoom(fromSidebar);
    setSelectedId(id);
    setLastSelectedId(id);
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

  const handleFiltersChange = useCallback((newFilters: Record<string, { min: number; max: number }>) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="h-screen w-screen flex">
      <Toaster />
      <main className="flex-1 relative">
        <MapView
          features={filteredFeatures}
          selectedId={selectedId}
          onSelectFeature={handleSelectFeature}
          resetView={resetView}
          shouldZoom={shouldZoom}
        />
        <RangeSlider
          events={features}
          onRangeChange={handleDateRangeChange}
          onFiltersChange={handleFiltersChange}
        />
      </main>
      <Sidebar
        features={filteredFeatures}
        selectedId={selectedId || lastSelectedId}
        onSelectFeature={(id) => handleSelectFeature(id, true)}
        onResetView={handleResetView}
        onBack={handleBack}
      />
    </div>
  );
}

export default App;

