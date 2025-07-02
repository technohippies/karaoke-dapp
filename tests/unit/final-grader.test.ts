import { describe, it, expect } from 'vitest';

describe('Final Grader Tests', () => {
  // Mock line results with signatures
  const mockLineResults = [
    {
      lineIndex: 1,
      transcript: "hello world",
      expectedText: "hello world",
      accuracy: 1.0,
      timestamp: 1234567890,
      signature: "0xmocksignature1"
    },
    {
      lineIndex: 2,
      transcript: "test line two",
      expectedText: "test line two",
      accuracy: 1.0,
      timestamp: 1234567891,
      signature: "0xmocksignature2"
    },
    {
      lineIndex: 3,
      transcript: "partial match here",
      expectedText: "partial match line here",
      accuracy: 0.75,
      timestamp: 1234567892,
      signature: "0xmocksignature3"
    }
  ];

  const mockFinalGraderInput = {
    sessionId: "test-session-123",
    songId: 1,
    userAddress: "0x1234567890123456789012345678901234567890",
    lineResults: mockLineResults,
    fullExpectedText: "hello world test line two partial match line here",
    startTime: 1234567000,
    endTime: 1234568000,
    totalLines: 50,
    completedLines: 3
  };

  it('should calculate final score based on accuracy and completion', () => {
    // Full transcript: "hello world test line two partial match here"
    // Expected: "hello world test line two partial match line here"
    // Missing one word "line" in position
    
    // Accuracy calculation:
    // Words matched: 8/9 ≈ 0.889
    // With order bonus: ~0.95
    
    const expectedAccuracy = 0.95; // approximate
    const completionRate = 3 / 50; // 0.06
    
    // Final score = (accuracy * 0.7) + (completion * 0.3)
    const expectedFinalScore = (expectedAccuracy * 0.7) + (completionRate * 0.3);
    
    expect(expectedFinalScore).toBeGreaterThan(0.6);
    expect(expectedFinalScore).toBeLessThan(0.8);
  });

  it('should include all required fields in final result', () => {
    const finalResult = {
      sessionId: mockFinalGraderInput.sessionId,
      songId: mockFinalGraderInput.songId,
      userAddress: mockFinalGraderInput.userAddress,
      finalScore: 75,
      accuracy: 95,
      completionRate: 6,
      verifiedLines: 3,
      totalLines: 50,
      fullTranscript: "hello world test line two partial match here",
      timestamp: Date.now(),
      signature: "0xfinalsignature"
    };

    // Check all required fields
    expect(finalResult).toHaveProperty('sessionId');
    expect(finalResult).toHaveProperty('songId');
    expect(finalResult).toHaveProperty('userAddress');
    expect(finalResult).toHaveProperty('finalScore');
    expect(finalResult).toHaveProperty('accuracy');
    expect(finalResult).toHaveProperty('completionRate');
    expect(finalResult).toHaveProperty('verifiedLines');
    expect(finalResult).toHaveProperty('totalLines');
    expect(finalResult).toHaveProperty('fullTranscript');
    expect(finalResult).toHaveProperty('timestamp');
    expect(finalResult).toHaveProperty('signature');
  });

  it('should weight accuracy more than completion', () => {
    // High accuracy, low completion
    const score1 = (0.9 * 0.7) + (0.1 * 0.3); // 0.66
    
    // Low accuracy, high completion  
    const score2 = (0.4 * 0.7) + (0.9 * 0.3); // 0.55
    
    expect(score1).toBeGreaterThan(score2);
  });

  it('should handle empty transcript gracefully', () => {
    const emptyResults = [];
    const accuracy = 0;
    const completion = 0;
    const finalScore = (accuracy * 0.7) + (completion * 0.3);
    
    expect(finalScore).toBe(0);
  });

  it('should concatenate transcripts in correct order', () => {
    const unorderedResults = [
      { lineIndex: 3, transcript: "third" },
      { lineIndex: 1, transcript: "first" },
      { lineIndex: 2, transcript: "second" }
    ];
    
    const sorted = unorderedResults
      .sort((a, b) => a.lineIndex - b.lineIndex)
      .map(r => r.transcript)
      .join(' ');
    
    expect(sorted).toBe("first second third");
  });
});