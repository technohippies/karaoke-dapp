import { ReactNode, useMemo } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, Locale, darkTheme } from '@rainbow-me/rainbowkit'
import { useTranslation } from 'react-i18next'
import { farcasterWagmiConfig } from '../config/wagmi-farcaster.config'
import { rainbowConfig } from '../config/rainbowkit.config'

interface WalletProviderProps {
  children: ReactNode
  isMiniApp: boolean
}

const queryClient = new QueryClient()

export function WalletProvider({ children, isMiniApp }: WalletProviderProps) {
  const { i18n } = useTranslation()
  
  // Memoize the locale to prevent unnecessary recalculations during renders
  const locale = useMemo<Locale>(() => {
    const currentLang = i18n.language
    
    // RainbowKit supported locales mapping
    const localeMap: Record<string, Locale> = {
      'en': 'en-US',
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'zh-HK': 'zh-HK',
      // Add more mappings as needed for languages both apps support
    }
    
    return (localeMap[currentLang] || 'en-US') as Locale
  }, [i18n.language])

  if (isMiniApp) {
    return (
      <WagmiProvider config={farcasterWagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    )
  }

  return (
    <WagmiProvider config={rainbowConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          locale={locale}
          theme={darkTheme({
            accentColor: '#525252', // neutral-600
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}