

export type ResultPage<T> = {
  total_results: number;
  page: number;
  per_page: number;
  results: [T];
}
export type Observation = {
  id: number;
  description: string | null;
  geojson: {coordinates: [number, number], type: 'Point'}; // lon, lat
  photos: [{url: string}],
  taxon?: {name: string; preferred_common_name: string | null};
  taxon_geoprivacy: string | null;
  time_observed_at?: string; // provided one is guaranteed by the query
  updated_at: string; // e.g. 2008-05-16T07:46:46+00:00
  uri: string;
  uuid: string;
}
