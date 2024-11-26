export interface Event {
  id: string;
  type: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, any>;
  timestamp: string;
}

export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    data: Event[];
}

export interface FilterRule {
    field: string;
    operator: 'equals' | 'contains' | 'gt' | 'lt';
    value: string | number;
}
