import { computePublicKey } from '@ethersproject/signing-key';

const UNCOMPRESSED_PKP_PUBLIC_KEY = '0x043a1a467808b48e40b0b4da67f75f15b09fe50c294f8aa664b70e51d16e76f973d30be74f3346f7f1ae551da35e93dae7cf5a8eb1ad5b7e3b443421cc078dc519';

// Compress the public key
const compressedPublicKey = computePublicKey(UNCOMPRESSED_PKP_PUBLIC_KEY, true);

console.log('Uncompressed PKP Public Key (130 chars):', UNCOMPRESSED_PKP_PUBLIC_KEY);
console.log('Uncompressed length:', UNCOMPRESSED_PKP_PUBLIC_KEY.length);
console.log('\nCompressed PKP Public Key (66 chars):', compressedPublicKey);
console.log('Compressed length:', compressedPublicKey.length);
console.log('\nStarts with:', compressedPublicKey.substring(0, 4));