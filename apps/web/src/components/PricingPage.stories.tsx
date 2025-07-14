import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { PricingPage } from './PricingPage'

const meta: Meta<typeof PricingPage> = {
  title: 'Pages/PricingPage',
  component: PricingPage,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    isFirstPurchase: {
      control: 'boolean',
    },
    hasWallet: {
      control: 'boolean',
    },
    selectedType: {
      control: { type: 'select' },
      options: [null, 'combo', 'voice', 'song'],
    },
    isLoading: {
      control: 'boolean',
    },
    comboPrice: {
      control: 'number',
    },
    voiceCreditsPrice: {
      control: 'number',
    },
    songCreditsPrice: {
      control: 'number',
    },
  },
}

export default meta
type Story = StoryObj<typeof PricingPage>

// First-time user sees single starter pack
export const FirstTimeUser: Story = {
  args: {
    isFirstPurchase: true,
    hasWallet: true,
    selectedType: null,
    isLoading: false,
    error: null,
    comboPrice: 3.0,
    voiceCreditsPrice: 1.0,
    songCreditsPrice: 2.0,
    onSelectCombo: () => alert('Starter pack selected!'),
    onPurchase: () => alert('Purchase starter pack!'),
  },
}

// Returning user sees individual credit options
export const ReturningUser: Story = {
  args: {
    isFirstPurchase: false,
    hasWallet: true,
    selectedType: null,
    isLoading: false,
    error: null,
    comboPrice: 3.0,
    voiceCreditsPrice: 1.0,
    songCreditsPrice: 2.0,
    onSelectVoiceCredits: () => alert('Voice credits selected!'),
    onSelectSongCredits: () => alert('Song credits selected!'),
    onPurchase: () => alert('Purchase selected!'),
  },
}

export const Interactive: Story = {
  render: () => {
    const [hasWallet, setHasWallet] = React.useState(false)
    const [selectedType, setSelectedType] = React.useState<'combo' | 'voice' | 'song' | null>(null)
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [isFirstPurchase, setIsFirstPurchase] = React.useState(true)

    const handleConnectWallet = () => {
      setHasWallet(true)
      alert('Wallet connected!')
    }

    const handleSelectCombo = () => {
      setSelectedType('combo')
      setError(null)
    }

    const handleSelectVoiceCredits = () => {
      setSelectedType('voice')
      setError(null)
    }

    const handleSelectSongCredits = () => {
      setSelectedType('song')
      setError(null)
    }

    const handlePurchase = () => {
      if (!selectedType && !isFirstPurchase) return
      
      setIsLoading(true)
      
      // Simulate transaction
      setTimeout(() => {
        setIsLoading(false)
        if (Math.random() > 0.7) {
          setError('Transaction failed. Please try again.')
        } else {
          const purchaseType = isFirstPurchase ? 'starter pack' : selectedType + ' credits'
          alert(`Successfully purchased ${purchaseType}!`)
          if (isFirstPurchase) {
            setIsFirstPurchase(false)
          }
          setSelectedType(null)
        }
      }, 2000)
    }

    const handleClearError = () => {
      setError(null)
    }

    // Toggle between first-time and returning user for demo
    const handleToggleUserType = () => {
      setIsFirstPurchase(!isFirstPurchase)
      setSelectedType(null)
      setError(null)
    }

    return (
      <div>
        <div className="bg-neutral-800 p-4 text-center">
          <button 
            onClick={handleToggleUserType}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Toggle: {isFirstPurchase ? 'First-time User' : 'Returning User'}
          </button>
        </div>
        <PricingPage
          isFirstPurchase={isFirstPurchase}
          hasWallet={hasWallet}
          selectedType={selectedType}
          isLoading={isLoading}
          error={error}
          comboPrice={3.0}
          voiceCreditsPrice={1.0}
          songCreditsPrice={1.0}
          onConnectWallet={handleConnectWallet}
          onSelectCombo={handleSelectCombo}
          onSelectVoiceCredits={handleSelectVoiceCredits}
          onSelectSongCredits={handleSelectSongCredits}
          onPurchase={handlePurchase}
          onClearError={handleClearError}
        />
      </div>
    )
  },
}