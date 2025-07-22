import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { Observation } from './inaturalist';

const dbName = 'lifelight';
const version = 7;

type ObservationSchema = {
  description: string | null;
  id: number;
  latitude: number;
  longitude: number;
  taxonId: number | null;
  observedAt: number | null; // timestamp
  observedAtVerbatim: string | null;
  updatedAt: number;
  uri: string;
  userId: number;
  uuid: string;
}
type TaxonSchema = {
  commonName: string | null;
  id: number;
  scientificName: string;
}
type UserSchema = {
  id: number;
  login: string;
  name: string | null;
}
interface LifelightSchema extends DBSchema {
  observations: {key: string; value: ObservationSchema, indexes: {'byUpdatedAt': number}},
  taxa: {key: number; value: TaxonSchema, indexes: {byScientificName: string}},
  users: {key: number; value: UserSchema, indexes: {byLogin: string}};
}
export type LifelightDB = IDBPDatabase<LifelightSchema>;

export const getConnection = async () => openDB<LifelightSchema>(dbName, version, {
  async upgrade(db, oldVersion, _newVersion, _transaction, _event) {
    if (oldVersion < 7) {
      try { db.deleteObjectStore('taxa'); } catch (e) {}
      try { db.deleteObjectStore('users'); } catch (e) {}
      try { db.deleteObjectStore('observations'); } catch (e) {}

      const obsStore = db.createObjectStore('observations', {keyPath: 'id'});
      obsStore.createIndex('byUpdatedAt', 'updatedAt', {unique: false});

      const userStore = db.createObjectStore('users', {keyPath: 'id'});
      userStore.createIndex('byLogin', 'login', {unique: true});

      const taxonStore = db.createObjectStore('taxa', {keyPath: 'id'});
      taxonStore.createIndex('byScientificName', 'scientificName', {unique: false});
    }
  }
});

export type HydratedObservation = ObservationSchema & {taxon: TaxonSchema | undefined; user: UserSchema}
export async function allObservations(db: LifelightDB): Promise<HydratedObservation[]> {
  const observations = await db.getAll('observations')
  return await Promise.all(observations.map(async (obs) => {
    const user = await db.get('users', obs.userId);
    if (!user)
      throw `Couldn't find a user with id ${obs.userId}`;
    const hydrated: HydratedObservation = {...obs, taxon: undefined, user};
    if (obs.taxonId) {
      const taxon = await db.get('taxa', obs.taxonId);
      if (!taxon)
        throw `Couldn't find a taxon with id ${obs.taxonId}`;
      hydrated.taxon = taxon;
    }
    return hydrated;
  }));
}

export async function lastObservation(db: LifelightDB) {
  const txn = db.transaction('observations', 'readonly');
  const index = txn.store.index('byUpdatedAt');
  const cursor = index.iterate(null, 'prev');
  const result = await cursor.next();
  const obs: Observation | undefined = result.value;
  return obs;
}

export const upsertObservations = async (db: LifelightDB, observations: HydratedObservation[]) => {
  const obsTxn = db.transaction('observations', 'readwrite');
  const userTxn = db.transaction('users', 'readwrite');
  const taxonTxn = db.transaction('taxa', 'readwrite');
  const promises = [];
  for (const obs of observations) {
    const {taxon, user, ...flattened} = obs;
    promises.push(userTxn.store.put(user));
    if (taxon)
      promises.push(taxonTxn.store.put(taxon));
    promises.push(obsTxn.store.put(flattened));
  }
  promises.push(obsTxn.done);
  promises.push(userTxn.done);
  promises.push(taxonTxn.done);
  await Promise.all(promises);
}
