#!/usr/bin/env bun
import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

async function queryBaseSepolia() {
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org')
  const wallet = new Wallet(process.env.PRIVATE_KEY!, provider)
  const db = new Database({ signer: wallet })
  
  const tables = [
    'karaoke_songs_84532_160',
    'karaoke_songs_v4_84532_165',
    'karaoke_songs_v5_84532_166'
  ]
  
  for (const table of tables) {
    console.log(`\n🔍 Checking table: ${table}`)
    try {
      const result = await db.prepare(`SELECT id, title, translations FROM ${table} ORDER BY id`).all()
      console.log(`Found ${result.results.length} songs`)
      if (result.results.length > 0) {
        console.log('Sample:', JSON.stringify(result.results[0], null, 2))
      }
    } catch (error: any) {
      console.error(`❌ ${error.message}`)
    }
  }
}

queryBaseSepolia().catch(console.error)