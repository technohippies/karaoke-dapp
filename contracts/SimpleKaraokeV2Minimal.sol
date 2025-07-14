// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SimpleKaraokeV2Minimal
 * @notice Minimal version - just unlock/session management
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
    
    mapping(address => uint256) public voiceCredits;
    mapping(address => uint256) public songCredits;
    mapping(address => mapping(uint256 => bool)) public hasUnlockedSong;
    mapping(address => bytes32) public activeUserSession;
    mapping(bytes32 => Session) public sessions;
    
    event CreditsPurchased(address indexed user, uint256 voiceAmount, uint256 songAmount);
    event SongUnlocked(address indexed user, uint256 indexed songId);
    event SessionStarted(address indexed user, uint256 indexed songId, bytes32 sessionHash);
    event SessionEnded(address indexed user, uint256 grade, uint256 creditsUsed, uint256 creditsRefunded);
    
    error InsufficientCredits();
    error SessionNotFound();
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
    
    // Song management - SIMPLIFIED (no songMetadata check)
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
    
    // Simple end session (no signature verification for now)
    function endSession(uint256 creditsUsed, uint256 grade) external {
        bytes32 sessionHash = activeUserSession[msg.sender];
        if (sessionHash == bytes32(0)) revert SessionNotFound();
        
        Session storage session = sessions[sessionHash];
        if (session.finalized) revert SessionNotFound();
        
        uint256 refundAmount = session.escrowAmount > creditsUsed ? session.escrowAmount - creditsUsed : 0;
        if (refundAmount > 0) {
            voiceCredits[msg.sender] += refundAmount;
        }
        
        session.creditsUsed = creditsUsed;
        session.finalized = true;
        delete activeUserSession[msg.sender];
        
        emit SessionEnded(msg.sender, grade, creditsUsed, refundAmount);
    }
    
    function setPkpAddress(address _pkpAddress) external onlyOwner {
        pkpAddress = _pkpAddress;
    }
    
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdcToken.transfer(owner(), amount), "USDC transfer failed");
    }
}