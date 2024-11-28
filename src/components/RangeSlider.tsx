import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { LineChart, Line, YAxis, ResponsiveContainer, TooltipProps, Tooltip } from 'recharts';
import { Play, Pause, RotateCcw, Filter } from 'lucide-react';
import { EventFeature } from '../types/events';

interface RangeSliderProps {
  events: EventFeature[];
  onRangeChange: (range: { start: Date; end: Date }) => void;
  onFiltersChange: (filters: Record<string, { min: number; max: number }>) => void;
}

const CHART_PROPERTIES = [
  { value: 'farea', label: 'Fire Area (km²)', formatter: (v: number) => `${v.toFixed(2)} km²` },
  { value: 'fperim', label: 'Fire Perimeter (km)', formatter: (v: number) => `${v.toFixed(2)} km` },
  { value: 'meanfrp', label: 'Mean Fire Radiative Power (MW)', formatter: (v: number) => `${v.toFixed(2)} MW` },
  { value: 'duration', label: 'Duration (days)', formatter: (v: number) => `${v.toFixed(0)} days` },
  { value: 'n_pixels', label: 'Number of Pixels', formatter: (v: number) => v.toString() }
];

const FILTER_OPTIONS = [
  { id: 'farea', label: 'Fire Area', unit: 'km²', min: 0, max: 100 },
  { id: 'duration', label: 'Duration', unit: 'days', min: 0, max: 30 },
  { id: 'meanfrp', label: 'Mean FRP', unit: 'MW', min: 0, max: 1000 }
];

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const selectedProp = CHART_PROPERTIES.find(p => p.value === payload[0].dataKey);
    return (
      <div className="bg-gray-900 p-2 shadow-lg border border-gray-700">
        <p className="text-gray-300 text-sm">
          {format(new Date(payload[0].payload.timestamp), 'MMM d, yyyy HH:mm')}
        </p>
        <p className="text-white font-medium">
          {selectedProp?.label}: {selectedProp?.formatter(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const RangeSlider = ({ events, onRangeChange, onFiltersChange }: RangeSliderProps) => {
  const [dragging, setDragging] = useState<'start' | 'end' | 'selection' | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0 });
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState(CHART_PROPERTIES[0].value);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, { min: number; max: number }>>({});

  const dates = useMemo(() =>
    events
      .map(e => new Date(e.properties.timestamp).getTime())
      .filter(d => !isNaN(d))
      .sort((a, b) => a - b)
  , [events]);

  const absoluteMinDate = new Date('2024-08-03').getTime();
  const absoluteMaxDate = new Date('2024-09-30').getTime();

  const { minDate, maxDate, totalRange } = useMemo(() => ({
    minDate: absoluteMinDate,
    maxDate: absoluteMaxDate,
    totalRange: absoluteMaxDate - absoluteMinDate
  }), []);

  const [range, setRange] = useState(() => {
    if (!dimensions.width) return { start: 0, end: 100 };

    const defaultStartDate = new Date('2024-02-01').getTime();
    const defaultEndDate = new Date('2024-12-01').getTime();

    const getPositionFromDate = (date: number) => {
      const percentage = (date - minDate) / totalRange;
      return Math.max(0, Math.min(dimensions.width * percentage, dimensions.width));
    };

    return {
      start: getPositionFromDate(defaultStartDate),
      end: getPositionFromDate(defaultEndDate)
    };
  });

  useEffect(() => {
    if (containerRef) {
      const width = containerRef.getBoundingClientRect().width;
      setDimensions({ width });

      const defaultStartDate = new Date('2024-06-01').getTime();
      const defaultEndDate = new Date('2024-08-30').getTime();

      const getPositionFromDate = (date: number) => {
        const percentage = (date - minDate) / totalRange;
        return Math.max(0, Math.min(width * percentage, width));
      };

      setRange({
        start: getPositionFromDate(defaultStartDate),
        end: getPositionFromDate(defaultEndDate)
      });

      onRangeChange({
        start: new Date(defaultStartDate),
        end: new Date(defaultEndDate)
      });
    }
  }, [containerRef, minDate, maxDate, totalRange, onRangeChange]);

  const chartData = useMemo(() => {
    if (events.length === 0) return [];

    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.properties.t).getTime() - new Date(b.properties.t).getTime()
    );

    return sortedEvents.map(event => ({
      timestamp: new Date(event.properties.t).getTime(),
      farea: event.properties.farea,
      duration: event.properties.duration,
      meanfrp: event.properties.meanfrp,
      fperim: event.properties.fperim,
      n_pixels: event.properties.n_pixels
    }));
  }, [events]);

  const getDateFromPosition = useCallback((position: number) => {
    if (!dimensions.width) return minDate;
    const percentage = Math.max(0, Math.min(position / dimensions.width, 1));
    return new Date(minDate + (totalRange * percentage));
  }, [minDate, totalRange, dimensions.width]);

  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      if (isPlaying) {
        setRange(prev => {
          const increment = (dimensions.width * playbackSpeed) / 100;
          const newEnd = Math.min(prev.end + increment, dimensions.width);
          const newStart = Math.min(prev.start + increment, newEnd - 20);

          if (newEnd >= dimensions.width) {
            setIsPlaying(false);
            return prev;
          }

          const dateRange = {
            start: getDateFromPosition(newStart),
            end: getDateFromPosition(newEnd)
          };
          onRangeChange(dateRange);

          return { start: newStart, end: newEnd };
        });
        animationFrame = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      animationFrame = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, playbackSpeed, dimensions.width, onRangeChange, getDateFromPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'selection') => {
    e.stopPropagation();
    setDragging(type);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !containerRef) return;

    const rect = containerRef.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, dimensions.width));

    setRange(prev => {
      const minWidth = 20;
      const newRange = { ...prev };

      if (dragging === 'start') {
        newRange.start = Math.min(x, prev.end - minWidth);
      } else if (dragging === 'end') {
        newRange.end = Math.max(x, prev.start + minWidth);
      } else if (dragging === 'selection') {
        const width = prev.end - prev.start;
        newRange.start = Math.max(0, Math.min(x - width / 2, dimensions.width - width));
        newRange.end = newRange.start + width;
      }

      const dateRange = {
        start: getDateFromPosition(newRange.start),
        end: getDateFromPosition(newRange.end)
      };

      if (dateRange.start && dateRange.end &&
          !isNaN(dateRange.start.getTime()) &&
          !isNaN(dateRange.end.getTime())) {
        onRangeChange(dateRange);
      }

      return newRange;
    });
  }, [dragging, containerRef, dimensions.width, getDateFromPosition, onRangeChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleReset = useCallback(() => {
    setRange({ start: 0, end: dimensions.width });
    onRangeChange({ start: minDate, end: maxDate });
    setIsPlaying(false);
  }, [dimensions.width, minDate, maxDate, onRangeChange]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="bg-black/70 p-4 space-y-4 w-full max-w-[800px] absolute bottom-[17px] left-[calc(50%-160px)] transform -translate-x-1/2 z-10 rounded-2xl border border-white/10 backdrop-blur-sm">
      <div className="relative">
        <div
          className={`h-24 relative ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={(e) => handleMouseDown(e, 'selection')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey={selectedProperty}
                stroke="#8884d8"
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                hide
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'white', strokeWidth: 1, strokeOpacity: 0.1 }}
                active={!dragging}
              />
            </LineChart>
          </ResponsiveContainer>

          <div
            className="absolute bottom-0 top-0 bg-white/10 pointer-events-none rounded-lg"
            style={{
              left: `${range.start}px`,
              width: `${range.end - range.start}px`
            }}
          />
        </div>

        <div
          ref={setContainerRef}
          className="relative h-1.5 bg-gray-800/50 mt-2 rounded-full"
          onMouseDown={(e) => handleMouseDown(e, 'selection')}
        >
          <div
            className="absolute h-full backdrop-blur-sm"
            style={{
              left: `${range.start}px`,
              width: `${range.end - range.start}px`
            }}
          />

          <div
            className={`absolute h-10 ${dragging === 'selection' ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
              left: `${range.start}px`,
              width: `${range.end - range.start}px`,
              bottom: '0px',
              top: '-32px',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'selection')}
          >
            <div className="absolute bottom-0 left-0 right-0 bottom-[-5px] h-4 flex items-center justify-center">
              <div className="w-full h-1.5 bg-white/5" />
            </div>
          </div>

          <div
            className="absolute w-4 h-4 bg-white cursor-ew-resize -translate-y-[6px] hover:scale-110 transition-transform rounded-full"
            style={{ top: '-5px', left: `${range.start}px`, transform: 'translateX(-50%)' }}
            onMouseDown={(e) => handleMouseDown(e, 'start')}
          >
            <div className="absolute inset-0 flex items-center justify-center">
            </div>
          </div>

          <div
            className="absolute w-4 h-4 bg-white cursor-ew-resize -translate-y-[6px] hover:scale-110 transition-transform rounded-full"
            style={{ top: '-5px', left: `${range.end}px`, transform: 'translateX(-50%)' }}
            onMouseDown={(e) => handleMouseDown(e, 'end')}
          >
            <div className="absolute inset-0 flex items-center justify-center">
            </div>
          </div>

          <div className="absolute -bottom-6 left-0 text-sm text-gray-400">
            {format(getDateFromPosition(range.start), 'MMM d, yyyy')}
          </div>
          <div className="absolute -bottom-6 right-0 text-sm text-gray-400">
            {format(getDateFromPosition(range.end), 'MMM d, yyyy')}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-8">
        <div className="flex items-center gap-4">
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="bg-gray-800 text-white px-3 py-1.5 border border-gray-700 text-sm min-w-[200px] rounded-lg"
          >
            {CHART_PROPERTIES.map(prop => (
              <option key={prop.value} value={prop.value}>
                {prop.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 transition-colors rounded-lg flex items-center gap-2 text-sm
              ${showFilters ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/80'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 hover:bg-white/10 transition-colors rounded-lg"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white/80" />
            ) : (
              <Play className="w-5 h-5 text-white/80" />
            )}
          </button>
          <button
            onClick={handleReset}
            className="p-2 hover:bg-white/10 transition-colors rounded-lg"
          >
            <RotateCcw className="w-5 h-5 text-white/80" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="pt-4 border-t border-white/10 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {FILTER_OPTIONS.map(filter => (
              <div key={filter.id} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/80">{filter.label}</span>
                  <span className="text-gray-400">{filter.unit}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    min={filter.min}
                    max={filter.max}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white"
                    value={filters[filter.id]?.min ?? ''}
                    onChange={(e) => {
                      const newFilters = {
                        ...filters,
                        [filter.id]: {
                          ...filters[filter.id],
                          min: e.target.value ? Number(e.target.value) : undefined
                        }
                      };
                      setFilters(newFilters);
                      onFiltersChange(newFilters);
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    min={filter.min}
                    max={filter.max}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white"
                    value={filters[filter.id]?.max ?? ''}
                    onChange={(e) => {
                      const newFilters = {
                        ...filters,
                        [filter.id]: {
                          ...filters[filter.id],
                          max: e.target.value ? Number(e.target.value) : undefined
                        }
                      };
                      setFilters(newFilters);
                      onFiltersChange(newFilters);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RangeSlider;