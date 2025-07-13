import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function uploadToPinata(filePath: string): Promise<string> {
  if (!process.env.PINATA_JWT) {
    throw new Error('PINATA_JWT not found in .env file');
  }

  const formData = new FormData();
  const file = fs.createReadStream(filePath);
  formData.append('file', file);

  const metadata = JSON.stringify({
    name: path.basename(filePath),
  });
  formData.append('pinataMetadata', metadata);

  const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
    maxBodyLength: Infinity,
    headers: {
      ...formData.getHeaders(),
      'Authorization': `Bearer ${process.env.PINATA_JWT}`,
    },
  });

  return response.data.IpfsHash;
}

async function uploadToWeb3Storage(filePath: string): Promise<string> {
  // Alternative: Direct IPFS node or web3.storage
  // For now, we'll use a simple approach
  const code = fs.readFileSync(filePath, 'utf8');
  
  // You can also use Lit's built-in IPFS upload (if available)
  // or any other IPFS service
  console.log('📌 Manual upload required:');
  console.log('1. Go to https://app.pinata.cloud or https://web3.storage');
  console.log('2. Upload the file:', filePath);
  console.log('3. Get the CID and add to .env as LIT_ACTION_CID');
  
  return 'MANUAL_UPLOAD_REQUIRED';
}

async function main() {
  try {
    // Get file path from command line argument
    const fileName = process.argv[2];
    if (!fileName) {
      throw new Error('Please provide a file path as an argument');
    }
    
    const actionPath = path.join(process.cwd(), fileName);
    
    if (!fs.existsSync(actionPath)) {
      throw new Error(`Lit Action file not found at: ${actionPath}`);
    }

    console.log('Uploading Lit Action to IPFS...');
    
    let cid: string;
    
    if (process.env.PINATA_JWT) {
      cid = await uploadToPinata(actionPath);
      console.log('\n✅ Lit Action uploaded successfully!');
      console.log('='.repeat(50));
      console.log('IPFS CID:', cid);
      console.log('='.repeat(50));
      console.log('\n📝 Add this to your .env file:');
      console.log(`LIT_ACTION_CID=${cid}`);
    } else {
      console.log('\n⚠️  No Pinata API keys found.');
      await uploadToWeb3Storage(actionPath);
      console.log('\nAfter manual upload, add the CID to your .env file.');
    }
    
  } catch (error) {
    console.error('Error uploading Lit Action:', error);
    process.exit(1);
  }
}

main();