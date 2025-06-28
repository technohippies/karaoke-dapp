import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface KaraokeDB extends DBSchema {
  srs: {
    key: string;
    value: {
      id: string;
      songId: number;
      lineId: number;
      card: any; // FSRS card data
      lastReviewed: Date;
      nextReview: Date;
    };
  };
  sessions: {
    key: string;
    value: {
      id: string;
      songId: number;
      startedAt: Date;
      completedAt?: Date;
      linesCompleted: number[];
      score: number;
    };
  };
}

let db: IDBPDatabase<KaraokeDB>;

export async function initDB() {
  db = await openDB<KaraokeDB>('karaoke-dapp', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('srs')) {
        db.createObjectStore('srs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
    },
  });
  return db;
}

export async function getDB() {
  if (!db) {
    await initDB();
  }
  return db;
}