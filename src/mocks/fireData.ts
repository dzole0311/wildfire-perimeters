import type { EventFeature } from '../types/events';

function createPolygon(centerLat: number, centerLng: number, size: number = 0.01): number[][] {
  return [
    [centerLng - size, centerLat - size],
    [centerLng + size, centerLat - size],
    [centerLng + size, centerLat + size],
    [centerLng - size, centerLat + size],
    [centerLng - size, centerLat - size]
  ];
}

function createFireProgression(
  fireid: string,
  startLat: number,
  startLng: number,
  numSteps: number = 8
): EventFeature[] {
  const features: EventFeature[] = [];
  const baseDate = new Date('2024-11-01T00:00:00');
  let currentSize = 0.01;
  let currentLat = startLat;
  let currentLng = startLng;

  for (let i = 0; i < numSteps; i++) {
    currentSize *= 1.5;
    currentLat += (Math.random() - 0.5) * 0.001;
    currentLng += (Math.random() - 0.5) * 0.001;

    const timestamp = new Date(baseDate);
    timestamp.setHours(timestamp.getHours() + (i * 12));

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [createPolygon(currentLat, currentLng, currentSize)]
      },
      properties: {
        id: `${fireid}_${i}`,
        fireid,
        t: timestamp.toISOString(),
        duration: i * 12,
        farea: Math.PI * currentSize * currentSize * 100000,
        flinelen: Math.PI * currentSize * 4 * 100000,
        fperim: Math.PI * currentSize * 4 * 100000,
        meanfrp: 50 + Math.random() * 50,
        region: 'MockRegion',
        pixden: 48.27732937405089,
        n_newpixels: Math.floor(Math.random() * 10) + 1,
        n_pixels: (i + 1) * 10,
        isactive: i === numSteps - 1
      }
    });
  }

  return features;
}

export const mockFireData: EventFeature[] = [
  ...createFireProgression('F1', 39.7596, -121.6219),
  ...createFireProgression('F2', 39.8596, -121.5219, 6),
  ...createFireProgression('F3', 39.6596, -121.7219, 10)
];

export const mockApiResponse = {
  type: "FeatureCollection",
  features: mockFireData,
  numberMatched: mockFireData.length,
  numberReturned: mockFireData.length
};