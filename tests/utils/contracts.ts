import { ethers } from 'ethers'
import ethers5 from 'ethers5'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Contract ABI and address
const CONTRACT_ABI = JSON.parse(
  readFileSync(
    join(__dirname, '../../packages/contracts/out/KaraokeStore_V0_1_0.sol/KaraokeStore_V0_1_0.json'),
    'utf8'
  )
).abi

export const CONTRACT_ADDRESS = process.env.KARAOKE_STORE_ADDRESS!
export const RPC_URL = process.env.RPC_URL_SEPOLIA!
export const PRIVATE_KEY = process.env.PRIVATE_KEY!

export function getContract() {
  const provider = new ethers5.providers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers5.Wallet(PRIVATE_KEY, provider)
  return new ethers5.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet)
}

export function getWallet() {
  const provider = new ethers5.providers.JsonRpcProvider(RPC_URL)
  return new ethers5.Wallet(PRIVATE_KEY, provider)
}

export async function ensureCredits(contract: any, wallet: any, minCredits: bigint = 10n) {
  const balance = await contract.getVoiceCredits(wallet.address)
  console.log(`Current voice credit balance: ${balance}`)
  
  if (balance < minCredits) {
    console.log(`❌ Insufficient credits (${balance} < ${minCredits})`)
    console.log(`⚠️  Skipping credit purchase - would need USDC allowance setup`)
    console.log(`💡 Run this manually first: bun run packages/contracts/scripts/buy-voice-credits-v2.js`)
    throw new Error(`Insufficient voice credits for test. Current: ${balance}, Required: ${minCredits}. Please purchase credits manually first.`)
  }
  
  console.log(`✅ Sufficient credits available: ${balance}`)
  return balance
}