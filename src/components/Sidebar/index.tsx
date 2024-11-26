import EventList from './EventList';
import EventDetails from './EventDetails';
import { EventFeature } from '../../types/events';

interface SidebarProps {
  features: EventFeature[];
  selectedId: string | null;
  onSelectFeature: (id: string) => void;
  onResetView: () => void;
}

export default function Sidebar({ features, selectedId, onSelectFeature, onResetView }: SidebarProps) {
  const selectedFeature = features.find(f => f.properties.id.toString() === selectedId);
  const activeCount = features.filter(f => f.properties.isactive).length;

  return (
    <aside className="absolute top-4 right-4 w-80 bg-black/70 backdrop-blur overflow-hidden h-[calc(100vh-8rem)] flex flex-col border border-white/10">

      <div className="p-3 bg-white/5">
        <div className="flex space-x-3 text-xs">
          <div className="flex-1">
            <div className="text-lg font-bold text-white/90">{features.length}</div>
            <div className="text-gray-400">Total</div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-green-400/90">{activeCount}</div>
            <div className="text-gray-400">Active</div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-orange-400/90">{features.length - activeCount}</div>
            <div className="text-gray-400">Inactive</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {selectedFeature ? (
          <EventDetails feature={selectedFeature} onBack={onResetView} />
        ) : (
          <div className="p-3">
            <EventList
              features={features}
              selectedId={selectedId}
              onSelectFeature={onSelectFeature}
            />
          </div>
        )}
      </div>
    </aside>
  );
}