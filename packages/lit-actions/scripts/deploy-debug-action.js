import fs from "fs/promises";
import path from "path";
import ora from 'ora';
import { fileURLToPath } from 'url';
import { ipfsClient } from './utils/ipfsClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('Deploying Debug Signing Action\n');
    
    try {
        const actionPath = path.join(__dirname, '..', 'src', 'debug-signing.js');
        const actionCode = await fs.readFile(actionPath, 'utf-8');
        
        const tempPath = path.join(__dirname, '..', 'temp', 'debug-signing.js');
        await fs.mkdir(path.dirname(tempPath), { recursive: true });
        await fs.writeFile(tempPath, actionCode);
        
        const spinner = ora('Uploading debug-signing.js').start();
        const cid = await ipfsClient.uploadFile(tempPath);
        spinner.succeed(`Uploaded with CID: ${cid}`);
        
        await fs.unlink(tempPath).catch(() => {});
        
        console.log('\n✅ Debug action deployed!');
        console.log(`CID: ${cid}`);
        console.log(`Gateway: https://ipfs.io/ipfs/${cid}`);
        
        // Save deployment info
        const deploymentPath = path.join(__dirname, '..', 'deployments', 'debug-signing.json');
        await fs.writeFile(deploymentPath, JSON.stringify({
            actionName: 'debug-signing',
            ipfsCid: cid,
            deployedAt: new Date().toISOString(),
            network: 'datil'
        }, null, 2));
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

main();