import { readContract, writeContract, waitForTransactionReceipt, signTypedData } from '@wagmi/core';
import { wagmiConfig } from '../../wagmi';
import { CONTRACTS, MusicStoreV2ABI } from '@karaoke-dapp/contracts';
import type { SongContext } from '../types';
import { keccak256, encodePacked, toHex } from 'viem';

const MUSIC_STORE_ADDRESS = CONTRACTS.baseSepolia.musicStore;
const USDC_ADDRESS = CONTRACTS.baseSepolia.usdc;

// USDC ABI for permit functions
const USDC_PERMIT_ABI = [
  {
    name: 'nonces',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'DOMAIN_SEPARATOR',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'bytes32' }],
    stateMutability: 'view'
  },
  {
    name: 'name',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view'
  },
  {
    name: 'version',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view'
  }
] as const;

/**
 * Sign a permit for USDC spending
 */
export const signPermit = async (userAddress: string, amount: bigint) => {
  // Get nonce for permit
  const nonce = await readContract(wagmiConfig, {
    address: USDC_ADDRESS,
    abi: USDC_PERMIT_ABI,
    functionName: 'nonces',
    args: [userAddress as `0x${string}`],
  });
  
  // Set deadline to 5 minutes from now
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
  
  // Get token info for domain
  const [tokenName, tokenVersion] = await Promise.all([
    readContract(wagmiConfig, {
      address: USDC_ADDRESS,
      abi: USDC_PERMIT_ABI,
      functionName: 'name',
    }),
    readContract(wagmiConfig, {
      address: USDC_ADDRESS,
      abi: USDC_PERMIT_ABI,
      functionName: 'version',
    })
  ]);
  
  // Create typed data for permit
  const domain = {
    name: tokenName,
    version: tokenVersion,
    chainId: 84532, // Base Sepolia
    verifyingContract: USDC_ADDRESS as `0x${string}`,
  };
  
  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  } as const;
  
  const message = {
    owner: userAddress as `0x${string}`,
    spender: MUSIC_STORE_ADDRESS as `0x${string}`,
    value: amount,
    nonce: nonce,
    deadline: deadline,
  };
  
  // Sign the permit
  const signature = await signTypedData(wagmiConfig, {
    domain,
    types,
    primaryType: 'Permit',
    message,
  });
  
  // Extract r, s, v from signature
  const sig = signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
  let v = parseInt(sig.slice(128, 130), 16);
  
  // EIP-155 adjustment: if v is 0 or 1, add 27
  if (v < 27) {
    v += 27;
  }
  
  return { deadline, v, r, s };
};

/**
 * Purchase and unlock with permit - reduces 3 transactions to 2
 * Transaction 1: Buy pack with permit (includes gasless approval)
 * Transaction 2: Unlock song
 */
export const purchaseAndUnlockWithPermit = async ({ input }: { input: SongContext }) => {
  const context = input;
  if (!context.userAddress) {
    throw new Error('No user address');
  }

  try {
    // First check if user has credits
    const credits = await readContract(wagmiConfig, {
      address: MUSIC_STORE_ADDRESS,
      abi: MusicStoreV2ABI,
      functionName: 'getCredits',
      args: [context.userAddress as `0x${string}`],
    });

    console.log('User credits:', credits);

    // If no credits, buy with permit
    if (credits === 0n) {
      console.log('No credits, checking if new user...');
      
      // Check if user has any voice credits to determine if they're new
      const voiceCredits = await readContract(wagmiConfig, {
        address: MUSIC_STORE_ADDRESS,
        abi: MusicStoreV2ABI,
        functionName: 'getVoiceCredits',
        args: [context.userAddress as `0x${string}`],
      });
      
      // Check if user has access to any songs
      let hasAnyAccess = false;
      for (let i = 1; i <= 5; i++) {
        try {
          const access = await readContract(wagmiConfig, {
            address: MUSIC_STORE_ADDRESS,
            abi: MusicStoreV2ABI,
            functionName: 'checkAccess',
            args: [context.userAddress as `0x${string}`, BigInt(i)],
          });
          if (access) {
            hasAnyAccess = true;
            break;
          }
        } catch {
          // Ignore errors for non-existent songs
        }
      }
      
      const isNewUser = voiceCredits === 0n && !hasAnyAccess;
      console.log(`User status: ${isNewUser ? 'NEW' : 'EXISTING'} (voice credits: ${voiceCredits}, has songs: ${hasAnyAccess})`);

      // Get permit parameters
      const packPrice = isNewUser ? 3000000n : 2000000n; // $3 for combo, $2 for songs
      const functionName = isNewUser ? 'buyComboPackWithPermit' : 'buyCreditPackWithPermit';
      const packType = isNewUser ? 'combo pack' : 'credit pack';
      
      console.log(`📝 Preparing ${packType} purchase with permit...`);
      
      // Sign the permit
      const permitSig = await signPermit(context.userAddress, packPrice);
      
      console.log('Signature components:', { 
        r: permitSig.r, 
        s: permitSig.s, 
        v: permitSig.v 
      });
      
      console.log(`💳 Buying ${packType} with permit...`);
      
      // Buy with permit (no separate approval needed!)
      const hash = await writeContract(wagmiConfig, {
        address: MUSIC_STORE_ADDRESS,
        abi: MusicStoreV2ABI,
        functionName: functionName as any,
        args: [permitSig.deadline, permitSig.v, permitSig.r, permitSig.s],
      });
      
      console.log(`${packType} purchase tx:`, hash);
      
      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        confirmations: 1,
      });
      
      if (receipt.status !== 'success') {
        throw new Error(`${packType} purchase failed`);
      }
      
      console.log(`✅ ${packType} purchased successfully with permit!`);
    }

    // Now unlock the song using credits
    const unlockHash = await writeContract(wagmiConfig, {
      address: MUSIC_STORE_ADDRESS,
      abi: MusicStoreV2ABI,
      functionName: 'unlockSong',
      args: [BigInt(context.songId)],
    });

    console.log('Song unlock tx:', unlockHash);

    // Wait for confirmation
    const unlockReceipt = await waitForTransactionReceipt(wagmiConfig, {
      hash: unlockHash,
      confirmations: 1,
    });

    if (unlockReceipt.status !== 'success') {
      throw new Error('Song unlock failed');
    }

    console.log('✅ Song unlocked successfully');

    // Return the transaction hash as token ID
    return { tokenId: unlockHash };
  } catch (error) {
    console.error('Purchase error:', error);
    throw error;
  }
};