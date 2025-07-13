import { ethers } from 'ethers'
import * as dotenv from 'dotenv'
import { KARAOKE_STORE_V5_ADDRESS, KARAOKE_STORE_V5_ABI, PKP_ADDRESS } from '../apps/web/src/constants'

dotenv.config()

async function setPKPAddress() {
  console.log('🔧 Setting PKP address on contract...\n')
  
  if (!process.env.PRIVATE_KEY || !process.env.BASE_SEPOLIA_RPC) {
    throw new Error('Missing required env vars: PRIVATE_KEY, BASE_SEPOLIA_RPC')
  }
  
  const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC)
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  
  console.log('Wallet address:', wallet.address)
  console.log('Contract address:', KARAOKE_STORE_V5_ADDRESS)
  console.log('PKP address to set:', PKP_ADDRESS)
  
  try {
    // Create contract instance
    const contract = new ethers.Contract(KARAOKE_STORE_V5_ADDRESS, KARAOKE_STORE_V5_ABI, wallet)
    
    // Check current PKP address
    const currentPKP = await contract.pkpAddress()
    console.log('\nCurrent PKP address:', currentPKP)
    
    if (currentPKP.toLowerCase() === PKP_ADDRESS.toLowerCase()) {
      console.log('✅ PKP address already correctly set!')
      return
    }
    
    // Check if wallet is owner
    const owner = await contract.owner()
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(`Wallet ${wallet.address} is not the contract owner. Owner is ${owner}`)
    }
    
    console.log('\n📝 Setting PKP address...')
    const tx = await contract.setPkpAddress(PKP_ADDRESS)
    console.log('Transaction hash:', tx.hash)
    
    console.log('⏳ Waiting for confirmation...')
    const receipt = await tx.wait()
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber)
    
    // Verify it was set
    const newPKP = await contract.pkpAddress()
    console.log('\nNew PKP address:', newPKP)
    console.log('Success:', newPKP.toLowerCase() === PKP_ADDRESS.toLowerCase())
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

setPKPAddress()