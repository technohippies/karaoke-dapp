const fs = require('fs/promises');
const path = require('path');
const ora = require('ora');
const { ipfsClient } = require('./utils/ipfsClient.js');

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

async function deployAction(actionName, contractAddress) {
    console.log(`\nDeploying ${actionName}...`);
    
    // Read the action code
    const actionPath = path.join(__dirname, '..', 'src', `${actionName}.js`);
    let actionCode = await fs.readFile(actionPath, 'utf-8');
    
    // Replace contract address if provided
    if (contractAddress) {
        actionCode = actionCode.replace('<TO_BE_SET>', contractAddress);
    }
    
    // First, deploy the action to get its CID
    const tempPath = path.join(__dirname, '..', 'temp', `${actionName}.js`);
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    
    // For midi-decryptor, we need to update it with its own CID
    // This is a chicken-and-egg problem, so we'll do it in two passes
    if (actionName === 'midi-decryptor') {
        // First pass: upload to get CID
        await fs.writeFile(tempPath, actionCode);
        const preliminaryCid = await uploadToIPFS(tempPath);
        
        // Second pass: update code with its own CID and re-upload
        actionCode = actionCode.replace('<THIS_ACTION_IPFS_CID>', preliminaryCid);
        actionCode = actionCode.replace('<MIDI_DECRYPTOR_ACTION_CID>', preliminaryCid);
        await fs.writeFile(tempPath, actionCode);
    } else {
        await fs.writeFile(tempPath, actionCode);
    }
    
    // Upload to IPFS
    const cid = await uploadToIPFS(tempPath);
    
    // Clean up temp file
    await fs.unlink(tempPath).catch(() => {});
    
    // Save deployment record
    const deployment = {
        actionName,
        ipfsCid: cid,
        deployedAt: new Date().toISOString(),
        network: 'datil',
        contractAddress: contractAddress || null
    };
    
    return deployment;
}

async function main() {
    console.log('Lit Actions IPFS Deployment');
    console.log('===========================\n');
    
    // Check for Pinata JWT
    if (!process.env.PINATA_JWT) {
        console.error('❌ Pinata JWT not found!');
        console.error('\nPlease add to your .env file:');
        console.error('PINATA_JWT=your_pinata_jwt_token');
        console.error('\nTo get a Pinata JWT:');
        console.error('1. Sign up at https://pinata.cloud');
        console.error('2. Go to API Keys section');
        console.error('3. Create a new API key');
        console.error('4. Copy the JWT token');
        process.exit(1);
    }
    
    // Get contract address
    let karaokeStoreAddress = process.env.KARAOKE_STORE_ADDRESS;
    
    if (!karaokeStoreAddress) {
        try {
            const forgeDeployment = await fs.readFile(
                path.join(__dirname, '../../contracts/deployments/84532.json'),
                'utf-8'
            );
            const deployment = JSON.parse(forgeDeployment);
            karaokeStoreAddress = deployment.karaokeStore;
        } catch (e) {
            console.error('❌ No contract deployment found!');
            console.error('Please deploy the KaraokeStore contract first.');
            process.exit(1);
        }
    }
    
    console.log(`Using KaraokeStore address: ${karaokeStoreAddress}`);
    
    const deployments = [];
    const failures = [];
    
    // Deploy all actions
    const actions = [
        { name: 'voice-grader', needsContract: false },
        { name: 'midi-decryptor', needsContract: true },
        { name: 'session-settlement', needsContract: true }
    ];
    
    for (const action of actions) {
        try {
            const deployment = await deployAction(
                action.name,
                action.needsContract ? karaokeStoreAddress : null
            );
            deployments.push(deployment);
        } catch (error) {
            console.error(`❌ Failed to deploy ${action.name}:`, error.message);
            failures.push({ action: action.name, error: error.message });
        }
    }
    
    // Save deployment records
    const deploymentsPath = path.join(__dirname, '..', 'deployments', 'actions.json');
    await fs.mkdir(path.dirname(deploymentsPath), { recursive: true });
    await fs.writeFile(deploymentsPath, JSON.stringify(deployments, null, 2));
    
    // Report results
    console.log('\n\nDeployment Summary');
    console.log('==================');
    console.log(`✅ Successfully deployed: ${deployments.length} actions`);
    
    if (deployments.length > 0) {
        console.log('\nDeployed Actions:');
        deployments.forEach(d => {
            console.log(`  ${d.actionName}: ipfs://${d.ipfsCid}`);
            console.log(`    Gateway: https://ipfs.io/ipfs/${d.ipfsCid}`);
        });
    }
    
    if (failures.length > 0) {
        console.log(`\n❌ Failed to deploy: ${failures.length} actions`);
        const failuresPath = path.join(__dirname, '..', 'deployments', 'deployment_failures.json');
        await fs.writeFile(failuresPath, JSON.stringify(failures, null, 2));
        console.log(`Failed deployments logged to: ${failuresPath}`);
    }
    
    console.log('\n✅ Deployment complete!');
    console.log(`Deployment info saved to: ${deploymentsPath}`);
}

// Run the deployment
main().catch(console.error);