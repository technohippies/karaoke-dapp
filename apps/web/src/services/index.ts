// Database Services
export { contentCacheService } from './database/cache/ContentCacheService'
export { tablelandService, type Song } from './database/tableland/TablelandReadService'
export { tablelandWriteService } from './database/tableland/TablelandWriteService'

// IDB Services (Local-first SRS)
export { idbWriteService } from './database/idb/IDBWriteService'
export { idbReadService } from './database/idb/IDBReadService'
export { idbSyncService } from './database/idb/IDBSyncService'

// Storage Services
export type { IStorageService, StorageFile } from './storage/types/StorageService'
// Note: PinataStorageService is available but not instantiated by default
// Use createPinataStorageService from './storage/ipfs/PinataStorageService' if needed

// Integration Services
export { LrcLibService } from './integrations/lrclib/LrcLibService'
export { 
  ContentEncryptionService,
  createContentEncryptionService, 
  type IContentEncryptionService 
} from './integrations/lit/ContentEncryptionService'
export { karaokeScoringService } from './integrations/lit/KaraokeScoringService'

// Core Services
export { 
  SongContentManager,
  createSongContentManager,
  createSongContentSystem 
} from './core/content/SongContentManager'
export { postUnlockContentLoader } from './core/content/PostUnlockContentLoader'
export { midiPlayerService } from './core/midi/MidiPlayerService'

// Export SRS types for convenience
export * from '../types/srs.types'