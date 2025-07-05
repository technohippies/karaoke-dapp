import { useState } from 'react';
import { Button } from '@karaoke-dapp/ui';
import { writeContract, readContract } from '@wagmi/core';
import { wagmiConfig } from '../wagmi';
import { CONTRACTS, KaraokeStoreV030ABI } from '@karaoke-dapp/contracts';
import { useAccount } from 'wagmi';
import { generatePrivateKey } from 'viem/accounts';
import { privateKeyToAddress } from 'viem/accounts';

export function TestV030Contract() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testContract = async () => {
    if (!address) {
      setResult('No wallet connected');
      return;
    }

    setLoading(true);
    setResult('Testing...');

    try {
      // First check if we can read voice credits
      const voiceCredits = await readContract(wagmiConfig, {
        address: CONTRACTS.baseSepolia.karaokeStoreV030,
        abi: KaraokeStoreV030ABI,
        functionName: 'getVoiceCredits',
        args: [address],
      });
      
      setResult(`Voice credits: ${voiceCredits}\n`);

      // Generate a test session key
      const sessionPrivateKey = generatePrivateKey();
      const sessionAddress = privateKeyToAddress(sessionPrivateKey);
      
      // Try to call initializeSession directly
      const tx = await writeContract(wagmiConfig, {
        address: CONTRACTS.baseSepolia.karaokeStoreV030,
        abi: KaraokeStoreV030ABI,
        functionName: 'initializeSession',
        args: [
          BigInt(1), // songId
          sessionAddress as `0x${string}`,
          BigInt(100) // maxCredits
        ],
      });
      
      setResult(prev => prev + `\nTransaction sent: ${tx}`);
      
      // Wait for transaction and check the result
      const { waitForTransactionReceipt } = await import('@wagmi/core');
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: tx,
        confirmations: 1,
      });
      
      setResult(prev => prev + `\nTransaction status: ${receipt.status}`);
      
      if (receipt.status === 'success') {
        // Try to read the session
        const sessionId = receipt.logs?.[0]?.topics?.[1];
        if (sessionId) {
          const session = await readContract(wagmiConfig, {
            address: CONTRACTS.baseSepolia.karaokeStoreV030,
            abi: KaraokeStoreV030ABI,
            functionName: 'getSession',
            args: [sessionId as `0x${string}`],
          });
          setResult(prev => prev + `\nSession created: ${JSON.stringify(session, null, 2)}`);
        }
      }
      
    } catch (error: any) {
      console.error('Test failed:', error);
      setResult(`Error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-neutral-800 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Test V0.3.0 Contract</h3>
      
      <Button 
        onClick={testContract} 
        disabled={loading || !address}
        className="w-full"
      >
        {loading ? 'Testing...' : 'Test initializeSession'}
      </Button>
      
      {result && (
        <pre className="text-xs text-neutral-400 whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}