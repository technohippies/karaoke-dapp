import React, { createContext, useContext } from 'react'
import { useKaraokeMachine } from '../hooks/useKaraokeMachine'

type KaraokeMachineContextType = ReturnType<typeof useKaraokeMachine>

const KaraokeMachineContext = createContext<KaraokeMachineContextType | null>(null)

export function KaraokeMachineProvider({ children }: { children: React.ReactNode }) {
  const machineValue = useKaraokeMachine()
  
  return (
    <KaraokeMachineContext.Provider value={machineValue}>
      {children}
    </KaraokeMachineContext.Provider>
  )
}

export function useKaraokeMachineContext() {
  const context = useContext(KaraokeMachineContext)
  if (!context) {
    throw new Error('useKaraokeMachineContext must be used within KaraokeMachineProvider')
  }
  return context
}