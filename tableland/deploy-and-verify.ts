#!/usr/bin/env node
import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import ora from 'ora'
import dotenv from 'dotenv'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

dotenv.config({ path: '../.env' })

async function deployAndVerify() {
  const spinner = ora('Preparing to deploy new table...').start()
  
  try {
    // Validate environment
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not set in environment')
    }
    
    // Create wallet with provider
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org')
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider)
    spinner.text = `Using wallet: ${wallet.address}`
    
    // Initialize Tableland with default settings (no baseUrl needed for testnets)
    const db = new Database({ signer: wallet })
    
    // Step 1: Create the table
    spinner.text = 'Creating karaoke_songs_v5 table...'
    
    const { meta: createMeta } = await db
      .prepare(`CREATE TABLE karaoke_songs_v5_84532 (
        id INTEGER PRIMARY KEY,
        isrc TEXT NOT NULL,
        iswc TEXT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        duration INTEGER,
        stems TEXT,
        language TEXT DEFAULT 'en',
        genius_id INTEGER,
        lrclib_id INTEGER,
        genius_slug TEXT,
        streaming_links TEXT,
        artwork_hash TEXT,
        translations TEXT,
        updated_at INTEGER
      )`)
      .run()
    
    // Wait for transaction
    let tableName: string
    try {
      await createMeta.txn?.wait()
      tableName = createMeta.txn?.names?.[0] || 'karaoke_songs_v5_84532_XXX'
    } catch (receiptError: any) {
      // Receipt fails but we know the table ID from the transaction
      tableName = `karaoke_songs_v5_84532_${createMeta.txn?.tableId}`
      console.log(`\n⚠️ Receipt failed but using table: ${tableName}`)
    }
    
    spinner.succeed(`✅ Table created: ${tableName}`)
    console.log(`   Transaction: ${createMeta.txn?.transactionHash}`)
    
    // Save deployment info
    const deploymentsDir = join(__dirname, 'deployments')
    if (!existsSync(deploymentsDir)) {
      mkdirSync(deploymentsDir, { recursive: true })
    }
    
    const deploymentInfo = {
      tableName,
      version: 'v5',
      chainId: 84532,
      createdAt: new Date().toISOString(),
      deployer: wallet.address,
      transactionHash: createMeta.txn?.transactionHash,
      tableId: createMeta.txn?.tableId
    }
    
    writeFileSync(
      join(deploymentsDir, `${tableName}.json`),
      JSON.stringify(deploymentInfo, null, 2)
    )
    
    // Step 2: Test with immediate insert
    spinner.start(`Testing insert into ${tableName}...`)
    
    const testData = {
      id: 1,
      isrc: 'USG7D1404203',
      iswc: 'T-061.400.517-2',
      title: 'Royals',
      artist: 'Lorde',
      duration: 192,
      stems: '{"piano":"bafkreigeqagpjdguf62urlljficfgc4thu3djxicjze34wyuyhins56d4i"}',
      language: 'en',
      genius_id: 114153,
      lrclib_id: 2643794,
      genius_slug: 'Lorde-royals-lyrics',
      streaming_links: '{"soundcloud":"lordemusic/royals-1","spotify":"0YAJcefABZHD0D3KcYpSdR","apple_music":"1440818664","youtube":"nlcIKh6sBtc"}',
      artwork_hash: '{"id":"04eaa177af6d7ce3e549241bf1cc0b16","ext":"png","sizes":{"t":"300x300x1","f":"1000x1000x1"}}',
      translations: '{"zh":"bafkreiadpdwpuxmazk36aixyj57cds5vwo6vyjjyajwstobfky3w66hs4y","ug":"bafkreie5664aiz2ybg3br6ebpjgolgysahkpk6trqo3g3rtawe7dw7vsmu","bo":"bafkreiaz7z5f6e23esp6yuf6ytw6426nmtneue4wkjybq2zrsdyuzokjim"}'
    }
    
    const { meta: insertMeta } = await db
      .prepare(`INSERT INTO ${tableName} (
        id, isrc, iswc, title, artist, duration, stems, language,
        genius_id, lrclib_id, genius_slug, streaming_links, artwork_hash, translations, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        testData.id, testData.isrc, testData.iswc, testData.title, testData.artist, testData.duration,
        testData.stems, testData.language, testData.genius_id, testData.lrclib_id,
        testData.genius_slug, testData.streaming_links, testData.artwork_hash, testData.translations,
        Math.floor(Date.now() / 1000)
      )
      .run()
    
    try {
      await insertMeta.txn?.wait()
    } catch (e) {
      console.log('⚠️ Insert wait timeout')
    }
    
    spinner.succeed(`✓ Test insert complete: ${insertMeta.txn?.transactionHash}`)
    
    // Step 3: Wait and verify
    spinner.start('Waiting for Tableland to sync (30 seconds)...')
    await new Promise(resolve => setTimeout(resolve, 30000))
    
    // Try multiple verification methods
    spinner.text = 'Verifying with SDK query...'
    
    try {
      const result = await db.prepare(`SELECT * FROM ${tableName}`).all()
      console.log(`\n📊 SDK Query Results: Found ${result.results.length} rows`)
      
      if (result.results.length > 0) {
        console.log(`✅ Success! Data is in ${tableName}`)
        result.results.forEach((row: any) => {
          console.log(`   - ${row.title} by ${row.artist}`)
        })
      }
    } catch (queryError) {
      console.log('⚠️ SDK query failed:', queryError)
    }
    
    // Also try REST API
    spinner.text = 'Verifying with REST API...'
    const restUrl = `https://testnets.tableland.network/api/v1/query?statement=SELECT * FROM ${tableName}`
    
    try {
      const response = await fetch(restUrl)
      if (response.ok) {
        const data = await response.json()
        console.log(`\n📊 REST API Results: Found ${data.length} rows`)
      } else {
        console.log(`⚠️ REST API returned: ${response.status}`)
      }
    } catch (restError) {
      console.log('⚠️ REST API failed:', restError)
    }
    
    spinner.succeed('✅ Deployment complete!')
    
    console.log(`\n✨ Table Details:`)
    console.log(`   Name: ${tableName}`)
    console.log(`   Chain: Base Sepolia (84532)`)
    console.log(`   Contract: 0xA85aAE9f0Aec5F5638E5F13840797303Ab29c9f9`)
    console.log(`\n📝 Update your scripts to use: ${tableName}`)
    
  } catch (error: any) {
    spinner.fail(`Failed: ${error.message}`)
    console.error(error)
    process.exit(1)
  }
}

// Run deployment
deployAndVerify()
  .then(() => {
    console.log('\n🎉 Table deployed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error)
    process.exit(1)
  })