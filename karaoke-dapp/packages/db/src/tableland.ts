import { Database } from '@tableland/sdk';

export const SONGS_TABLE = 'songs_v6_84532_131';
export const PURCHASES_TABLE = 'purchases_v1_84532_117';

export interface Song {
  id: number;
  isrc: string;
  iswc: string;
  title: string;
  artist: string;
  duration: number;
  stems: Record<string, string>;
  language: string;
  genius_id: number;
  lrclib_id: number;
  artwork_hash: {
    id: string;
    ext: string;
    sizes: Record<string, string>;
  };
}

export interface Purchase {
  id: number;
  user_address: string;
  song_id: number;
  purchased_at: string;
  country_code: string;
  transaction_hash: string;
}

export async function getSongs(db: Database): Promise<Song[]> {
  const { results } = await db.prepare(`SELECT * FROM ${SONGS_TABLE}`).all<Song>();
  return results;
}

export async function getSongById(db: Database, id: number): Promise<Song | null> {
  const { results } = await db.prepare(`SELECT * FROM ${SONGS_TABLE} WHERE id = ?`).bind(id).all<Song>();
  return results[0] || null;
}