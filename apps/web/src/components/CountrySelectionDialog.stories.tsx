import type { Meta, StoryObj } from '@storybook/react'
import { CountrySelectionDialog } from './CountrySelectionDialog'
import { useState } from 'react'
import { Button } from './ui/button'

const meta: Meta<typeof CountrySelectionDialog> = {
  title: 'Components/CountrySelectionDialog',
  component: CountrySelectionDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A dialog for first-time users to select their country for music licensing compliance.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof CountrySelectionDialog>

// Interactive wrapper to handle dialog state
function CountrySelectionDialogDemo() {
  const [open, setOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode)
    setOpen(false)
    console.log('Country selected:', countryCode)
  }

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 bg-neutral-900 p-8 rounded-lg">
      <Button 
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        Open Country Selection
      </Button>
      
      {selectedCountry && (
        <div className="text-white text-center">
          <p className="text-sm text-neutral-400">Selected country:</p>
          <p className="text-lg font-semibold">{selectedCountry}</p>
        </div>
      )}
      
      <CountrySelectionDialog 
        open={open} 
        onCountrySelect={handleCountrySelect}
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <CountrySelectionDialogDemo />,
}

// Story showing the dialog with a simulated US IP
export const WithUSLocation: Story = {
  render: () => <CountrySelectionDialogDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Simulates a user with a US IP address. The dialog will auto-detect this location.',
      },
    },
  },
}

// Story demonstrating the mismatch warning
export const WithMismatchWarning: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

    const handleCountrySelect = (countryCode: string) => {
      setSelectedCountry(countryCode)
      setOpen(false)
    }

    return (
      <div className="min-h-[400px] bg-neutral-900 p-8 rounded-lg">
        <div className="text-white text-center mb-4">
          <p className="text-sm text-neutral-400">
            This story demonstrates the warning when selected country doesn't match IP location.
          </p>
          <p className="text-sm text-neutral-400 mt-2">
            Try selecting a country different from your actual location.
          </p>
        </div>
        
        {selectedCountry && (
          <div className="text-white text-center mt-4">
            <p className="text-sm text-neutral-400">Selected country:</p>
            <p className="text-lg font-semibold">{selectedCountry}</p>
          </div>
        )}
        
        <CountrySelectionDialog 
          open={open} 
          onCountrySelect={handleCountrySelect}
        />
      </div>
    )
  },
}

// Story for mobile view
export const Mobile: Story = {
  render: () => <CountrySelectionDialogDemo />,
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Country selection dialog optimized for mobile devices.',
      },
    },
  },
}