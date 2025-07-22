import Feature from "ol/Feature";
import Point from 'ol/geom/Point.js';
import { queryStringAppend } from "./queryStringAppend";
import { HydratedObservation } from "./db";

const baseURL = 'https://api.inaturalist.org/v2/observations';
const fieldspec = "(id:!t,geojson:!t,photos:(url:!t),updated_at:!t,taxon:(name:!t,preferred_common_name:!t),taxon_geoprivacy:!t,time_observed_at:!t,uri:!t,user:(id:!t,login:!t,name:!t))";
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

export function observation2feature(obs: HydratedObservation): Feature<Point> {
  const feature = new Feature(new Point([obs.longitude, obs.latitude]));
  feature.setId(obs.uuid);
  feature.setProperties(obs);
  return feature;
}

export function importObservation(obs: Observation): HydratedObservation {
    const [longitude, latitude] = (obs.private_geojson ?? obs.geojson).coordinates;
    const taxon = obs.taxon ? {id: obs.taxon.id, scientificName: obs.taxon.name, commonName: obs.taxon.preferred_common_name} : undefined;
    return {
      description: obs.description,
      id: obs.id,
      latitude,
      longitude,
      observedAt: obs.time_observed_at ? Date.parse(obs.time_observed_at) : null,
      observedAtVerbatim: obs.time_observed_at || null,
      taxon,
      taxonId: taxon?.id || null,
      updatedAt: Date.parse(obs.updated_at),
      uri: obs.uri,
      user: obs.user,
      userId: obs.user.id,
      uuid: obs.uuid,
    };
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
export type User = {
  id: number;
  login: string;
  name: string | null;
}

export type Taxon = {
  id: number;
  name: string;
  preferred_common_name: string | null;
}
export type Observation = {
  id: number;
  description: string | null;
  geojson: {coordinates: [number, number], type: 'Point'}; // lon, lat
  observed_on: string | null;
  photos: [{url: string}],
  private_geojson?: {coordinates: [number, number], type: 'Point'}; // lon, lat
  taxon?: Taxon;
  taxon_geoprivacy: string | null;
  time_observed_at?: string; // provided one is guaranteed by the query
  updated_at: string; // e.g. 2008-05-16T07:46:46+00:00
  uri: string;
  user: User;
  uuid: string;
}
