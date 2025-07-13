# Nonce Comparison Test Results

## Test Overview
Tested the comparison between fixed nonce (1234567890) and Date.now() nonce in Lit Actions signing.

## Key Findings

### Console Output from Lit Action:
```
Comparing nonce approaches...
Session validated
Fixed nonce: 1234567890 Type: number
Date.now() nonce: 1752347206408 Type: number
Date.now() > Number.MAX_SAFE_INTEGER? false
Message hash (fixed): 0x37968d9fef20b0d8c6da583519a57c98b12a16134d5102bb6dd1d33dbcefec20
Message hash (date): 0x5c8d1457f3a6f380f040c75d5d0084eb043097016625776a5c7a29c70e025e23
toSignArray (fixed) length: 32
toSignArray (date) length: 32
Arrays equal length? true
First 5 bytes (fixed): [ 55, 150, 141, 159, 239 ]
First 5 bytes (date): [ 92, 141, 20, 87, 243 ]
Signing with FIXED nonce...
SUCCESS: Fixed nonce signed!
Signing with DATE nonce...
FAILED: Date nonce error: invalid_argument
```

## Analysis

1. **Type Verification**: Both nonces are properly typed as `number` in JavaScript
2. **Value Range**: Date.now() value (1752347206408) is well within JavaScript's Number.MAX_SAFE_INTEGER
3. **Hash Generation**: Both approaches successfully generate valid message hashes
4. **Array Conversion**: Both produce valid 32-byte arrays for signing

## Critical Finding

**Fixed nonce (1234567890)**: ✅ Signs successfully
**Date.now() nonce (1752347206408)**: ❌ Fails with `invalid_argument` error

## Conclusion

The issue appears to be specific to how Lit Actions handles larger numeric values in the signing process, even though:
- The values are within JavaScript's safe integer range
- The hashing and array conversion work correctly
- The only difference is the magnitude of the number

This confirms that using Date.now() as a nonce causes signing failures in Lit Actions, despite being a valid number type and within safe bounds.

## Recommendation

Use alternative nonce generation methods that produce smaller values, such as:
- Fixed incremental counters
- Modulo operations on timestamps (e.g., `Date.now() % 1000000`)
- Random numbers within a smaller range