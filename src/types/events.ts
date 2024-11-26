export interface EventFeature {
    geometry: {
      type: string;
      coordinates: number[][];
    };
    properties: {
      id: string | number;
      startTime: number;
      endTime: number;
      duration: number;
      farea: number;
      flinelen: number;
      fperim: number;
      meanfrp: number;
      n_newpixels: number;
      n_pixels: number;
      pixden: number;
      region: string;
      isactive: boolean;
      [key: string]: any;
    };
  }

export interface EventDataState {
    features: EventFeature[];
    loading: boolean;
    error: string | null;
    selectedId: string | null;
    timeRange: [Date, Date];
}