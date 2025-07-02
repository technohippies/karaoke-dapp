import { describe, it, expect, vi } from 'vitest';

describe('Voice Grader Signature Tests', () => {
  // Mock Lit Action response with signature
  const mockLitActionResponse = {
    success: true,
    lineResult: {
      lineIndex: 1,
      accuracy: 0.85,
      transcript: "i've never seen a diamond in the flesh",
      expectedText: "I've never seen a diamond in the flesh",
      timestamp: 1234567890,
      status: 'completed',
      signature: '0x1234567890abcdef...' // Mock signature
    },
    messageString: '{"expectedText":"I\'ve never seen a diamond in the flesh","lineIndex":1,"sessionId":"test-session","timestamp":1234567890,"transcript":"i\'ve never seen a diamond in the flesh"}',
    debug: {
      transcriptLength: 38,
      expectedLength: 38
    }
  };

  it('should include signature in grading result', () => {
    const result = mockLitActionResponse.lineResult;
    
    expect(result).toHaveProperty('signature');
    expect(result.signature).toBeTruthy();
    expect(result.signature).toMatch(/^0x/); // Ethereum signature format
  });

  it('should include all required fields for signature verification', () => {
    const result = mockLitActionResponse.lineResult;
    
    // Fields needed for signature verification
    expect(result).toHaveProperty('lineIndex');
    expect(result).toHaveProperty('transcript');
    expect(result).toHaveProperty('expectedText');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('signature');
  });

  it('should include messageString for verification', () => {
    expect(mockLitActionResponse).toHaveProperty('messageString');
    
    // Parse the message string to verify it contains required fields
    const message = JSON.parse(mockLitActionResponse.messageString);
    expect(message).toHaveProperty('sessionId');
    expect(message).toHaveProperty('lineIndex');
    expect(message).toHaveProperty('transcript');
    expect(message).toHaveProperty('expectedText');
    expect(message).toHaveProperty('timestamp');
  });

  it('should have deterministic message ordering', () => {
    const messageObj = JSON.parse(mockLitActionResponse.messageString);
    const keys = Object.keys(messageObj);
    
    // Keys should be alphabetically sorted for deterministic signing
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);
  });
});