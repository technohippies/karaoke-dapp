import { fromPromise } from 'xstate';
import { encodeFunctionData, parseUnits } from 'viem';
import { privateKeyToAddress, generatePrivateKey } from 'viem/accounts';
import { KaraokeStoreV030ABI, CONTRACTS } from '@karaoke-dapp/contracts';
import { signPermit } from './permit-purchase.service';
import type { SongContext } from '../types';

const KARAOKE_CONTRACT = CONTRACTS.baseSepolia.karaokeStoreV030;

export const metamaskServices = {
  // Check if user has MetaMask smart account
  checkMetaMaskSmartAccount: fromPromise(async () => {
    try {
      const provider = window.ethereum as any;
      if (!provider?.isMetaMask) return false;
      
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (!accounts?.[0]) return false;
      
      const chainId = '0x14a34'; // Base Sepolia
      const capabilities = await provider.request({
        method: 'wallet_getCapabilities',
        params: [accounts[0], [chainId]]
      });
      
      const hasSmartAccount = capabilities?.[chainId]?.atomic?.status === 'supported';
      
      console.log('🦊 MetaMask smart account check:', {
        address: accounts[0],
        hasSmartAccount,
        capabilities: capabilities?.[chainId]
      });
      
      return hasSmartAccount;
    } catch (error) {
      console.error('Failed to check MetaMask smart account:', error);
      return false;
    }
  }),

  // Purchase with bundled session creation
  purchaseWithMetaMaskSession: fromPromise(async ({ 
    input 
  }: { 
    input: SongContext & { isNewUser?: boolean } 
  }) => {
    const { userAddress, songId, isNewUser } = input;
    
    if (!userAddress) {
      throw new Error('No user address');
    }

    console.log('🦊 Starting MetaMask bundled purchase:', {
      userAddress,
      songId,
      isNewUser
    });

    try {
      const provider = window.ethereum as any;
      const chainId = '0x14a34'; // Base Sepolia
      
      // Step 1: Generate session key
      const sessionPrivateKey = generatePrivateKey();
      const sessionAddress = privateKeyToAddress(sessionPrivateKey);
      
      console.log('🔑 Generated session key:', {
        sessionAddress,
        privateKeyLength: sessionPrivateKey.length
      });

      // Step 2: Get permit signature for USDC
      const priceInUSDC = parseUnits('3', 6); // $3 for combo pack
      const permitSig = await signPermit(userAddress, priceInUSDC);

      // Step 3: Prepare bundled calls
      const calls = [
        {
          // Call 1: Purchase combo pack with permit
          to: KARAOKE_CONTRACT,
          value: '0x0',
          data: encodeFunctionData({
            abi: KaraokeStoreV030ABI,
            functionName: 'buyComboPackWithPermit',
            args: [
              permitSig.deadline,
              permitSig.v,
              permitSig.r,
              permitSig.s
            ]
          })
        },
        {
          // Call 2: Initialize session for gasless karaoke
          to: KARAOKE_CONTRACT,
          value: '0x0',
          data: encodeFunctionData({
            abi: KaraokeStoreV030ABI,
            functionName: 'initializeSession',
            args: [
              BigInt(songId),
              sessionAddress as `0x${string}`,
              BigInt(100) // Max 100 voice credits for the session
            ]
          })
        }
      ];

      console.log('📦 Bundled calls prepared:', {
        numCalls: calls.length,
        contractAddress: KARAOKE_CONTRACT
      });

      // Step 4: Send bundled transaction
      const bundleId = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '2.0.0',
          chainId,
          from: userAddress,
          calls,
          atomicRequired: true // Both must succeed
        }]
      });

      console.log('🚀 Bundle submitted:', bundleId);

      // Step 5: Wait for confirmation
      let attempts = 0;
      let transactionHash = null;
      let sessionId = null;

      while (attempts < 60 && !transactionHash) { // 2 min timeout
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const status = await provider.request({
            method: 'wallet_getCallsStatus',
            params: [bundleId.id || bundleId]
          });

          console.log(`📊 Bundle status (attempt ${attempts + 1}):`, status);

          if (status?.status === 200 && status.receipts?.[0]) {
            transactionHash = status.receipts[0].transactionHash;
            
            // Extract session ID from the second transaction's logs
            if (status.receipts[1]?.logs?.length > 0) {
              // SessionStarted event should be in the logs
              const sessionStartedLog = status.receipts[1].logs[0];
              sessionId = sessionStartedLog.topics?.[1]; // First indexed param
            }
            
            break;
          }
        } catch (e) {
          console.log('Status check failed, retrying...');
        }
        
        attempts++;
      }

      if (!transactionHash) {
        throw new Error('Transaction timeout - check MetaMask activity');
      }

      console.log('✅ MetaMask bundled purchase successful:', {
        transactionHash,
        sessionId,
        sessionAddress
      });

      // Step 6: Store session key securely
      const sessionData = {
        sessionId: sessionId || `metamask-${Date.now()}`,
        sessionPrivateKey,
        sessionAddress,
        songId,
        maxCredits: 100,
        createdAt: Date.now()
      };

      // Store in localStorage (in production, use more secure storage)
      localStorage.setItem(
        `metamask-session-${songId}`,
        JSON.stringify(sessionData)
      );

      return {
        transactionHash,
        sessionId: sessionData.sessionId,
        sessionKeyAddress: sessionAddress,
        bundleId: bundleId.id || bundleId
      };

    } catch (error) {
      console.error('❌ MetaMask bundled purchase failed:', error);
      throw error;
    }
  }),

  // Process karaoke line with session key (gasless)
  processKaraokeLineWithSession: fromPromise(async ({ 
    input 
  }: { 
    input: {
      sessionId: string;
      lineIndex: number;
      accuracy: number;
      creditsForLine: number;
      songId: number;
    }
  }) => {
    const { sessionId, lineIndex, accuracy, creditsForLine, songId } = input;

    console.log('🎤 Processing karaoke line gaslessly:', {
      sessionId,
      lineIndex,
      creditsUsed: creditsForLine
    });

    try {
      // Get session data
      const sessionData = JSON.parse(
        localStorage.getItem(`metamask-session-${songId}`) || '{}'
      );

      if (!sessionData.sessionPrivateKey) {
        throw new Error('No session key found');
      }

      // TODO: Sign with session key and submit to relayer or direct to chain
      // For now, we'll use the user's wallet (not gasless yet)
      
      console.log('✅ Line processed (simulation)');
      
      return {
        success: true,
        lineIndex,
        creditsUsed: creditsForLine
      };

    } catch (error) {
      console.error('Failed to process line:', error);
      throw error;
    }
  }),

  // Finalize session when karaoke ends
  finalizeMetaMaskSession: fromPromise(async ({ 
    input 
  }: { 
    input: { sessionId: string; songId: number } 
  }) => {
    console.log('🏁 Finalizing MetaMask session:', input.sessionId);

    try {
      // Clean up session data
      localStorage.removeItem(`metamask-session-${input.songId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to finalize session:', error);
      throw error;
    }
  }),

  // Initialize session for users who already own songs
  initializeMetaMaskSessionForKaraoke: fromPromise(async ({ 
    input 
  }: { 
    input: SongContext 
  }) => {
    const { userAddress, songId } = input;
    
    if (!userAddress) {
      throw new Error('No user address');
    }

    console.log('🦊 Initializing MetaMask session for existing song owner:', {
      userAddress,
      songId
    });

    // Check voice credits but don't block if low
    try {
      const { readContract } = await import('@wagmi/core');
      const { wagmiConfig } = await import('../../wagmi');
      
      const voiceCredits = await readContract(wagmiConfig, {
        address: KARAOKE_CONTRACT,
        abi: KaraokeStoreV030ABI,
        functionName: 'getVoiceCredits',
        args: [userAddress as `0x${string}`],
      });
      
      console.log('💳 User voice credits:', voiceCredits);
      
      if (!voiceCredits || voiceCredits === 0n) {
        console.warn('⚠️ User has no voice credits, but proceeding with session initialization');
      }
    } catch (error) {
      console.error('Failed to check voice credits:', error);
    }

    try {
      const provider = window.ethereum as any;
      const chainId = '0x14a34'; // Base Sepolia
      
      // Step 1: Generate session key
      const sessionPrivateKey = generatePrivateKey();
      const sessionAddress = privateKeyToAddress(sessionPrivateKey);
      
      console.log('🔑 Generated session key for karaoke:', {
        sessionAddress,
        privateKeyLength: sessionPrivateKey.length
      });

      // Step 2: Initialize session on-chain
      const initSessionCall = {
        to: KARAOKE_CONTRACT as `0x${string}`,
        value: '0x0',
        data: encodeFunctionData({
          abi: KaraokeStoreV030ABI,
          functionName: 'initializeSession',
          args: [
            BigInt(songId),
            sessionAddress as `0x${string}`,
            BigInt(100) // Max 100 voice credits for the session
          ]
        }) as `0x${string}`
      };

      // Decode the function selector to verify we're calling the right function
      const functionSelector = initSessionCall.data.slice(0, 10);
      console.log('📦 Initializing session for gasless karaoke', {
        contract: KARAOKE_CONTRACT,
        songId,
        sessionAddress,
        maxCredits: 100,
        functionSelector,
        fullCallData: initSessionCall.data
      });

      // Send single transaction using wallet_sendCalls
      const bundleId = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '2.0.0',
          chainId,
          from: userAddress,
          calls: [initSessionCall],
          atomicRequired: true
        }]
      });

      console.log('🚀 Session initialization submitted:', bundleId);

      // Wait for confirmation
      let attempts = 0;
      let transactionHash = null;
      let sessionId = null;

      while (attempts < 60 && !transactionHash) { // 2 min timeout
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const status = await provider.request({
            method: 'wallet_getCallsStatus',
            params: [bundleId.id || bundleId]
          });

          console.log(`📊 Session init status (attempt ${attempts + 1}):`, status);

          // Check for error status
          if (status?.status === 500 || status?.status === 'error') {
            console.error('❌ Session initialization failed with full details:', {
              status: status,
              receipts: status?.receipts,
              error: status?.error,
              calls: status?.calls
            });
            
            // Try to extract more detailed error info
            const receipt = status?.receipts?.[0];
            if (receipt?.error) {
              console.error('Receipt error:', receipt.error);
            }
            if (receipt?.logs) {
              console.error('Receipt logs:', receipt.logs);
            }
            
            const errorMessage = status?.error?.message || receipt?.error?.message || 'Unknown error';
            throw new Error(`Session initialization failed: ${errorMessage}`);
          }

          if (status?.status === 200 && status.receipts?.[0]) {
            transactionHash = status.receipts[0].transactionHash;
            
            // Extract session ID from logs
            if (status.receipts[0]?.logs?.length > 0) {
              const sessionStartedLog = status.receipts[0].logs[0];
              sessionId = sessionStartedLog.topics?.[1];
            }
            
            break;
          }
        } catch (e) {
          console.log('Status check failed, retrying...');
        }
        
        attempts++;
      }

      if (!transactionHash) {
        throw new Error('Transaction timeout - check MetaMask activity');
      }

      console.log('✅ MetaMask session initialized for karaoke:', {
        transactionHash,
        sessionId,
        sessionAddress
      });

      // Store session key securely
      const sessionData = {
        sessionId: sessionId || `metamask-karaoke-${Date.now()}`,
        sessionPrivateKey,
        sessionAddress,
        songId,
        maxCredits: 100,
        createdAt: Date.now()
      };

      // Store in localStorage
      localStorage.setItem(
        `metamask-session-${songId}`,
        JSON.stringify(sessionData)
      );

      return {
        transactionHash,
        sessionId: sessionData.sessionId,
        sessionKeyAddress: sessionAddress,
        bundleId: bundleId.id || bundleId
      };

    } catch (error) {
      console.error('❌ Failed to initialize MetaMask session:', error);
      throw error;
    }
  })
};