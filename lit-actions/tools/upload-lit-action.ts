import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from root .env since PINATA_JWT is shared across multiple folders
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function uploadLitAction() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/upload-lit-action.ts <path-to-lit-action.js> [--name <optional-name>]');
    console.error('Example: npx tsx scripts/upload-lit-action.ts ./lit-actions/voiceGrader.js --name "Voice Grader V1"');
    process.exit(1);
  }

  const filePath = args[0];
  
  // Parse optional name argument
  let customName = '';
  const nameIndex = args.indexOf('--name');
  if (nameIndex !== -1 && args[nameIndex + 1]) {
    customName = args[nameIndex + 1];
  }
  
  try {
    // Read the Lit Action file
    const jsCode = fs.readFileSync(path.resolve(filePath), 'utf8');
    console.log(`📖 Read Lit Action from: ${filePath}`);
    console.log(`📏 File size: ${jsCode.length} bytes`);
    
    // Upload to Pinata as a file
    console.log('\n📤 Uploading to IPFS via Pinata...');
    
    const formData = new FormData();
    const blob = new Blob([jsCode], { type: 'text/javascript' });
    const fileName = customName ? `${customName.replace(/\s+/g, '-')}.js` : path.basename(filePath);
    formData.append('file', blob, fileName);
    
    // Add metadata if custom name provided
    if (customName) {
      formData.append('pinataMetadata', JSON.stringify({
        name: customName,
        keyvalues: {
          type: 'lit-action',
          uploadDate: new Date().toISOString()
        }
      }));
    }
    
    if (!process.env.PINATA_JWT) {
      throw new Error('PINATA_JWT not found in environment variables');
    }
    
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
    if (customName) {
      console.log('Name:', customName);
    }
    console.log('File:', fileName);
    console.log('='.repeat(60));
    
    console.log('\n📝 Update your .env file:');
    console.log(`LIT_ACTION_CID=${result.IpfsHash}`);
    
    console.log('\n🔗 View on IPFS:');
    console.log(`https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);
    console.log(`https://ipfs.io/ipfs/${result.IpfsHash}`);
    
    // Save to the main deployments.json file
    const deploymentsFile = path.resolve(__dirname, '../deployments.json');
    let deployments = {};
    
    try {
      if (fs.existsSync(deploymentsFile)) {
        deployments = JSON.parse(fs.readFileSync(deploymentsFile, 'utf8'));
      }
    } catch (e) {
      console.log('\n📁 Creating new deployments file...');
    }
    
    // Add new deployment
    const deploymentKey = customName || path.basename(filePath, '.js');
    deployments[deploymentKey] = {
      cid: result.IpfsHash,
      fileName: fileName,
      uploadDate: new Date().toISOString(),
      filePath: filePath
    };
    
    fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 2));
    console.log(`\n💾 Deployment saved to ${path.relative(process.cwd(), deploymentsFile)}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

uploadLitAction();