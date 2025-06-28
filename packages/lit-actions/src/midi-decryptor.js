/**
 * MIDI Decryptor Lit Action
 * Checks user access then decrypts MIDI files
 * MIDIs are encrypted with this action's access, not user access
 * 
 * jsParams expected:
 * - userAddress: wallet address of the user
 * - songId: ID of the song to decrypt
 * - encryptedMIDI: the encrypted MIDI data
 * - midiHash: hash for verification
 */

const MUSIC_STORE_ADDRESS = '<TO_BE_SET>'; // Will be set from deployment

(async () => {
  try {
    // jsParams properties are available as direct variables
    
    // 1. Verify user has purchased song access
    const hasAccess = await Lit.Actions.callContract({
      chain: "base-sepolia",
      to: MUSIC_STORE_ADDRESS,
      abi: [{
        "inputs": [
          {"name": "user", "type": "address"},
          {"name": "songId", "type": "uint256"}
        ],
        "name": "checkAccess",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
      }],
      functionName: "checkAccess",
      params: [userAddress, songId]
    });
    
    if (!hasAccess) {
      return Lit.Actions.setResponse({ 
        success: false, 
        error: "No access to this song" 
      });
    }
    
    // 2. Decrypt MIDI using Lit Action's own access
    const decryptedMIDI = await Lit.Actions.decryptAndCombine({
      accessControlConditions: [{
        contractAddress: '',
        standardContractType: '',
        chain: 'base-sepolia',
        method: '',
        parameters: [':currentActionIpfsId'],
        returnValueTest: {
          comparator: '=',
          value: '<MIDI_DECRYPTOR_ACTION_CID>' // Will be replaced after upload
        }
      }],
      ciphertext: encryptedMIDI,
      dataToEncryptHash: midiHash,
      authSig: null,
      chain: 'base-sepolia'
    });
    
    // 3. Return decrypted MIDI to authorized user
    Lit.Actions.setResponse({ 
      success: true,
      midi: decryptedMIDI,
      songId: songId,
      decryptedAt: Date.now()
    });
    
  } catch (error) {
    Lit.Actions.setResponse({ 
      success: false, 
      error: error.message 
    });
  }
})();