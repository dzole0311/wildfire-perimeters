import EventList from './EventList';
import EventDetails from './EventDetails';
import { EventFeature } from '../../types/events';
import { useState, useEffect } from 'react';

interface SidebarProps {
  features: EventFeature[];
  selectedId: string | null;
  onSelectFeature: (id: string) => void;
  onResetView: () => void;
  onBack: () => void;
}

export default function Sidebar({ features, selectedId, onSelectFeature, onResetView, onBack }: SidebarProps) {
  const selectedFeature = features.find(f => f.properties.id.toString() === selectedId);
  const activeCount = features.filter(f => f.properties.isactive).length;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (selectedId && selectedFeature) {
      setShowDetails(true);
    }
  }, [selectedId, selectedFeature]);

  const handleBack = () => {
    setShowDetails(false);
    onBack();
  };

  return (
    <aside className="absolute top-4 right-4 w-80 bg-black/70 backdrop-blur-sm overflow-hidden h-[calc(100vh-9.5rem)] flex flex-col border border-white/10 rounded-2xl">

      <div className="p-3 bg-white/5 border-b border-white/10">
        <div className="flex space-x-3 text-xs">
          <div className="flex-1 p-2 rounded-xl bg-black/30">
            <div className="text-lg font-bold text-white/90">{features.length}</div>
            <div className="text-gray-400">Total</div>
          </div>
          <div className="flex-1 p-2 rounded-xl bg-black/30">
            <div className="text-lg font-bold text-green-400/90">{activeCount}</div>
            <div className="text-gray-400">Active</div>
          </div>
          <div className="flex-1 p-2 rounded-xl bg-black/30">
            <div className="text-lg font-bold text-orange-400/90">{features.length - activeCount}</div>
            <div className="text-gray-400">Inactive</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {showDetails && selectedFeature ? (
          <EventDetails feature={selectedFeature} onBack={handleBack} />
        ) : (
          <div className="p-3">
            <EventList
              features={features}
              selectedId={selectedId}
              onSelectFeature={(id) => {
                onSelectFeature(id);
                setShowDetails(true);
              }}
              expandedGroups={expandedGroups}
              setExpandedGroups={setExpandedGroups}
            />
          </div>
        )}
      </div>
    </aside>
  );
}