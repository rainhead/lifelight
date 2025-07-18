import { openDB } from 'idb';
import { Observation } from './inaturalist';

// observations: id -> obs
// layers: id -> tag, name, tag is unique
// layer_observations: observations.id, layers.id

const dbName = 'lifelight';
const version = 1;
const dbPromise = openDB(dbName, version, {
  upgrade(db) {
    const store = db.createObjectStore('observations', {
      keyPath: 'id',
    });
    store.createIndex('updated_at', 'updated_at', {unique: false});
  }
});

export const upsertObservations = async (observations: {id: number, updated_at: string}[]) => {
  const db = await dbPromise;
  const txn = db.transaction('observations', 'readwrite');
  await Promise.all([
    ...observations.map(obs => txn.store.put(obs)),
    txn.done,
  ]);
}

export async function* eachObservation() {
  const db = await dbPromise;
  const txn = db.transaction('observations', 'readonly');
  for await (const cursor of txn.store) {
    const observation: Observation = cursor.value;
    yield observation;
  }
}
