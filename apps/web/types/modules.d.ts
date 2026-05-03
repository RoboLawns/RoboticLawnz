/**
 * Shims for packages that lack published type declarations.
 */

declare module "@mapbox/mapbox-gl-draw" {
  import type mapboxgl from "mapbox-gl";

  interface MapboxDrawFeature {
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown };
    id?: string | number;
  }
  interface MapboxDrawFeatureCollection {
    type: "FeatureCollection";
    features: MapboxDrawFeature[];
  }
  interface MapboxDrawOptions {
    displayControlsDefault?: boolean;
    defaultMode?: string;
    styles?: unknown[];
  }
  class MapboxDraw implements mapboxgl.IControl {
    constructor(options?: MapboxDrawOptions);
    onAdd(map: mapboxgl.Map): HTMLElement;
    onRemove(map: mapboxgl.Map): void;
    getDefaultPosition(): mapboxgl.ControlPosition;
    add(geojson: MapboxDrawFeature | MapboxDrawFeatureCollection): void;
    delete(ids: string | string[]): void;
    deleteAll(): void;
    getAll(): MapboxDrawFeatureCollection;
    changeMode(mode: string): void;
    setFeatureProperty(featureId: string, property: string, value: unknown): void;
  }
  export default MapboxDraw;
}
