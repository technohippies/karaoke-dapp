import { songsTableName } from '../../../config/networks.config';

// Table name
export const SONGS_TABLE = songsTableName;

// Types
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
  genius_slug: string;
  streaming_links: {
    soundcloud?: string;
    spotify?: string;
    apple_music?: string;
    youtube?: string;
    qq_music?: string;
    netease?: string;
  };
  artwork_hash: {
    id: string;
    ext: string;
    sizes: Record<string, string>;
  };
  song_art_image_thumbnail_url?: string;
  song_art_image_url?: string;
  translations?: Record<string, string>; // { "zh": "CID", "ug": "CID" }
  words_in_top_1k?: number;
  words_per_second?: number;
}

// Tableland Service Class
export class TablelandService {
  private baseUrl = import.meta.env.VITE_DEFAULT_CHAIN_ID === '8453' 
    ? 'https://tableland.network/api/v1'
    : 'https://testnets.tableland.network/api/v1';
  
  // Using REST API (no wallet required for reads)
  async getSongs(): Promise<Song[]> {
    try {
      const statement = `SELECT * FROM ${SONGS_TABLE}`;
      const response = await fetch(`${this.baseUrl}/query?statement=${encodeURIComponent(statement)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch songs: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as Song[];
    } catch (error) {
      console.error('Error fetching songs:', error);
      return [];
    }
  }
  
  async getSongById(id: number): Promise<Song | null> {
    try {
      const statement = `SELECT * FROM ${SONGS_TABLE} WHERE id = ${id}`;
      const response = await fetch(`${this.baseUrl}/query?statement=${encodeURIComponent(statement)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch song: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching song:', error);
      return null;
    }
  }
}

// Singleton instance
export const tablelandService = new TablelandService();