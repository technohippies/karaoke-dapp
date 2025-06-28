const https = require('https');
const fs = require('fs');
const FormData = require('form-data');
const dotenv = require('dotenv');
const path = require('path');
const { URL } = require('url');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

class IPFSClient {
    constructor() {
        // Get Pinata JWT from environment variables
        this.jwt = process.env.PINATA_JWT;
        
        if (!this.jwt) {
            throw new Error('PINATA_JWT must be set in .env file');
        }
        
        // Pinata API endpoint
        this.baseUrl = 'https://api.pinata.cloud';
    }

    async uploadFile(filePath) {
        return new Promise((resolve, reject) => {
            const fileBuffer = fs.readFileSync(filePath);
            const fileName = path.basename(filePath);
            
            console.log(`[Pinata] Uploading ${fileName} (${fileBuffer.length} bytes)...`);
            
            const form = new FormData();
            form.append('file', fileBuffer, {
                filename: fileName,
                contentType: 'text/javascript'
            });

            // Parse the URL
            const url = new URL(`${this.baseUrl}/pinning/pinFileToIPFS`);
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${this.jwt}`
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        // Debug logging
                        if (res.statusCode !== 200) {
                            console.error('[Pinata] Response status:', res.statusCode);
                            console.error('[Pinata] Response body:', data);
                        }
                        
                        const result = JSON.parse(data);
                        
                        // Pinata returns IpfsHash in the response
                        const cid = result?.IpfsHash;
                        
                        if (cid) {
                            console.log(`[Pinata] ✅ Successfully uploaded. CID: ${cid}`);
                            resolve(cid);
                        } else {
                            console.error('[Pinata] ❌ Upload response did not contain CID:', result);
                            reject(new Error(`No CID found in Pinata response: ${data}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse Pinata response: ${error.message}. Response: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                console.error('[Pinata] ❌ Request error:', error);
                reject(error);
            });
            
            form.pipe(req);
        });
    }

    async uploadContent(content, filename) {
        // Create a temporary file
        const tempPath = path.join(__dirname, '..', 'temp', filename);
        await fs.promises.mkdir(path.dirname(tempPath), { recursive: true });
        await fs.promises.writeFile(tempPath, content);
        
        try {
            const cid = await this.uploadFile(tempPath);
            // Clean up temp file
            await fs.promises.unlink(tempPath);
            return cid;
        } catch (error) {
            // Clean up temp file on error
            await fs.promises.unlink(tempPath).catch(() => {});
            throw error;
        }
    }
}

module.exports = {
    ipfsClient: new IPFSClient()
};