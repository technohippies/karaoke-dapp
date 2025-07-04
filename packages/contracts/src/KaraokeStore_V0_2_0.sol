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
 * @title KaraokeStore_V0_2_0
 * @notice Manages song purchases and karaoke credits with USDC payment
 * @dev Version 0.2.0 - Added combo pack purchases for better UX
 * @dev Deployed on Base network with Porto wallet support
 * @custom:version 0.2.0
 */
contract KaraokeStore_V0_2_0 is Ownable {
    
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
    event ComboPackPurchased(address indexed buyer, uint256 songCredits, uint256 voiceCredits, uint256 totalPaid); // NEW in V0.2.0
    
    constructor(address _usdcAddress, address _litPkpAddress) Ownable(msg.sender) {
        USDC = IUSDC(_usdcAddress);
        LIT_PKP_ADDRESS = _litPkpAddress;
    }
    
    // ============ COMBO PURCHASES (NEW IN V0.2.0) ============
    
    /**
     * @notice Buy both song and voice credits in one transaction with permit
     * @dev Requires only one approval, splits payment to appropriate addresses
     */
    function buyComboPackWithPermit(
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        uint256 totalPrice = SONG_PACK_PRICE + VOICE_PACK_PRICE;
        
        // Single permit for total amount
        USDC.permit(msg.sender, address(this), totalPrice, deadline, v, r, s);
        
        // Transfer total from buyer
        require(USDC.transferFrom(msg.sender, address(this), totalPrice), "Transfer failed");
        
        // Split payments to respective revenue addresses
        require(USDC.transfer(MUSIC_SPLITS_ADDRESS, SONG_PACK_PRICE), "Music forward failed");
        require(USDC.transfer(VOICE_REVENUE_ADDRESS, VOICE_PACK_PRICE), "Voice forward failed");
        
        // Grant both types of credits
        creditBalance[msg.sender] += CREDITS_PER_PACK;
        voiceCredits[msg.sender] += VOICE_CREDITS_PER_PACK;
        
        // Emit events
        emit CreditsPurchased(msg.sender, CREDITS_PER_PACK, SONG_PACK_PRICE);
        emit VoiceCreditsAdded(msg.sender, VOICE_CREDITS_PER_PACK, VOICE_PACK_PRICE);
        emit ComboPackPurchased(msg.sender, CREDITS_PER_PACK, VOICE_CREDITS_PER_PACK, totalPrice);
    }
    
    /**
     * @notice Buy both song and voice credits with traditional approval
     * @dev Requires only one approval, splits payment to appropriate addresses
     */
    function buyCombopack() external {
        uint256 totalPrice = SONG_PACK_PRICE + VOICE_PACK_PRICE;
        
        // Transfer total from buyer to contract
        require(USDC.transferFrom(msg.sender, address(this), totalPrice), "Transfer failed");
        
        // Split payments to respective revenue addresses
        require(USDC.transfer(MUSIC_SPLITS_ADDRESS, SONG_PACK_PRICE), "Music forward failed");
        require(USDC.transfer(VOICE_REVENUE_ADDRESS, VOICE_PACK_PRICE), "Voice forward failed");
        
        // Grant both types of credits
        creditBalance[msg.sender] += CREDITS_PER_PACK;
        voiceCredits[msg.sender] += VOICE_CREDITS_PER_PACK;
        
        // Emit events
        emit CreditsPurchased(msg.sender, CREDITS_PER_PACK, SONG_PACK_PRICE);
        emit VoiceCreditsAdded(msg.sender, VOICE_CREDITS_PER_PACK, VOICE_PACK_PRICE);
        emit ComboPackPurchased(msg.sender, CREDITS_PER_PACK, VOICE_CREDITS_PER_PACK, totalPrice);
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
    
    /**
     * @notice Get combo pack price (NEW in V0.2.0)
     */
    function getComboPackPrice() external pure returns (uint256) {
        return SONG_PACK_PRICE + VOICE_PACK_PRICE;
    }
}