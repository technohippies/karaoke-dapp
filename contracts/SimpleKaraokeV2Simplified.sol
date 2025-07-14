// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SimpleKaraokeV2
 * @notice Simplified version to avoid stack depth issues
 */
contract SimpleKaraokeV2 is Ownable, ReentrancyGuard {
    IERC20 public immutable usdcToken;
    address public pkpAddress;
    
    uint256 public constant COMBO_PRICE = 3_000_000; // 3 USDC
    uint256 public constant VOICE_PACK_PRICE = 1_000_000; // 1 USDC
    uint256 public constant SONG_PACK_PRICE = 2_000_000; // 2 USDC
    uint256 public constant CREDITS_PER_SESSION = 5;
    
    struct Session {
        address user;
        uint256 songId;
        uint256 escrowAmount;
        uint256 creditsUsed;
        uint256 startTime;
        bool finalized;
    }
    
    struct SongMetadata {
        string encryptedMidiCid;
        string encryptedLyricsCid;
        bool isActive;
    }
    
    mapping(address => uint256) public voiceCredits;
    mapping(address => uint256) public songCredits;
    mapping(address => mapping(uint256 => bool)) public hasUnlockedSong;
    mapping(address => bytes32) public activeUserSession;
    mapping(bytes32 => Session) public sessions;
    mapping(uint256 => SongMetadata) public songMetadata;
    mapping(uint256 => bool) public usedNonces;
    
    event CreditsPurchased(address indexed user, uint256 voiceAmount, uint256 songAmount);
    event SongUnlocked(address indexed user, uint256 indexed songId);
    event SessionStarted(address indexed user, uint256 indexed songId, bytes32 sessionHash);
    event SessionEnded(address indexed user, uint256 grade, uint256 creditsUsed, uint256 creditsRefunded);
    event SongMetadataUpdated(uint256 indexed songId, string midiCid, string lyricsCid);
    
    error InsufficientCredits();
    error SessionNotFound();
    error InvalidSignature();
    error NonceAlreadyUsed();
    error AlreadyUnlocked();
    error ActiveSessionExists();
    error Unauthorized();
    
    constructor(address _usdcToken, address _pkpAddress) Ownable() {
        usdcToken = IERC20(_usdcToken);
        pkpAddress = _pkpAddress;
    }
    
    // Credit purchases
    function buyCombopack() external nonReentrant {
        require(usdcToken.transferFrom(msg.sender, address(this), COMBO_PRICE), "USDC transfer failed");
        voiceCredits[msg.sender] += 100;
        songCredits[msg.sender] += 10;
        emit CreditsPurchased(msg.sender, 100, 10);
    }
    
    function buyVoicePack() external nonReentrant {
        require(usdcToken.transferFrom(msg.sender, address(this), VOICE_PACK_PRICE), "USDC transfer failed");
        voiceCredits[msg.sender] += 50;
        emit CreditsPurchased(msg.sender, 50, 0);
    }
    
    function buySongPack() external nonReentrant {
        require(usdcToken.transferFrom(msg.sender, address(this), SONG_PACK_PRICE), "USDC transfer failed");
        songCredits[msg.sender] += 5;
        emit CreditsPurchased(msg.sender, 0, 5);
    }
    
    // Song management
    function unlockSong(uint256 songId) external {
        if (songCredits[msg.sender] == 0) revert InsufficientCredits();
        if (hasUnlockedSong[msg.sender][songId]) revert AlreadyUnlocked();
        
        songCredits[msg.sender]--;
        hasUnlockedSong[msg.sender][songId] = true;
        emit SongUnlocked(msg.sender, songId);
    }
    
    // Session management
    function startSession(uint256 songId) external {
        if (voiceCredits[msg.sender] < CREDITS_PER_SESSION) revert InsufficientCredits();
        if (!hasUnlockedSong[msg.sender][songId]) revert Unauthorized();
        if (activeUserSession[msg.sender] != bytes32(0)) revert ActiveSessionExists();
        
        bytes32 sessionHash = keccak256(abi.encodePacked(msg.sender, songId, block.timestamp));
        voiceCredits[msg.sender] -= CREDITS_PER_SESSION;
        
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
    
    // Simplified end session to avoid stack depth
    function endSession(
        uint256 creditsUsed,
        uint256 grade,
        uint256 nonce,
        bytes calldata signature
    ) external {
        bytes32 sessionHash = activeUserSession[msg.sender];
        if (sessionHash == bytes32(0)) revert SessionNotFound();
        if (usedNonces[nonce]) revert NonceAlreadyUsed();
        
        // Verify signature
        bytes32 message = keccak256(abi.encodePacked(msg.sender, sessionHash, creditsUsed, grade, nonce));
        if (!verifySignature(message, signature)) revert InvalidSignature();
        
        Session storage session = sessions[sessionHash];
        usedNonces[nonce] = true;
        
        // Calculate refund
        uint256 refundAmount = 0;
        if (creditsUsed < session.escrowAmount) {
            refundAmount = session.escrowAmount - creditsUsed;
            voiceCredits[msg.sender] += refundAmount;
        }
        
        session.finalized = true;
        delete activeUserSession[msg.sender];
        
        emit SessionEnded(msg.sender, grade, creditsUsed, refundAmount);
    }
    
    function verifySignature(bytes32 message, bytes calldata signature) internal view returns (bool) {
        bytes32 ethSignedMessage = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));
        return recover(ethSignedMessage, signature) == pkpAddress;
    }
    
    function recover(bytes32 hash, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        
        return ecrecover(hash, v, r, s);
    }
    
    // Admin functions
    function setSongMetadata(uint256 songId, string calldata midiCid, string calldata lyricsCid) external onlyOwner {
        songMetadata[songId] = SongMetadata({
            encryptedMidiCid: midiCid,
            encryptedLyricsCid: lyricsCid,
            isActive: true
        });
        emit SongMetadataUpdated(songId, midiCid, lyricsCid);
    }
    
    function setPkpAddress(address _pkpAddress) external onlyOwner {
        pkpAddress = _pkpAddress;
    }
    
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdcToken.transfer(owner(), amount), "Transfer failed");
    }
    
    // View functions
    function getUserCredits(address user) external view returns (uint256 voice, uint256 song) {
        return (voiceCredits[user], songCredits[user]);
    }
}