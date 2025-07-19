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
import { observationStyle } from './style.ts';
import { fetchAllPages, myObservationsURL, Observation, observation2feature } from './inaturalist.ts';
import { eachObservation, upsertObservations } from './db.ts';

initPWA(document.body);

// const apiToken = localStorage.getItem('iNaturalistAPIToken');

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
  let fetchedCount = 0;
  for await (const observations of fetchAllPages<Observation>(endpoint)) {
    const features = observations.map(observation2feature);
    observationSource.addFeatures(features);
    await upsertObservations(observations);
    fetchedCount += observations.length;
  }
}

main();
