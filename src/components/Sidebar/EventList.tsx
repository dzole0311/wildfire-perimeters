import { format } from 'date-fns';
import { EventFeature } from '../../types/events';
import { Flame } from 'lucide-react';

interface EventListProps {
  features: EventFeature[];
  selectedId: string | null;
  onSelectFeature: (id: string) => void;
}

export default function EventList({ features, selectedId, onSelectFeature }: EventListProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {features.map((feature) => (
          <button
            key={feature.properties.id}
            onClick={() => onSelectFeature(feature.properties.id.toString())}
            className={`w-full p-4 rounded transition-colors text-left flex flex-col gap-2 backdrop-blur
              ${selectedId === feature.properties.id.toString()
                ? 'bg-white/20'
                : 'bg-black/70 hover:bg-white/10'
              }`}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="text-xs text-white/90">
                  Fire Event {feature.properties.id}
                </div>
                <div className="text-xs text-gray-400">
                  {format(new Date(feature.properties.t), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {feature.properties.isactive && (
                  <Flame className="w-4 h-4 text-orange-400/90" />
                )}
                <span className={`text-xs px-2 py-1 rounded backdrop-blur-sm
                  ${feature.properties.isactive
                    ? 'bg-orange-500/20 text-orange-200'
                    : 'bg-gray-800/50 text-gray-300'
                  }`}
                >
                  {feature.properties.farea.toFixed(1)} km²
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              Duration: {feature.properties.duration} days
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}