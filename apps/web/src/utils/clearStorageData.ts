/**
 * Utility to clear old storage data when migrating to new SRS schema
 */

export async function clearOldStorageData() {
  console.log('🧹 Clearing old storage data...')
  
  // Clear old localStorage keys
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (
      key.startsWith('karaoke_tables_') || 
      key.startsWith('karaoke_user_tables_') ||
      key.includes('tableland')
    )) {
      keysToRemove.push(key)
    }
  }
  
  keysToRemove.forEach(key => {
    console.log(`  Removing localStorage key: ${key}`)
    localStorage.removeItem(key)
  })
  
  // Clear IndexedDB if you want to clear cached content too
  if (window.indexedDB) {
    try {
      // Clear content cache
      await window.indexedDB.deleteDatabase('KaraokeContentCache')
      console.log('  ✅ Cleared IndexedDB content cache')
    } catch (error) {
      console.error('  ❌ Failed to clear IndexedDB:', error)
    }
  }
  
  console.log('✅ Storage cleanup complete')
}

/**
 * Get storage usage info
 */
export async function getStorageInfo() {
  const info: any = {
    localStorage: {},
    indexedDB: {}
  }
  
  // Check localStorage
  let totalSize = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key)
      const size = new Blob([value || '']).size
      info.localStorage[key] = `${(size / 1024).toFixed(2)} KB`
      totalSize += size
    }
  }
  info.localStorage._total = `${(totalSize / 1024).toFixed(2)} KB`
  
  // Check IndexedDB databases
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    info.indexedDB.usage = `${((estimate.usage || 0) / 1024 / 1024).toFixed(2)} MB`
    info.indexedDB.quota = `${((estimate.quota || 0) / 1024 / 1024).toFixed(2)} MB`
  }
  
  return info
}