// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SimpleKaraokeV2
 * @notice Karaoke contract with credit system, song unlocking, and encrypted content support
 * @dev Builds on V0.6.0 features while adding encrypted content management
 */
contract SimpleKaraokeV2 is Ownable, ReentrancyGuard {
    // ============ State Variables ============
    
    /// @notice USDC token contract
    IERC20 public immutable usdcToken;
    
    /// @notice PKP address that signs grades
    address public pkpAddress;
    
    /// @notice Price for combo pack (100 voice + 10 song credits)
    uint256 public constant COMBO_PRICE = 3_000_000; // 3 USDC
    
    /// @notice Price for voice pack (50 credits)
    uint256 public constant VOICE_PACK_PRICE = 1_000_000; // 1 USDC
    
    /// @notice Price for song pack (5 credits)
    uint256 public constant SONG_PACK_PRICE = 2_000_000; // 2 USDC
    
    /// @notice Voice credits per session
    uint256 public constant CREDITS_PER_SESSION = 5;
    
    /// @notice Minimum grade (0-100)
    uint256 public constant MIN_GRADE = 0;
    
    /// @notice Maximum grade (0-100)
    uint256 public constant MAX_GRADE = 100;
    
    // ============ Structs ============
    
    struct Session {
        address user;
        uint256 songId;
        uint256 escrowAmount;
        uint256 creditsUsed;
        uint256 startTime;
        bool finalized;
    }
    
    struct SongMetadata {
        string encryptedMidiCid;     // IPFS CID of Lit-encrypted MIDI
        string encryptedLyricsCid;   // IPFS CID of Lit-encrypted lyrics
        bool isActive;
        uint256 totalPlays;
    }
    
    // ============ Storage ============
    
    /// @notice Voice credits per user
    mapping(address => uint256) public voiceCredits;
    
    /// @notice Song credits per user
    mapping(address => uint256) public songCredits;
    
    /// @notice Tracks which songs a user has unlocked
    mapping(address => mapping(uint256 => bool)) public hasUnlockedSong;
    
    /// @notice Active session per user
    mapping(address => bytes32) public activeUserSession;
    
    /// @notice Session data by hash
    mapping(bytes32 => Session) public sessions;
    
    /// @notice Song metadata with encrypted CIDs
    mapping(uint256 => SongMetadata) public songMetadata;
    
    /// @notice Used nonces for replay protection
    mapping(uint256 => bool) public usedNonces;
    
    // ============ Events ============
    
    event CreditsPurchased(address indexed user, uint256 voiceAmount, uint256 songAmount);
    event SongUnlocked(address indexed user, uint256 indexed songId);
    event SessionStarted(address indexed user, uint256 indexed songId, bytes32 sessionHash);
    event SessionEnded(address indexed user, uint256 grade, uint256 creditsUsed, uint256 creditsRefunded);
    event SongMetadataUpdated(uint256 indexed songId, string midiCid, string lyricsCid);
    
    // ============ Errors ============
    
    error InsufficientCredits();
    error SessionNotFound();
    error SessionAlreadyFinalized();
    error InvalidGrade();
    error InvalidSignature();
    error NonceAlreadyUsed();
    error SongNotActive();
    error AlreadyUnlocked();
    error ActiveSessionExists();
    error Unauthorized();
    
    // ============ Constructor ============
    
    constructor(address _usdcToken, address _pkpAddress) Ownable() {
        usdcToken = IERC20(_usdcToken);
        pkpAddress = _pkpAddress;
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Purchase combo pack (100 voice + 10 song credits)
     */
    function buyCombopack() external nonReentrant {
        require(usdcToken.transferFrom(msg.sender, address(this), COMBO_PRICE), "USDC transfer failed");
        
        voiceCredits[msg.sender] += 100;
        songCredits[msg.sender] += 10;
        
        emit CreditsPurchased(msg.sender, 100, 10);
    }
    
    /**
     * @notice Purchase voice credit pack (50 credits)
     */
    function buyVoicePack() external nonReentrant {
        require(usdcToken.transferFrom(msg.sender, address(this), VOICE_PACK_PRICE), "USDC transfer failed");
        
        voiceCredits[msg.sender] += 50;
        
        emit CreditsPurchased(msg.sender, 50, 0);
    }
    
    /**
     * @notice Purchase song credit pack (5 credits)
     */
    function buySongPack() external nonReentrant {
        require(usdcToken.transferFrom(msg.sender, address(this), SONG_PACK_PRICE), "USDC transfer failed");
        
        songCredits[msg.sender] += 5;
        
        emit CreditsPurchased(msg.sender, 0, 5);
    }
    
    /**
     * @notice Unlock a song with credits
     * @param songId The song to unlock
     */
    function unlockSong(uint256 songId) external {
        if (songCredits[msg.sender] == 0) revert InsufficientCredits();
        if (hasUnlockedSong[msg.sender][songId]) revert AlreadyUnlocked();
        if (!songMetadata[songId].isActive) revert SongNotActive();
        
        songCredits[msg.sender]--;
        hasUnlockedSong[msg.sender][songId] = true;
        songMetadata[songId].totalPlays++;
        
        emit SongUnlocked(msg.sender, songId);
    }
    
    /**
     * @notice Start a karaoke session
     * @param songId The song to sing
     */
    function startSession(uint256 songId) external {
        if (voiceCredits[msg.sender] < CREDITS_PER_SESSION) revert InsufficientCredits();
        if (!hasUnlockedSong[msg.sender][songId]) revert Unauthorized();
        if (activeUserSession[msg.sender] != bytes32(0)) revert ActiveSessionExists();
        
        // Create session hash
        bytes32 sessionHash = keccak256(abi.encodePacked(msg.sender, songId, block.timestamp));
        
        // Escrow credits
        voiceCredits[msg.sender] -= CREDITS_PER_SESSION;
        
        // Create session
        sessions[sessionHash] = Session({
            user: msg.sender,
            songId: songId,
            escrowAmount: CREDITS_PER_SESSION,
            creditsUsed: 0,
            startTime: block.timestamp,
            finalized: false
        });
        
        activeUserSession[msg.sender] = sessionHash;
        
        emit SessionStarted(msg.sender, songId, sessionHash);
    }
    
    /**
     * @notice End session with PKP-signed grade
     * @param creditsUsed Credits actually used
     * @param grade Performance grade (0-100)
     * @param nonce Unique nonce for replay protection
     * @param signature PKP signature
     */
    function endSession(
        uint256 creditsUsed,
        uint256 grade,
        uint256 nonce,
        bytes calldata signature
    ) external {
        bytes32 sessionHash = activeUserSession[msg.sender];
        if (sessionHash == bytes32(0)) revert SessionNotFound();
        
        Session storage session = sessions[sessionHash];
        if (session.finalized) revert SessionAlreadyFinalized();
        if (grade > MAX_GRADE) revert InvalidGrade();
        if (usedNonces[nonce]) revert NonceAlreadyUsed();
        
        // Verify PKP signature
        if (!_verifySignature(msg.sender, sessionHash, creditsUsed, grade, nonce, signature)) {
            revert InvalidSignature();
        }
        
        // Mark nonce as used
        usedNonces[nonce] = true;
        
        // Calculate refund
        uint256 refundAmount = 0;
        if (creditsUsed < session.escrowAmount) {
            refundAmount = session.escrowAmount - creditsUsed;
            voiceCredits[session.user] += refundAmount;
        }
        
        // Finalize session
        session.creditsUsed = creditsUsed;
        session.finalized = true;
        delete activeUserSession[msg.sender];
        
        emit SessionEnded(msg.sender, grade, creditsUsed, refundAmount);
    }
    
    /**
     * @notice Verify PKP signature (extracted to reduce stack depth)
     */
    function _verifySignature(
        address user,
        bytes32 sessionHash,
        uint256 creditsUsed,
        uint256 grade,
        uint256 nonce,
        bytes calldata signature
    ) private view returns (bool) {
        bytes32 message = keccak256(abi.encodePacked(
            user,
            sessionHash,
            creditsUsed,
            grade,
            nonce
        ));
        bytes32 ethSignedMessage = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            message
        ));
        
        return recoverSigner(ethSignedMessage, signature) == pkpAddress;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get user's credit balances
     */
    function getUserCredits(address user) external view returns (uint256 voice, uint256 song) {
        return (voiceCredits[user], songCredits[user]);
    }
    
    /**
     * @notice Get song metadata including encrypted CIDs
     */
    function getSongMetadata(uint256 songId) external view returns (
        string memory midiCid,
        string memory lyricsCid,
        bool isActive,
        uint256 totalPlays
    ) {
        SongMetadata memory metadata = songMetadata[songId];
        return (
            metadata.encryptedMidiCid,
            metadata.encryptedLyricsCid,
            metadata.isActive,
            metadata.totalPlays
        );
    }
    
    /**
     * @notice Check if user has an active session
     */
    function hasActiveSession(address user) external view returns (bool) {
        return activeUserSession[user] != bytes32(0);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set song metadata with encrypted content CIDs
     * @param songId The song ID
     * @param midiCid IPFS CID of encrypted MIDI
     * @param lyricsCid IPFS CID of encrypted lyrics
     */
    function setSongMetadata(
        uint256 songId,
        string calldata midiCid,
        string calldata lyricsCid
    ) external onlyOwner {
        songMetadata[songId] = SongMetadata({
            encryptedMidiCid: midiCid,
            encryptedLyricsCid: lyricsCid,
            isActive: true,
            totalPlays: songMetadata[songId].totalPlays
        });
        
        emit SongMetadataUpdated(songId, midiCid, lyricsCid);
    }
    
    /**
     * @notice Toggle song active status
     */
    function toggleSongActive(uint256 songId) external onlyOwner {
        songMetadata[songId].isActive = !songMetadata[songId].isActive;
    }
    
    /**
     * @notice Update PKP address
     */
    function setPkpAddress(address _pkpAddress) external onlyOwner {
        pkpAddress = _pkpAddress;
    }
    
    /**
     * @notice Withdraw USDC
     */
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdcToken.transfer(owner(), amount), "Transfer failed");
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Recover signer from signature
     */
    function recoverSigner(bytes32 messageHash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature v value");
        
        return ecrecover(messageHash, v, r, s);
    }
}