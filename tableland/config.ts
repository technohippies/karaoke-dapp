/**
 * Tableland Configuration
 * Centralized configuration for all Tableland operations
 */

export const TABLELAND_CONFIG = {
  // Network configuration
  networks: {
    'optimism-sepolia': {
      chainId: 11155420,
      rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
      tablelandHost: 'https://testnets.tableland.network'
    },
    'base-mainnet': {
      chainId: 8453,
      rpcUrl: process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org',
      tablelandHost: 'https://tableland.network'
    }
  },
  
  // Table schemas with versioning
  schemas: {
    songs: {
      version: 'v4',
      prefix: 'karaoke_songs',
      schema: `(
        id INTEGER PRIMARY KEY,
        isrc TEXT NOT NULL,
        iswc TEXT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        duration INTEGER,
        stems TEXT,
        language TEXT DEFAULT 'en',
        genius_id INTEGER,
        lrclib_id INTEGER,
        genius_slug TEXT,
        streaming_links TEXT,
        artwork_hash TEXT,
        translations TEXT,
        updated_at INTEGER
      )`
    },
    user_history: {
      version: 'v1',
      prefix: 'karaoke_history',
      schema: `(
        id INTEGER PRIMARY KEY,
        user_address TEXT NOT NULL,
        song_id INTEGER NOT NULL,
        session_hash TEXT UNIQUE NOT NULL,
        grade INTEGER,
        credits_used INTEGER,
        started_at INTEGER NOT NULL,
        completed_at INTEGER
      )`
    }
  }
}

export type TableName = keyof typeof TABLELAND_CONFIG.schemas
export type NetworkName = keyof typeof TABLELAND_CONFIG.networks