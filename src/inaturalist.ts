import Feature from "ol/Feature";
import Point from 'ol/geom/Point.js';
import { queryStringAppend } from "./queryStringAppend";

const baseURL = 'https://api.inaturalist.org/v2/observations';
const fieldspec = "(id:!t,geojson:!t,photos:(url:!t),updated_at:!t,taxon:(name:!t,preferred_common_name:!t),taxon_geoprivacy:!t,time_observed_at:!t,uri:!t)";
// const authorizationHeader: HeadersInit = apiToken ? {Authorization: `Bearer ${apiToken}`} : {};

// updated_since: anything you can pass to Date.parse
export function myObservationsURL(updated_since: Date) {
  const url = queryStringAppend(baseURL, {
    fields: fieldspec,
    user_id: 'rainhead',
    updated_since: updated_since.toISOString(),
    order_by: 'updated_at',
    order: 'desc',
    per_page: 200,
  });
  return url;
}

export function observation2feature(obs: Observation): Feature<Point> {
  return new Feature({
    id: obs.uuid,
    geometry: new Point(obs.geojson.coordinates),
    name: obs.taxon?.name,
  });
}

export async function fetchPage<T>(url: string, page: number) {
  const response = await fetch(queryStringAppend(url, {page}));
  if (!response.ok) {
    return Promise.reject(`Error fetching results: ${response.statusText}`);
  }
  const payload: ResultPage<T> = await response.json();
  return payload;
}

export async function* fetchAllPages<T>(url: string) {
  let pageNo = 1;
  while (true) {
    const page = await fetchPage<T>(url, pageNo);
    yield Promise.resolve(page.results);
    const lastPage = Math.ceil(page.total_results / page.per_page);
    if (lastPage > pageNo) {
      pageNo++;
    } else {
      break;
    }
  }
}

type ResultPage<T> = {
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
  private_geojson: {coordinates: [number, number], type: 'Point'}; // lon, lat
  taxon?: {id: number; name: string; preferred_common_name: string | null};
  taxon_geoprivacy: string | null;
  time_observed_at?: string; // provided one is guaranteed by the query
  updated_at: string; // e.g. 2008-05-16T07:46:46+00:00
  uri: string;
  uuid: string;
}
