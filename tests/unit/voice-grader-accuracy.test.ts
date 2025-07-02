import { describe, it, expect } from 'vitest';

// Copy of the improved calculateAccuracy function from voice-grader.js
function calculateAccuracy(transcript, expectedText) {
  // Normalize both texts
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  };
  
  const normalizedTranscript = normalizeText(transcript);
  const normalizedExpected = normalizeText(expectedText);
  
  // If exact match after normalization, perfect score
  if (normalizedTranscript === normalizedExpected) return 1.0;
  
  const transcriptWords = normalizedTranscript.split(' ').filter(w => w.length > 0);
  const expectedWords = normalizedExpected.split(' ').filter(w => w.length > 0);
  
  if (expectedWords.length === 0) return 0;
  if (transcriptWords.length === 0) return 0;
  
  // Simple approach: count how many expected words appear in transcript
  let matches = 0;
  const usedIndices = new Set();
  
  expectedWords.forEach((expectedWord) => {
    // Find this word in transcript (not already used)
    for (let i = 0; i < transcriptWords.length; i++) {
      if (!usedIndices.has(i) && transcriptWords[i] === expectedWord) {
        matches++;
        usedIndices.add(i);
        break;
      }
    }
  });
  
  // Base accuracy is matches / expected
  let accuracy = matches / expectedWords.length;
  
  // Bonus for correct order
  let inOrderCount = 0;
  let lastIndex = -1;
  expectedWords.forEach((expectedWord) => {
    const index = transcriptWords.indexOf(expectedWord);
    if (index > lastIndex) {
      inOrderCount++;
      lastIndex = index;
    }
  });
  
  // Order bonus (up to 20% boost if all words are in order)
  const orderBonus = (inOrderCount / expectedWords.length) * 0.2;
  accuracy = Math.min(1.0, accuracy + orderBonus);
  
  // Length penalty - penalize if transcript is too short or too long
  const lengthRatio = transcriptWords.length / expectedWords.length;
  if (lengthRatio < 0.5) {
    // Too short - likely missed a lot
    accuracy *= lengthRatio * 2;
  } else if (lengthRatio > 2.0) {
    // Too long - likely a lot of extra words
    accuracy *= (2.0 / lengthRatio);
  }
  
  return Math.min(1.0, Math.max(0, accuracy));
}

describe('Voice Grader Accuracy Tests', () => {
  it('should handle case differences gracefully', () => {
    const accuracy = calculateAccuracy(
      "and i'm not proud of my address",
      "And I'm not proud of my address"
    );
    expect(accuracy).toBe(1.0); // Perfect match after normalization
  });

  it('should handle punctuation differences', () => {
    const accuracy = calculateAccuracy(
      "in the torn up town no",
      "In the torn-up town, no post code envy"
    );
    // Gets 5/8 words (in, the, torn, town, no) = 0.625 base
    // Length ratio = 5/8 = 0.625, no extreme penalty
    // Order bonus applies since words are in order
    expect(accuracy).toBeGreaterThan(0.5);
    expect(accuracy).toBeLessThan(0.8);
  });

  it('should give partial credit for incomplete transcriptions', () => {
    const accuracy = calculateAccuracy(
      "fees and i'm not proud of my address",
      "And I'm not proud of my address"
    );
    // Gets 6/7 words (and, im, not, proud, of, my, address) = 0.857 base
    // Length ratio = 8/7 = 1.14, no penalty
    // Order bonus applies for words in order
    expect(accuracy).toBeGreaterThan(0.8);
    expect(accuracy).toBeLessThanOrEqual(1.0);
  });

  it('should handle exact matches', () => {
    const accuracy = calculateAccuracy(
      "I've never seen a diamond in the flesh",
      "I've never seen a diamond in the flesh"
    );
    expect(accuracy).toBe(1.0);
  });

  it('should handle empty transcript', () => {
    const accuracy = calculateAccuracy(
      "",
      "I've never seen a diamond in the flesh"
    );
    expect(accuracy).toBe(0);
  });

  it('should handle word order flexibility', () => {
    const accuracy = calculateAccuracy(
      "gold teeth every song's like",
      "every song's like gold teeth"
    );
    // All words present but wrong order, gets partial credit
    expect(accuracy).toBeGreaterThan(0.8); // Gets all words, with order bonus
    expect(accuracy).toBeLessThanOrEqual(1.0);
  });

  it('should penalize very short transcripts', () => {
    const accuracy = calculateAccuracy(
      "i cut",
      "I cut my teeth on wedding rings in the movies"
    );
    // Should get low score for only getting 2 out of 10 words
    expect(accuracy).toBeLessThan(0.3);
  });

  // Real examples from the karaoke grading
  it('should handle "in the torn-up town no" vs full line', () => {
    const accuracy = calculateAccuracy(
      "in the torn-up town no",
      "In the torn-up town, no post code envy"
    );
    // Should NOT be 0% - gets 5/8 words correct
    expect(accuracy).toBeGreaterThan(0.5);
    expect(accuracy).toBeLessThan(0.8);
  });

  it('should handle extra "the" in transcript', () => {
    const accuracy = calculateAccuracy(
      "i cut my teeth on the wedding rings in the movies",
      "I cut my teeth on wedding rings in the movies"
    );
    // Should NOT be 20% - gets 9/10 words correct, just extra "the"
    expect(accuracy).toBeGreaterThan(0.8);
  });
});