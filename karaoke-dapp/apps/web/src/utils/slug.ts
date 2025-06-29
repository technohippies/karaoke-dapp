export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
}

export function createSongSlug(artist: string, title: string): string {
  const artistSlug = createSlug(artist)
  const titleSlug = createSlug(title)
  return `${artistSlug}-${titleSlug}`
}

export function parseSongSlug(slug: string): { artist: string; title: string } | null {
  // This is a basic parser - in production you'd want to handle edge cases
  const parts = slug.split('-')
  if (parts.length < 2) return null
  
  // Find where artist ends and title begins (this is approximate)
  // In production, you'd want to store the slug in the database
  const midpoint = Math.floor(parts.length / 2)
  const artist = parts.slice(0, midpoint).join(' ')
  const title = parts.slice(midpoint).join(' ')
  
  return { artist, title }
}

// Alternative: Use IDs with slugs for better reliability
export function createSongSlugWithId(id: number, artist: string, title: string): string {
  const slug = createSongSlug(artist, title)
  return `${id}-${slug}`
}

export function parseSongSlugWithId(slug: string): { id: number; slug: string } | null {
  const match = slug.match(/^(\d+)-(.+)$/)
  if (!match) return null
  
  return {
    id: parseInt(match[1]),
    slug: match[2]
  }
}