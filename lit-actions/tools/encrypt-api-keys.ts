import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { LitNetwork } from '@lit-protocol/constants'
import { ethers } from 'ethers'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load from scripts/.env since API keys are script-specific
dotenv.config({ path: path.resolve(__dirname, '../../scripts/.env') })

// Get API keys from environment variables
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!DEEPGRAM_API_KEY || !OPENROUTER_API_KEY) {
  throw new Error('Missing required environment variables: DEEPGRAM_API_KEY, OPENROUTER_API_KEY')
}

async function encryptApiKeys() {
  console.log('🔐 Encrypting API keys...')
  
  const client = new LitNodeClient({
    litNetwork: LitNetwork.DatilDev,
    debug: false
  })
  
  await client.connect()
  console.log('✅ Connected to Lit Network')

  // Get contract address from environment
  const contractAddress = process.env.KARAOKE_CONTRACT || process.env.KARAOKE_PROXY
  if (!contractAddress) {
    throw new Error('Missing KARAOKE_CONTRACT or KARAOKE_PROXY environment variable')
  }
  
  console.log(`Using contract address: ${contractAddress}`)
  
  // EVM contract conditions - must have unlocked a song in our contract
  const evmContractConditions = [
    {
      contractAddress,
      functionName: 'hasUnlockedSong',
      functionParams: [':userAddress', '1'], // Must have unlocked at least song 1
      functionAbi: {
        type: 'function',
        name: 'hasUnlockedSong',
        inputs: [
          { name: '', type: 'address', internalType: 'address' },
          { name: '', type: 'uint256', internalType: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
        stateMutability: 'view'
      },
      chain: 'baseSepolia',
      returnValueTest: {
        key: '',
        comparator: '=',
        value: 'true'
      }
    }
  ]

  // Encrypt Deepgram API key
  console.log('🔐 Encrypting Deepgram API key...')
  const deepgramEncryption = await client.encrypt({
    dataToEncrypt: new TextEncoder().encode(DEEPGRAM_API_KEY),
    evmContractConditions,
    chain: 'baseSepolia'
  })

  // Encrypt OpenRouter API key
  console.log('🔐 Encrypting OpenRouter API key...')
  const openrouterEncryption = await client.encrypt({
    dataToEncrypt: new TextEncoder().encode(OPENROUTER_API_KEY),
    evmContractConditions,
    chain: 'baseSepolia'
  })

  console.log('✅ API keys encrypted successfully!')
  console.log('\n📝 Deepgram Encryption Data:')
  console.log('Ciphertext:', deepgramEncryption.ciphertext)
  console.log('DataToEncryptHash:', deepgramEncryption.dataToEncryptHash)
  
  console.log('\n📝 OpenRouter Encryption Data:')
  console.log('Ciphertext:', openrouterEncryption.ciphertext)
  console.log('DataToEncryptHash:', openrouterEncryption.dataToEncryptHash)

  // Save to a JSON file for easy reference
  const encryptionData = {
    deepgram: {
      ciphertext: deepgramEncryption.ciphertext,
      dataToEncryptHash: deepgramEncryption.dataToEncryptHash
    },
    openrouter: {
      ciphertext: openrouterEncryption.ciphertext,
      dataToEncryptHash: openrouterEncryption.dataToEncryptHash
    },
    evmContractConditions
  }

  const fs = await import('fs')
  fs.writeFileSync('/media/t42/th42/Code/lit-test/data/encrypted-api-keys.json', JSON.stringify(encryptionData, null, 2))
  console.log('💾 Encryption data saved to data/encrypted-api-keys.json')

  await client.disconnect()
}

encryptApiKeys().catch(console.error)