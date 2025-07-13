import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function uploadLitAction() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/upload-lit-action.ts <path-to-lit-action.js>');
    process.exit(1);
  }

  const filePath = args[0];
  
  try {
    // Read the Lit Action file
    const jsCode = fs.readFileSync(path.resolve(filePath), 'utf8');
    console.log(`📖 Read Lit Action from: ${filePath}`);
    console.log(`📏 File size: ${jsCode.length} bytes`);
    
    // Upload to Pinata as a file
    console.log('\n📤 Uploading to IPFS via Pinata...');
    
    const formData = new FormData();
    const blob = new Blob([jsCode], { type: 'text/javascript' });
    formData.append('file', blob, path.basename(filePath));
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata upload failed: ${error}`);
    }

    const result = await response.json();
    console.log('\n✅ Upload successful!');
    console.log('='.repeat(60));
    console.log('IPFS CID:', result.IpfsHash);
    console.log('='.repeat(60));
    
    console.log('\n📝 Update your .env file:');
    console.log(`LIT_ACTION_CID=${result.IpfsHash}`);
    
    console.log('\n🔗 View on IPFS:');
    console.log(`https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

uploadLitAction();