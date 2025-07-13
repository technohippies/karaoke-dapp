import { ethers } from 'ethers'
import * as dotenv from 'dotenv'
import { KARAOKE_STORE_V5_ADDRESS, KARAOKE_STORE_V5_ABI, PKP_ADDRESS } from '../apps/web/src/constants'

dotenv.config()

async function checkPKPAddress() {
  console.log('🔍 Checking PKP address on contract...\n')
  
  if (!process.env.PRIVATE_KEY || !process.env.BASE_SEPOLIA_RPC) {
    throw new Error('Missing required env vars: PRIVATE_KEY, BASE_SEPOLIA_RPC')
  }
  
  const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC)
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  
  console.log('Wallet address:', wallet.address)
  console.log('Contract address:', KARAOKE_STORE_V5_ADDRESS)
  console.log('Expected PKP address:', PKP_ADDRESS)
  
  try {
    // Create contract instance
    const contract = new ethers.Contract(KARAOKE_STORE_V5_ADDRESS, KARAOKE_STORE_V5_ABI, provider)
    
    // Check current PKP address
    const currentPKP = await contract.pkpAddress()
    console.log('\nCurrent PKP address on contract:', currentPKP)
    
    if (currentPKP === ethers.constants.AddressZero) {
      console.log('❌ PKP address not set on contract!')
      console.log('\n📝 To set it, run:')
      console.log(`npx tsx scripts/set-pkp-address.ts`)
    } else if (currentPKP.toLowerCase() === PKP_ADDRESS.toLowerCase()) {
      console.log('✅ PKP address is correctly set!')
    } else {
      console.log('⚠️  PKP address mismatch!')
      console.log('Expected:', PKP_ADDRESS)
      console.log('Actual:', currentPKP)
    }
    
    // Check if wallet is owner
    const owner = await contract.owner()
    console.log('\nContract owner:', owner)
    console.log('Is wallet owner?', owner.toLowerCase() === wallet.address.toLowerCase())
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

checkPKPAddress()