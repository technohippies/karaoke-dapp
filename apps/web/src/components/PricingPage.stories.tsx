import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { WagmiProvider } from '@web3auth/modal/react/wagmi'
import { Web3AuthProvider } from '@web3auth/modal/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import web3AuthContextConfig from '../config/web3auth.config'
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
          <Web3AuthProvider config={web3AuthContextConfig}>
            <WagmiProvider>
              <MemoryRouter>
                <Story />
              </MemoryRouter>
            </WagmiProvider>
          </Web3AuthProvider>
        </QueryClientProvider>
      )
    },
  ],
}

export default meta
type Story = StoryObj<typeof PricingPage>

export const Default: Story = {}