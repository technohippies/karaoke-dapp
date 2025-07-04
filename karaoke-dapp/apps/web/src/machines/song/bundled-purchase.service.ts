import { readContract } from '@wagmi/core';
import { wagmiConfig } from '../../wagmi';
import { CONTRACTS, MusicStoreV2ABI } from '@karaoke-dapp/contracts';
import { encodeFunctionData } from 'viem';
import type { SongContext } from '../types';

const MUSIC_STORE_ADDRESS = CONTRACTS.baseSepolia.musicStore;
const USDC_ADDRESS = CONTRACTS.baseSepolia.usdc;

// USDC ABI for permit
const USDC_PERMIT_ABI = [
  {
    name: 'nonces',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'permit',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const;

/**
 * Prepare bundled purchase calls for useSendCalls
 * This bundles everything into ONE transaction!
 * 1. USDC permit (gasless approval)
 * 2. Buy pack (combo or song)
 * 3. Unlock song
 */
export const prepareBundledPurchaseCalls = async ({ input }: { input: SongContext }) => {
  const context = input;
  if (!context.userAddress) {
    throw new Error('No user address');
  }

  try {
    // Check if user has credits
    const credits = await readContract(wagmiConfig, {
      address: MUSIC_STORE_ADDRESS,
      abi: MusicStoreV2ABI,
      functionName: 'getCredits',
      args: [context.userAddress as `0x${string}`],
    });

    console.log('User credits:', credits);

    const calls: Array<{
      to: `0x${string}`;
      data?: `0x${string}`;
      value?: bigint;
    }> = [];

    // If no credits, prepare purchase calls
    if (credits === 0n) {
      console.log('No credits, preparing bundled purchase...');
      
      // Check if user is new
      const voiceCredits = await readContract(wagmiConfig, {
        address: MUSIC_STORE_ADDRESS,
        abi: MusicStoreV2ABI,
        functionName: 'getVoiceCredits',
        args: [context.userAddress as `0x${string}`],
      });
      
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
          // Ignore errors
        }
      }
      
      const isNewUser = voiceCredits === 0n && !hasAnyAccess;
      const packPrice = isNewUser ? 3000000n : 2000000n; // $3 for combo, $2 for songs
      const functionName = isNewUser ? 'buyComboPackWithPermit' : 'buyCreditPackWithPermit';
      
      // Get nonce for permit
      const nonce = await readContract(wagmiConfig, {
        address: USDC_ADDRESS,
        abi: USDC_PERMIT_ABI,
        functionName: 'nonces',
        args: [context.userAddress as `0x${string}`],
      });
      
      // Set deadline to 5 minutes from now
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      
      console.log(`📦 Preparing ${isNewUser ? 'combo' : 'song'} pack bundled calls...`);
      
      // We'll need the user to sign the permit data
      const permitData = {
        domain: {
          name: 'USD Coin',
          version: '1',
          chainId: 84532, // Base Sepolia
          verifyingContract: USDC_ADDRESS as `0x${string}`,
        },
        types: {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        } as const,
        primaryType: 'Permit' as const,
        message: {
          owner: context.userAddress as `0x${string}`,
          spender: MUSIC_STORE_ADDRESS as `0x${string}`,
          value: packPrice,
          nonce: nonce,
          deadline: deadline,
        },
      };
      
      // Return data needed for the purchase flow
      return {
        permitData,
        functionName,
        packPrice,
        deadline,
        isNewUser,
        songId: context.songId,
        needsPermit: true,
      };
    }

    // If user has credits, just prepare unlock call
    console.log('User has credits, preparing unlock call...');
    
    calls.push({
      to: MUSIC_STORE_ADDRESS,
      data: encodeFunctionData({
        abi: MusicStoreV2ABI,
        functionName: 'unlockSong',
        args: [BigInt(context.songId)],
      }),
    });

    return {
      calls,
      needsPermit: false,
    };
  } catch (error) {
    console.error('Error preparing bundled calls:', error);
    throw error;
  }
};

/**
 * Create the actual calls array after permit is signed
 */
export const createBundledCalls = (
  permitSignature: `0x${string}`,
  functionName: string,
  deadline: bigint,
  songId: number
) => {
  // Extract r, s, v from signature
  const sig = permitSignature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
  const v = parseInt(sig.slice(128, 130), 16);
  
  const calls: Array<{
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }> = [];
  
  // Call 1: Buy pack with permit (includes approval)
  calls.push({
    to: MUSIC_STORE_ADDRESS,
    data: encodeFunctionData({
      abi: MusicStoreV2ABI,
      functionName: functionName as any,
      args: [deadline, v, r, s],
    }),
  });
  
  // Call 2: Unlock the song
  calls.push({
    to: MUSIC_STORE_ADDRESS,
    data: encodeFunctionData({
      abi: MusicStoreV2ABI,
      functionName: 'unlockSong',
      args: [BigInt(songId)],
    }),
  });
  
  return calls;
};