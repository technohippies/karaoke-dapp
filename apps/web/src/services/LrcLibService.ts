interface LrcLibResponse {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  syncedLyrics: string | null
  plainLyrics: string | null
}

export class LrcLibService {
  private static readonly BASE_URL = 'https://lrclib.net/api'

  static async fetchLyrics(lrclibId: number): Promise<string | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/get/${lrclibId}`)
      
      if (!response.ok) {
        console.error(`Failed to fetch lyrics for ID ${lrclibId}: ${response.status}`)
        return null
      }

      const data: LrcLibResponse = await response.json()
      
      // Prefer synced lyrics, fall back to plain lyrics
      return data.syncedLyrics || data.plainLyrics || null
    } catch (error) {
      console.error(`Error fetching lyrics for ID ${lrclibId}:`, error)
      return null
    }
  }

  static async searchLyrics(artist: string, track: string, album?: string): Promise<LrcLibResponse[]> {
    try {
      const params = new URLSearchParams({
        artist_name: artist,
        track_name: track,
        ...(album && { album_name: album })
      })

      const response = await fetch(`${this.BASE_URL}/search?${params}`)
      
      if (!response.ok) {
        console.error(`Failed to search lyrics: ${response.status}`)
        return []
      }

      return await response.json()
    } catch (error) {
      console.error('Error searching lyrics:', error)
      return []
    }
  }
}