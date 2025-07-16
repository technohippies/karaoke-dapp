import { Button } from './ui/button'
import { useAccount } from 'wagmi'

interface ChainSwitcherProps {
  requiredChainId: number
  children: React.ReactNode
  className?: string
}

export function ChainSwitcher({ requiredChainId, children, className }: ChainSwitcherProps) {
  const { chain } = useAccount()
  
  if (chain?.id === requiredChainId) {
    return <>{children}</>
  }
  
  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 8453:
        return 'Base'
      case 84532:
        return 'Base Sepolia'
      case 11155420:
        return 'Optimism Sepolia'
      default:
        return 'Unknown Network'
    }
  }
  
  return (
    <Button
      disabled
      className={className}
    >
      Switch to {getChainName(requiredChainId)}
    </Button>
  )
}