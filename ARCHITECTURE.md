Goal is to setup a karaoke dapp much like Duolingo, but user owned data model. I have another working version on Cloudflare, but it's highly centralized.

Stack:
- Tableland for song catalog (already deployed at songs_v5_8453_24:
id	isrc	iswc	title	artist	duration	stems	language	genius_id	lrclib_id	artwork_hash	
1	DEG320707560	T-000.000.001-0	Dancing Queen	ABBA	231	{"piano":"bafkreih52fqtmu2cny7arnw3uwljilpixii6iqefqr4d7k7sm3zksfl5ii"}	en	395791	974064	{"id":"ca44cb452ad50cf3e47a1c3ad30ebb15","ext":"jpg","sizes":{"t":"300x300x1","f":"600x600x1"}} -- this hash is an encrypted CID on AIOZ.network (IPFS CDN). After purchasing, the user can decrypt. This logic has been tricky. I can supply some examples but the code we tested was messy. Basically we need to encrypt with some type of Lit Protocol access condition based on the smart contract that we deployed
- Tableland for purchases (for MLC compliance) at purchases_v1_84532_117 (please check schema)
- Lit Action (with a Deepgram encrypted API key) on IPFS for grading line-by line audio. To keep track of voice credits, will use recall.network to store line-by-line usage during karaoke, and then batch query to Tableland(?) to decrement voice tokens? (need to fully hash out this architecture)
- Use idb in browser to keep track of SRS data and then let user save progress after doing karaoke + duolingo-y exercise questions (like "Say It Back", if they didn't say it correctly during karaoke). First time this is done, user needs to create their own Tableland tables, and writes should be encrypted with Lit Protocol, so they can read their data but the public can't (Tableland data is public, and support public API REST calls)
- Need to use an encrypted envelop or something with a Lit action to store SRS data in idb to ensure they don't tamper with their progress -- not exactly sure how that works


- Porto.sh for wallet: supports gas sponsorship etc. which we will offer new users, particularly for Table creation 
- use ts-fsrs for spaced repetition tracking
- get everything working on Base Sepolia first
- Turbo repo for web frontend (vite 7.0.0, React 19.1, tailwind 4.1, shadcn for aria compliance)
- Storybook (9.0.14) to ensure everything is correctly componentized. Remember, import { addons } from 'storybook/manager-api';
Importing from @storybook/core is explicitly NOT supported; it WILL break in a future version of storybook, very likely in a non-major version bump.
- Localized for Mandarin + Uyghur (RTL)
- Etherscore for streak tracking like Duolingo. Let users mint day 1, 3, 5, 10, 25 streaks. However this might require the team to approve the creation of the badges, so may need to wait on this, but have the data ready to be proven (Tableland SRS study data). Might just use our own ERC-721's intsead of deal with Etherscore. Minutia.
- Schemas? The goal is to create meaningful data for language learning tracking, so karaoke is at the word level, but ideally we do something like word-level tracking in the Tableland table.



- Smart contract for purchasing songs, as well as voice credits. Ideally need to use that free API for IP lookups in the Lit Action to then write to Tableland with the country code for MLC compliance -- royalties differ depending on their location. 
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IUSDC {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
}

/**
 * @title MusicStoreV2
 * @notice Manages song and voice token purchases with USDC payment (V2 with on-chain voice credits)
 * @dev Deployed on Base network with ENS support via Ownable
 * @dev Compatible with Enscribe for ENS naming
 */
contract MusicStoreV2 is Ownable {
    
    IUSDC public immutable USDC;
    
    // Revenue addresses
    address public constant MUSIC_SPLITS_ADDRESS = 0xb0120FfD0a4161b64F7ff0Ca9E3430ce0bfFe6d5;
    address public constant VOICE_REVENUE_ADDRESS = 0xB0902E6E8192b9a3391e91323a9943fdfd26Aef6;
    
    // Lit PKP address for voice session verification
    address public immutable LIT_PKP_ADDRESS;
    
    // User balances and access
    mapping(address => uint256) public creditBalance;
    mapping(address => mapping(uint256 => bool)) public hasSongAccess;
    
    // Voice credits (NEW in V2)
    mapping(address => uint256) public voiceCredits;
    
    // Session tracking to prevent double spending (NEW in V2)
    mapping(bytes32 => bool) public settledSessions;
    
    // PRODUCTION PRICING
    uint256 public constant SONG_PACK_PRICE = 2000000;  // $2 USDC (6 decimals)
    uint256 public constant CREDITS_PER_PACK = 2;       // 2 songs for $2
    uint256 public constant VOICE_PACK_PRICE = 1000000; // $1 USDC
    uint256 public constant VOICE_CREDITS_PER_PACK = 100; // 100 voice credits for $1
    
    // Events
    event CreditsPurchased(address indexed buyer, uint256 credits, uint256 paid);
    event SongUnlocked(address indexed user, uint256 indexed songId, uint256 creditsRemaining);
    event VoicePackPurchased(address indexed buyer, uint256 paid); // Kept for backwards compatibility
    event VoiceCreditsAdded(address indexed buyer, uint256 credits, uint256 paid); // NEW in V2
    event VoiceSessionSettled(address indexed user, bytes32 indexed sessionId, uint256 creditsUsed); // NEW in V2
    
    constructor(address _usdcAddress, address _litPkpAddress) Ownable(msg.sender) {
        USDC = IUSDC(_usdcAddress);
        LIT_PKP_ADDRESS = _litPkpAddress;
    }
    
    // ============ SONG PURCHASES ============
    
    /**
     * @notice Buy song credits with USDC permit (for Porto/gasless)
     */
    function buyCreditPackWithPermit(
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Permit allows Porto to do gasless approval
        USDC.permit(msg.sender, address(this), SONG_PACK_PRICE, deadline, v, r, s);
        
        // Transfer USDC from buyer
        require(USDC.transferFrom(msg.sender, address(this), SONG_PACK_PRICE), "Transfer failed");
        
        // Forward to music splits
        require(USDC.transfer(MUSIC_SPLITS_ADDRESS, SONG_PACK_PRICE), "Forward failed");
        
        // Grant credits
        creditBalance[msg.sender] += CREDITS_PER_PACK;
        
        emit CreditsPurchased(msg.sender, CREDITS_PER_PACK, SONG_PACK_PRICE);
    }
    
    /**
     * @notice Buy song credits with traditional approval
     */
    function buyCreditPack() external {
        require(USDC.transferFrom(msg.sender, MUSIC_SPLITS_ADDRESS, SONG_PACK_PRICE), "Transfer failed");
        
        creditBalance[msg.sender] += CREDITS_PER_PACK;
        
        emit CreditsPurchased(msg.sender, CREDITS_PER_PACK, SONG_PACK_PRICE);
    }
    
    // ============ VOICE PURCHASES (UPDATED IN V2) ============
    
    /**
     * @notice Buy voice credits with USDC permit (for Porto/gasless)
     * @dev V2: Credits now tracked on-chain
     */
    function buyVoicePackWithPermit(
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Permit for gasless approval
        USDC.permit(msg.sender, address(this), VOICE_PACK_PRICE, deadline, v, r, s);
        
        // Transfer USDC from buyer
        require(USDC.transferFrom(msg.sender, address(this), VOICE_PACK_PRICE), "Transfer failed");
        
        // Forward to voice revenue address
        require(USDC.transfer(VOICE_REVENUE_ADDRESS, VOICE_PACK_PRICE), "Forward failed");
        
        // V2: Add credits on-chain
        voiceCredits[msg.sender] += VOICE_CREDITS_PER_PACK;
        
        // Emit both events for backwards compatibility
        emit VoicePackPurchased(msg.sender, VOICE_PACK_PRICE);
        emit VoiceCreditsAdded(msg.sender, VOICE_CREDITS_PER_PACK, VOICE_PACK_PRICE);
    }
    
    /**
     * @notice Buy voice credits with traditional approval
     * @dev V2: Credits now tracked on-chain
     */
    function buyVoicePack() external {
        require(USDC.transferFrom(msg.sender, VOICE_REVENUE_ADDRESS, VOICE_PACK_PRICE), "Transfer failed");
        
        // V2: Add credits on-chain
        voiceCredits[msg.sender] += VOICE_CREDITS_PER_PACK;
        
        // Emit both events for backwards compatibility
        emit VoicePackPurchased(msg.sender, VOICE_PACK_PRICE);
        emit VoiceCreditsAdded(msg.sender, VOICE_CREDITS_PER_PACK, VOICE_PACK_PRICE);
    }
    
    // ============ VOICE CREDIT SETTLEMENT (NEW IN V2) ============
    
    /**
     * @notice Settle voice credits after a karaoke session
     * @dev Called after session completion with proof from Lit PKP
     * @param user The user who used voice credits
     * @param sessionId Unique session identifier (e.g., Recall bucket ID)
     * @param creditsUsed Number of credits used in the session
     * @param litSignature Signature from Lit PKP proving session validity
     */
    function settleVoiceSession(
        address user,
        bytes32 sessionId,
        uint256 creditsUsed,
        bytes memory litSignature
    ) external {
        // Prevent double spending
        require(!settledSessions[sessionId], "Session already settled");
        require(voiceCredits[user] >= creditsUsed, "Insufficient voice credits");
        
        // Verify the signature is from Lit PKP
        bytes32 message = keccak256(abi.encodePacked(user, sessionId, creditsUsed));
        bytes32 ethSignedMessage = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));
        address signer = ECDSA.recover(ethSignedMessage, litSignature);
        require(signer == LIT_PKP_ADDRESS, "Invalid Lit PKP signature");
        
        // Mark session as settled
        settledSessions[sessionId] = true;
        
        // Deduct credits
        voiceCredits[user] -= creditsUsed;
        
        emit VoiceSessionSettled(user, sessionId, creditsUsed);
    }
    
    // ============ SONG ACCESS ============
    
    /**
     * @notice Unlock a song using 1 credit
     */
    function unlockSong(uint256 songId) external {
        require(creditBalance[msg.sender] > 0, "No credits");
        require(!hasSongAccess[msg.sender][songId], "Already unlocked");
        
        creditBalance[msg.sender]--;
        hasSongAccess[msg.sender][songId] = true;
        
        emit SongUnlocked(msg.sender, songId, creditBalance[msg.sender]);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Check if a user has access to a song
     */
    function checkAccess(address user, uint256 songId) external view returns (bool) {
        return hasSongAccess[user][songId];
    }
    
    /**
     * @notice Get user's song credit balance
     */
    function getCredits(address user) external view returns (uint256) {
        return creditBalance[user];
    }
    
    /**
     * @notice Get user's voice credit balance (NEW in V2)
     */
    function getVoiceCredits(address user) external view returns (uint256) {
        return voiceCredits[user];
    }
    
    /**
     * @notice Batch check multiple songs
     */
    function checkMultipleAccess(address user, uint256[] calldata songIds) external view returns (bool[] memory) {
        bool[] memory access = new bool[](songIds.length);
        for (uint256 i = 0; i < songIds.length; i++) {
            access[i] = hasSongAccess[user][songIds[i]];
        }
        return access;
    }
    
    /**
     * @notice Check if a session has been settled (NEW in V2)
     */
    function isSessionSettled(bytes32 sessionId) external view returns (bool) {
        return settledSessions[sessionId];
    }
}