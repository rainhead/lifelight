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
import { Observation, ResultPage } from './inaturalist.ts';
import { eachObservation, upsertObservations } from './db.ts';

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
const fieldspec = "(id:!t,geojson:!t,photos:(url:!t),updated_at:!t,taxon:(name:!t,preferred_common_name:!t),taxon_geoprivacy:!t,time_observed_at:!t,uri:!t)";

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

// updated_since: anything you can pass to Date.parse
function myObservationsURL(updated_since: Date) {
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

function observation2feature(obs: Observation): Feature<Point> {
  return new Feature({
    id: obs.uuid,
    geometry: new Point(obs.geojson.coordinates),
    name: obs.taxon?.name,
  });
}

async function main() {
  let lastUpdatedAt = Date.parse('1970-01-01T00:00:00Z');
  const features = [];
  for await (const observation of eachObservation()) {
    features.push(observation2feature(observation));
    const updatedAt = Date.parse(observation.updated_at);
    if (updatedAt > lastUpdatedAt)
      lastUpdatedAt = updatedAt;
  }
  observationSource.addFeatures(features);
  const endpoint = myObservationsURL(new Date(lastUpdatedAt));
  for await (const observations of fetchAllPages<Observation>(endpoint)) {
    const features = observations.map(observation2feature);
    observationSource.addFeatures(features);
    await upsertObservations(observations);
  }
}

main();
