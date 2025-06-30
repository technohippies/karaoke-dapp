import { Database } from '@tableland/sdk';

// Browser-compatible constants (avoiding Node.js fs imports)
export const SONGS_TABLE = 'songs_v7_84532_132';

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

export class DatabaseService {
  private db: Database;

  constructor() {
    // Initialize read-only database for queries
    this.db = new Database();
  }

  /**
   * Fetch all songs from Tableland
   */
  async getSongs(): Promise<Song[]> {
    try {
      const { results } = await this.db
        .prepare(`SELECT * FROM ${SONGS_TABLE} ORDER BY id ASC`)
        .all<Song>();
      
      return results.map(song => ({
        ...song,
        stems: typeof song.stems === 'string' ? JSON.parse(song.stems) : song.stems,
        artwork_hash: typeof song.artwork_hash === 'string' ? JSON.parse(song.artwork_hash) : song.artwork_hash
      }));
    } catch (error) {
      console.error('Failed to fetch songs:', error);
      return [];
    }
  }

  /**
   * Fetch a specific song by ID
   */
  async getSongById(id: number): Promise<Song | null> {
    try {
      const { results } = await this.db
        .prepare(`SELECT * FROM ${SONGS_TABLE} WHERE id = ?`)
        .bind(id)
        .all<Song>();
      
      if (results.length === 0) {
        return null;
      }

      const song = results[0];
      return {
        ...song,
        stems: typeof song.stems === 'string' ? JSON.parse(song.stems) : song.stems,
        artwork_hash: typeof song.artwork_hash === 'string' ? JSON.parse(song.artwork_hash) : song.artwork_hash
      };
    } catch (error) {
      console.error(`Failed to fetch song ${id}:`, error);
      return null;
    }
  }

  /**
   * Search songs by title or artist
   */
  async searchSongs(query: string): Promise<Song[]> {
    try {
      const { results } = await this.db
        .prepare(`SELECT * FROM ${SONGS_TABLE} WHERE title LIKE ? OR artist LIKE ? ORDER BY id ASC`)
        .bind(`%${query}%`, `%${query}%`)
        .all<Song>();
      
      return results.map(song => ({
        ...song,
        stems: typeof song.stems === 'string' ? JSON.parse(song.stems) : song.stems,
        artwork_hash: typeof song.artwork_hash === 'string' ? JSON.parse(song.artwork_hash) : song.artwork_hash
      }));
    } catch (error) {
      console.error('Failed to search songs:', error);
      return [];
    }
  }

  /**
   * Get artwork URL for a song
   */
  getArtworkUrl(song: Song, size: 't' | 'f' = 't'): string {
    if (!song.artwork_hash) {
      return `https://placehold.co/300x300/purple/white?text=${encodeURIComponent(song.title.charAt(0))}`;
    }

    const hashData = song.artwork_hash;
    const extension = hashData.ext;
    
    if (size === 'f') {
      const fullSize = hashData.sizes?.f || hashData.sizes?.full || '1000x1000x1';
      return `https://images.genius.com/${hashData.id}.${fullSize}.${extension}`;
    } else {
      const thumbnailSize = hashData.sizes?.t || hashData.sizes?.thumb || '300x300x1';
      return `https://images.genius.com/${hashData.id}.${thumbnailSize}.${extension}`;
    }
  }
}