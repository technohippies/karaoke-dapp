import { useSendCalls, useWaitForCallsStatus } from 'wagmi';
import { signTypedData } from '@wagmi/core';
import { wagmiConfig } from '../wagmi';
import { prepareBundledPurchaseCalls, createBundledCalls } from '../machines/song/bundled-purchase.service';
import { useState, useCallback } from 'react';
import type { SongContext } from '../machines/types';

export function useBundledPurchase() {
  const { sendCalls, data, isPending, error } = useSendCalls();
  const [isPreparingCalls, setIsPreparingCalls] = useState(false);
  
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed 
  } = useWaitForCallsStatus({
    id: data?.id,
  });
  
  const executeBundledPurchase = useCallback(async (context: SongContext) => {
    if (!context.userAddress || !context.songId) {
      throw new Error('Missing required context');
    }
    
    try {
      setIsPreparingCalls(true);
      console.log('🚀 Starting bundled purchase flow...');
      
      // Prepare the calls
      const preparedData = await prepareBundledPurchaseCalls({ input: context });
      
      if (!preparedData.needsPermit) {
        // User has credits, just unlock
        console.log('📦 Sending unlock call...');
        await sendCalls({
          calls: preparedData.calls!,
        });
        return;
      }
      
      // User needs to buy - get permit signature
      console.log('🖊️ Requesting permit signature...');
      const signature = await signTypedData(wagmiConfig, {
        domain: preparedData.permitData!.domain,
        types: preparedData.permitData!.types,
        primaryType: preparedData.permitData!.primaryType,
        message: preparedData.permitData!.message,
      });
      
      // Create the bundled calls
      const calls = createBundledCalls(
        signature,
        preparedData.functionName!,
        preparedData.deadline!,
        preparedData.songId!
      );
      
      console.log('📦 Sending bundled calls (purchase + unlock)...');
      
      // Send all calls in one batch!
      await sendCalls({
        calls,
      });
      
      console.log('✅ Bundled purchase initiated!');
    } catch (err) {
      console.error('❌ Bundled purchase error:', err);
      throw err;
    } finally {
      setIsPreparingCalls(false);
    }
  }, [sendCalls]);
  
  return {
    executeBundledPurchase,
    isPending: isPending || isPreparingCalls,
    isConfirming,
    isConfirmed,
    error,
    data,
  };
}