import { useState, useEffect, useCallback } from 'react'
import { getGlobalDB } from '../services/database/idb/globalDB'
import type { CountrySettings } from '../types/idb.types'

interface UseCountryReturn {
  country: string | null
  hasCountry: boolean
  setCountry: (countryCode: string) => Promise<void>
  loading: boolean
  error: Error | null
}

export function useCountry(): UseCountryReturn {
  const [country, setCountryState] = useState<string | null>(null)
  const [hasCountry, setHasCountry] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load country from IDB on mount
  useEffect(() => {
    const loadCountry = async () => {
      try {
        setLoading(true)
        const db = await getGlobalDB()
        
        const tx = db.transaction('user_settings', 'readonly')
        const store = tx.objectStore('user_settings')
        const countryData = await store.get('country') as CountrySettings | undefined
        
        if (countryData?.value) {
          setCountryState(countryData.value)
          setHasCountry(true)
          console.log('🌍 Loaded country from IDB:', countryData.value)
        } else {
          console.log('🌍 No country found in IDB')
        }
      } catch (err) {
        console.error('Failed to load country:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    loadCountry()
  }, [])

  // Save country to IDB
  const setCountry = useCallback(async (countryCode: string) => {
    try {
      const db = await getGlobalDB()
      const now = Date.now()
      
      const countryData: CountrySettings = {
        key: 'country',
        value: countryCode,
        confirmedAt: now,
        updatedAt: now
      }
      
      const tx = db.transaction('user_settings', 'readwrite')
      const store = tx.objectStore('user_settings')
      await store.put(countryData)
      await tx.done
      
      setCountryState(countryCode)
      setHasCountry(true)
      console.log('🌍 Saved country to IDB:', countryCode)
    } catch (err) {
      console.error('Failed to save country:', err)
      setError(err as Error)
      throw err
    }
  }, [])

  return {
    country,
    hasCountry,
    setCountry,
    loading,
    error
  }
}