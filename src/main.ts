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
import Select from 'ol/interaction/Select.js';
import { observationStyle } from './style.ts';
import { fetchAllPages, importObservation, myObservationsURL, Observation, observation2feature } from './inaturalist.ts';
import { allObservations, dbPromise, eachObservation, upsertObservations } from './db.ts';
import { ensureExpanded, handleSheet, setFeatures } from './sheet.ts';

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

const link = new Link();
const select = new Select({
  layers: [observationLayer],
  hitTolerance: 10,
  multi: true,
});
select.on('select', updatePaneFeatures);

function updatePaneFeatures () {
  const selected = select.getFeatures();
  if (selected.getLength() > 0) {
    setFeatures(selected.getArray());
    ensureExpanded();
  } else {
    const extent = map.getView().calculateExtent();
    const features = observationSource.getFeaturesInExtent(extent);
    setFeatures(features);
  }
}


const view = new View({
  projection: 'EPSG:3857',
  center,
  zoom: 9,
});
const map = new OpenLayersMap({
  interactions: defaultInteractions().extend([link, select]),
  layers: [
    new TileLayer({source: new OSM()}),
    observationLayer,
  ],
  target: 'map',
  view,
});
map.on('loadend', updatePaneFeatures);
map.on('moveend', updatePaneFeatures);

async function main() {
  handleSheet();
  let lastUpdatedAt = new Date(0);
  const features = [];
  const db = await dbPromise;
  const observations = await allObservations(db);
  for (const obs of observations) {
    features.push(observation2feature(obs));
    const updatedAt = new Date(obs.updatedAt);
    if (updatedAt > lastUpdatedAt)
      lastUpdatedAt = updatedAt;
  }
  observationSource.addFeatures(features);

  const endpoint = myObservationsURL(new Date(lastUpdatedAt));
  let fetchedCount = 0;
  for await (const iNatObservations of fetchAllPages<Observation>(endpoint)) {
    const observations = iNatObservations.map(importObservation);
    const features = observations.map(observation2feature);
    observationSource.addFeatures(features);
    await upsertObservations(db, observations);
    fetchedCount += observations.length;
  }
}

main();
