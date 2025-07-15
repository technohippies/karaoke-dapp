import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '../wagmiConfig'
import { PricingPage } from '../pages/PricingPage'

const meta: Meta<typeof PricingPage> = {
  title: 'Pages/PricingPage',
  component: PricingPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#171717' },
      ],
    },
  },
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      })
      
      return (
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <MemoryRouter>
              <Story />
            </MemoryRouter>
          </WagmiProvider>
        </QueryClientProvider>
      )
    },
  ],
}

export default meta
type Story = StoryObj<typeof PricingPage>

export const Default: Story = {}