import './style.css'
import 'ol/ol.css';
import { initPWA } from './pwa.ts'
import OpenLayersMap from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import Link from 'ol/interaction/Link.js';
import {defaults as defaultInteractions} from 'ol/interaction/defaults.js';
import { useGeographic } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Collection } from 'ol';
import Point from 'ol/geom/Point.js';
import Feature from 'ol/Feature.js';
import { queryStringAppend } from './queryStringAppend.ts';
import { observationStyle } from './style.ts';

initPWA(document.body);

useGeographic();
const center = [-122.654487, 47.982525];

const observationSource = new VectorSource({
  features: new Collection<Feature<Point>>(),
});

const observationLayer = new VectorLayer({
  source: observationSource,
  style: observationStyle,
});

const view = new View({
  projection: 'EPSG:3857',
  center,
  zoom: 9,
});
new OpenLayersMap({
  interactions: defaultInteractions().extend([new Link()]),
  layers: [
    new TileLayer({source: new OSM()}),
    observationLayer,
  ],
  target: 'map',
  view,
});
// map.addEventListener('moveend', () => {
//   const extent = view.calculateExtent();
//   loadObservationsIn(extent);
// });

const baseURL = 'https://api.inaturalist.org/v2/observations';
const fieldspec = "(geojson:!t,photos:(url:!t),taxon:(name:!t,preferred_common_name:!t),taxon_geoprivacy:!t,time_observed_at:!t,uri:!t)";

async function fetchPage<T>(url: string, page: number) {
  console.log(`fetching page ${page}`);
  const response = await fetch(queryStringAppend(url, {page}));
  if (!response.ok) {
    return Promise.reject(`Error fetching results: ${response.statusText}`);
  }
  const payload: ResultPage<T> = await response.json();
  return payload;
}

async function* fetchAllPages<T>(url: string) {
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

function myObservationsURL() {
  const url = queryStringAppend(baseURL, {
    fields: fieldspec,
    user_id: 'rainhead',
    order_by: 'updated_at',
    order: 'desc',
    per_page: 200,
  });
  return url;
}

async function main() {
  for await (const observations of fetchAllPages<Observation>(myObservationsURL())) {
    const features = observations.map(obs => {
      return new Feature({
        id: obs.uuid,
        geometry: new Point(obs.geojson.coordinates),
        name: obs.taxon?.name,
      })
    });
    observationSource.addFeatures(features);    
  }
}

type ResultPage<T> = {
  total_results: number;
  page: number;
  per_page: number;
  results: [T];
}
type Observation = {
  id: number;
  description: string | null;
  geojson: {coordinates: [number, number], type: 'Point'}; // lon, lat
  photos: [{url: string}],
  taxon?: {name: string; preferred_common_name: string | null};
  taxon_geoprivacy: string | null;
  time_observed_at?: string; // provided one is guaranteed by the query
  uri: string;
  uuid: string;
}

main();
