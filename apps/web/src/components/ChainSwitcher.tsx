import { Button } from './ui/button'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'

interface ChainSwitcherProps {
  requiredChainId: number
  children: React.ReactNode
  className?: string
}

export function ChainSwitcher({ requiredChainId, children, className }: ChainSwitcherProps) {
  const { chain } = useAccount()
  const { t } = useTranslation()
  
  if (chain?.id === requiredChainId) {
    return <>{children}</>
  }
  
  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 8453:
        return t('account.network.base')
      case 84532:
        return t('account.network.baseSepolia')
      case 11155420:
        return t('account.network.optimismSepolia')
      default:
        return 'Unknown Network'
    }
  }
  
  return (
    <Button
      disabled
      className={className}
    >
      {t('account.network.switchTo')} {getChainName(requiredChainId)}
    </Button>
  )
}