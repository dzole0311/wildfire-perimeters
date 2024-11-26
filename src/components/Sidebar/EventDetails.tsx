import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { EventFeature } from '../../types/events';
import { ArrowLeft } from 'lucide-react';

interface EventDetailsProps {
  feature: EventFeature;
  onBack: () => void;
}

export default function EventDetails({ feature, onBack }: EventDetailsProps) {
  const { properties: p } = feature;

  const chartData = [
    { name: 'Day 1', value: p.meanfrp },
    { name: 'Day 2', value: p.meanfrp * 0.9 },
    { name: 'Day 3', value: p.meanfrp * 0.8 },
    { name: 'Day 4', value: p.meanfrp * 0.7 },
  ];

  return (
    <div className="p-3 space-y-3">
      <button
        onClick={onBack}
        className="text-xs text-blue-400/90 hover:text-blue-300 flex items-center gap-1"
      >
        <ArrowLeft className="w-3 h-3" /> Back
      </button>

      <div className="space-y-3">

        <div className="bg-white/5 p-3 rounded">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-gray-400">Area</div>
              <div className="text-sm text-white/90">{p.farea.toFixed(2)} km²</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400">Duration</div>
              <div className="text-sm text-white/90">{p.duration} days</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400">Mean FRP</div>
              <div className="text-sm text-white/90">{p.meanfrp.toFixed(2)} MW</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400">Perimeter</div>
              <div className="text-sm text-white/90">{p.fperim.toFixed(2)} km</div>
            </div>
          </div>
        </div>


        <div className="bg-white/5 p-3 rounded">
          <div className="text-[11px] text-gray-400 mb-2">Fire Radiative Power Trend</div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  fontSize={10}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={10}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '11px',
                    color: 'white'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={{ fill: '#ef4444', r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 p-3 rounded">
          <div className="text-[11px] text-gray-400 mb-2">Additional Information</div>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <div className="text-gray-400">Region</div>
            <div className="text-white/90">{p.region}</div>
            <div className="text-gray-400">Pixel Density</div>
            <div className="text-white/90">{p.pixden.toFixed(2)} px/km²</div>
            <div className="text-gray-400">New Pixels</div>
            <div className="text-white/90">{p.n_newpixels}</div>
            <div className="text-gray-400">Total Pixels</div>
            <div className="text-white/90">{p.n_pixels}</div>
            <div className="text-gray-400">Status</div>
            <div>
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                p.isactive
                  ? 'bg-green-500/20 text-green-200'
                  : 'bg-gray-500/20 text-gray-300'
              }`}>
                {p.isactive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}