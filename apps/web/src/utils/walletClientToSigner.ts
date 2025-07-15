import { ethers } from 'ethers'
import { WalletClient } from 'viem'

export async function walletClientToSigner(walletClient: WalletClient): Promise<ethers.Signer> {
  console.log('🔄 Converting wallet client to signer:', walletClient)
  const { account, chain, transport } = walletClient
  
  console.log('📊 Wallet client details:', {
    account: account.address,
    chainId: chain.id,
    chainName: chain.name,
    transport: transport.type
  })
  
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  
  // Create provider from transport
  const provider = new ethers.BrowserProvider(transport as any, network)
  const signer = await provider.getSigner(account.address)
  console.log('✅ Signer created successfully:', await signer.getAddress())
  return signer
}