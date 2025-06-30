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
  private baseUrl = 'https://lrclib.net/api';

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
    // Try fetching by ID first if available
    if (lrclibId) {
      const lyricsById = await this.getLyricsById(lrclibId);
      if (lyricsById) {
        return lyricsById;
      }
    }

    // Fall back to search
    return await this.searchLyrics(trackName, artistName, albumName, duration);
  }
}