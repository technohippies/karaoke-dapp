import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useCountry } from '../hooks/useCountry'
import { CountrySelectionDialog } from './CountrySelectionDialog'

interface AppWithCountryCheckProps {
  children: React.ReactNode
}

export function AppWithCountryCheck({ children }: AppWithCountryCheckProps) {
  const { isConnected } = useAccount()
  const { hasCountry, setCountry, loading } = useCountry()
  const [showCountryDialog, setShowCountryDialog] = useState(false)

  useEffect(() => {
    // Show dialog if connected but no country set
    if (isConnected && !hasCountry && !loading) {
      setShowCountryDialog(true)
    } else {
      setShowCountryDialog(false)
    }
  }, [isConnected, hasCountry, loading])

  const handleCountrySelect = async (countryCode: string) => {
    try {
      await setCountry(countryCode)
      setShowCountryDialog(false)
    } catch (error) {
      console.error('Failed to save country:', error)
      // Don't close dialog on error, let user try again
    }
  }

  return (
    <>
      {children}
      <CountrySelectionDialog 
        open={showCountryDialog} 
        onCountrySelect={handleCountrySelect}
      />
    </>
  )
}