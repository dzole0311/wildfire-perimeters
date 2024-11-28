import { format } from 'date-fns';
import { EventFeature } from '../../types/events';
import { Flame, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';

interface EventListProps {
  features: EventFeature[];
  selectedId: string | null;
  onSelectFeature: (id: string) => void;
}

interface GroupedEvents {
  [key: string]: EventFeature[];
}

export default function EventList({ features, selectedId, onSelectFeature }: EventListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const groupedEvents = useMemo(() => {
    return features.reduce((acc: GroupedEvents, feature) => {
      const fireId = feature.properties.fireid.toString();
      if (!acc[fireId]) {
        acc[fireId] = [];
      }
      acc[fireId].push(feature);
      return acc;
    }, {});
  }, [features]);

  useEffect(() => {
    if (selectedId) {
      const fireId = features.find(f => f.properties.id === selectedId)?.properties.fireid.toString();
      if (fireId) {
        setExpandedGroups(prev => new Set([...prev, fireId]));

        requestAnimationFrame(() => {
          const groupElement = groupRefs.current[fireId];
          if (groupElement && listRef.current) {
            groupElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
    }
  }, [selectedId, features]);

  const toggleGroup = (fireId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(fireId)) {
        next.delete(fireId);
      } else {
        next.add(fireId);
      }
      return next;
    });
  };

  return (
    <div ref={listRef} className="space-y-2 overflow-auto max-h-full p-1">
      {Object.entries(groupedEvents).map(([fireId, events]) => {
        const isExpanded = expandedGroups.has(fireId);
        const hasActiveEvents = events.some(event => event.properties.isactive);
        const totalArea = events.reduce((sum, event) => sum + event.properties.farea, 0);
        const hasSelectedEvent = events.some(event => event.properties.id === selectedId);

        return (
          <div
            key={fireId}
            ref={el => groupRefs.current[fireId] = el}
            className={`bg-black/70 rounded-xl overflow-hidden ${hasSelectedEvent ? 'ring-1 ring-white/20' : ''}`}
          >
            <button
              onClick={() => toggleGroup(fireId)}
              className={`w-full p-3 flex items-center justify-between transition-colors rounded-xl
                ${hasSelectedEvent ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <AlertCircle className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-white/90">Fire Event {fireId}</span>
                {hasActiveEvents && (
                  <Flame className="w-4 h-4 text-orange-400/90" />
                )}
              </div>
              <span className="text-xs px-2 py-1 rounded bg-white/10 text-gray-300">
                {totalArea.toFixed(1)} km²
              </span>
            </button>

            {isExpanded && (
              <div className="pl-9 pr-3 pb-2 space-y-1">
                {events
                  .sort((a, b) => new Date(b.properties.t).getTime() - new Date(a.properties.t).getTime())
                  .map((event) => (
                    <button
                      key={event.properties.id}
                      onClick={() => onSelectFeature(event.properties.id)}
                      className={`w-full p-2 rounded-lg text-left flex flex-col gap-1 transition-colors text-sm
                        ${selectedId === event.properties.id
                          ? 'bg-white/20'
                          : 'hover:bg-white/10'
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="text-xs text-gray-400">
                            {format(new Date(event.properties.t), 'MMM d, yyyy HH:mm')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.properties.isactive && (
                            <Flame className="w-3 h-3 text-orange-400/90" />
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded
                            ${event.properties.isactive
                              ? 'bg-orange-500/20 text-orange-200'
                              : 'bg-gray-800/50 text-gray-300'
                            }`}
                          >
                            {event.properties.farea.toFixed(1)} km²
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}