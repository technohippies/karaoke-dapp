# Voice Credits Migration: Word-Based to Time-Based

## Overview
This document outlines the migration from word-based to time-based voice credits to align with Deepgram's actual pricing model.

## Current System (Word-Based)
- 1 credit per 100 words
- Inconsistent cost across songs (slow songs cost less despite same duration)
- No correlation with actual Deepgram charges

## New System (Time-Based)
- 1 credit per 30 seconds of audio
- Consistent and predictable pricing
- Directly correlates with Deepgram usage

## Pricing Model
- Deepgram Nova-2: ~$0.0043/minute
- User price: $0.01/credit (100 credits = $1)
- Margin: 1 credit covers 30 seconds, Deepgram costs ~$0.00215
- Profit margin: ~78% per credit

## Implementation Phases

### Phase 1: Basic Duration-Based Calculation ✅
- Updated `calculateCreditsNeeded()` to use song duration
- Added `calculateCreditsFromDuration()` helper
- Created constants file for configuration

### Phase 2: Service Integration ✅
- Updated `checkVoiceCredits` to prefer duration-based calculation
- Added fallback to database song duration
- Maintained backwards compatibility with lyrics-based calculation

### Phase 3: UI Updates ✅
- Show song duration in credit confirmation dialog
- Display credit-to-time ratio
- Better user understanding of costs

### Phase 4: Future Improvements (TODO)
1. **Actual Usage Tracking**
   - Track real Deepgram API duration per segment
   - Store in `segmentDurations` map in karaoke machine
   - Use for accurate post-session billing

2. **Smart Contract Updates**
   - Consider updating contract to store duration-based rates
   - Add method to adjust SECONDS_PER_CREDIT ratio

3. **Analytics Dashboard**
   - Track actual vs estimated duration
   - Monitor profit margins
   - Adjust pricing based on usage patterns

## Testing Checklist
- [ ] Verify credit calculation for various song durations
- [ ] Test UI displays correct duration and credits
- [ ] Confirm backwards compatibility with existing flows
- [ ] Check database song duration accuracy
- [ ] Validate credit deduction after sessions

## Rollback Plan
If issues arise, revert changes to `lyrics-parser.ts` and `services.ts` to restore word-based calculation.

## Migration Timeline
1. Deploy Phase 1-3 immediately
2. Monitor for 1 week
3. Implement actual usage tracking
4. Consider smart contract updates after validation