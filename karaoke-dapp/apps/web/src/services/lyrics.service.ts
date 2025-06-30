interface LRCLIBResponse {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string;
}

export class LyricsService {
  private static instance: LyricsService | null = null;
  private baseUrl = 'https://lrclib.net/api';
  private cache = new Map<string, LRCLIBResponse>();
  
  constructor() {
    if (LyricsService.instance) {
      return LyricsService.instance;
    }
    LyricsService.instance = this;
  }

  /**
   * Fetch lyrics by LRCLIB ID
   */
  async getLyricsById(lrclibId: number): Promise<LRCLIBResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/get/${lrclibId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Lyrics not found for ID: ${lrclibId}`);
          return null;
        }
        throw new Error(`Failed to fetch lyrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching lyrics by ID:', error);
      return null;
    }
  }

  /**
   * Search for lyrics using track information
   */
  async searchLyrics(
    trackName: string,
    artistName: string,
    albumName: string,
    duration: number
  ): Promise<LRCLIBResponse | null> {
    try {
      const params = new URLSearchParams({
        track_name: trackName,
        artist_name: artistName,
        album_name: albumName,
        duration: duration.toString(),
      });

      const response = await fetch(`${this.baseUrl}/get?${params}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Lyrics not found for: ${trackName} by ${artistName}`);
          return null;
        }
        throw new Error(`Failed to search lyrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching lyrics:', error);
      return null;
    }
  }

  /**
   * Get lyrics for a song - tries ID first, then falls back to search
   */
  async getLyricsForSong(
    lrclibId: number | null,
    trackName: string,
    artistName: string,
    albumName: string = '',
    duration: number
  ): Promise<LRCLIBResponse | null> {
    // Create cache key
    const cacheKey = lrclibId ? `id:${lrclibId}` : `search:${trackName}:${artistName}:${duration}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log('🎵 Returning cached lyrics for:', cacheKey);
      return this.cache.get(cacheKey)!;
    }
    
    let result: LRCLIBResponse | null = null;
    
    // Try fetching by ID first if available
    if (lrclibId) {
      result = await this.getLyricsById(lrclibId);
      if (result) {
        this.cache.set(cacheKey, result);
        return result;
      }
    }

    // Fall back to search
    result = await this.searchLyrics(trackName, artistName, albumName, duration);
    if (result) {
      this.cache.set(cacheKey, result);
    }
    return result;
  }
  
  /**
   * Fetch lyrics from URL (for when we already have the URL from navigation state)
   */
  async getLyricsFromUrl(url: string): Promise<LRCLIBResponse | null> {
    // Check cache first
    const cacheKey = `url:${url}`;
    if (this.cache.has(cacheKey)) {
      console.log('🎵 Returning cached lyrics from URL');
      return this.cache.get(cacheKey)!;
    }
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Lyrics not found at URL: ${url}`);
          return null;
        }
        throw new Error(`Failed to fetch lyrics: ${response.statusText}`);
      }

      const result = await response.json();
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching lyrics from URL:', error);
      return null;
    }
  }
}