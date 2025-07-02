import fs from "fs/promises";
import path from "path";
import ora from 'ora';
import { fileURLToPath } from 'url';
import { ipfsClient } from './utils/ipfsClient.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadToIPFS(filePath) {
    const spinner = ora(`Uploading: ${path.basename(filePath)}`).start();
    try {
        const cid = await ipfsClient.uploadFile(filePath);
        spinner.succeed(`Uploaded ${path.basename(filePath)} with CID: ${cid}`);
        return cid;
    } catch (error) {
        spinner.fail(`Failed to upload ${path.basename(filePath)}: ${error.message}`);
        throw error;
    }
}

async function main() {
    console.log('Deploying Test PKP Signing Action');
    console.log('=================================\n');
    
    // Check for Pinata JWT
    if (!process.env.PINATA_JWT) {
        console.error('❌ Pinata JWT not found!');
        process.exit(1);
    }
    
    try {
        // Read and upload the test action
        const actionPath = path.join(__dirname, '..', 'src', 'test-pkp-signing.js');
        const actionCode = await fs.readFile(actionPath, 'utf-8');
        
        // Create temp file
        const tempPath = path.join(__dirname, '..', 'temp', 'test-pkp-signing.js');
        await fs.mkdir(path.dirname(tempPath), { recursive: true });
        await fs.writeFile(tempPath, actionCode);
        
        // Upload to IPFS
        const cid = await uploadToIPFS(tempPath);
        
        // Clean up
        await fs.unlink(tempPath).catch(() => {});
        
        console.log('\n✅ Test action deployed successfully!');
        console.log(`CID: ${cid}`);
        console.log(`Gateway: https://ipfs.io/ipfs/${cid}`);
        
        // Save to a separate file for easy reference
        const testDeploymentPath = path.join(__dirname, '..', 'deployments', 'test-pkp-signing.json');
        await fs.writeFile(testDeploymentPath, JSON.stringify({
            actionName: 'test-pkp-signing',
            ipfsCid: cid,
            deployedAt: new Date().toISOString(),
            network: 'datil'
        }, null, 2));
        
        console.log(`\nDeployment info saved to: ${testDeploymentPath}`);
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

main();