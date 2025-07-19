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
  
  try {
    // For ethers v5, use providers.Web3Provider
    const provider = new ethers.providers.Web3Provider(
      {
        request: async ({ method, params }: { method: string; params?: any[] }) => {
          console.log('Provider request:', method, params)
          
          // Use the wallet client's request method
          const result = await walletClient.request({
            method: method as any,
            params: params as any,
          })
          
          return result
        },
      } as any,
      {
        chainId: chain.id,
        name: chain.name,
      }
    )
    
    // Create a signer from the provider
    const signer = provider.getSigner(account.address)
    console.log('✅ Signer created successfully')
    
    return signer
  } catch (error) {
    console.error('Error creating signer:', error)
    throw error
  }
}