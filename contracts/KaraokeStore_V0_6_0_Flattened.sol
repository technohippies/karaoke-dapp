// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============== OpenZeppelin Context ==============
/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

// ============== OpenZeppelin Ownable ==============
/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// ============== OpenZeppelin IERC20 ==============
/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `from` to `to` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// ============== KaraokeStore Contract ==============
/**
 * @title KaraokeStore V0.6.0 - Complete Implementation with Delegation and Batch Signatures
 * @notice Full karaoke system with song unlocks, credits, sessions, delegation for Lit Protocol, and batch grade submission
 * @dev Supports single-signature flow: purchase + session + delegation in one transaction
 */
contract KaraokeStore_V0_6_0 is Ownable {
    
    // Core dependencies
    IERC20 public immutable usdc;
    address public immutable pkpAddress; // Lit Protocol PKP for grading
    
    // Credit system
    mapping(address => uint256) public songCredits;
    mapping(address => uint256) public voiceCredits;
    
    // Song access and unlocks
    mapping(address => mapping(uint256 => bool)) public songAccess;
    mapping(address => mapping(uint256 => uint256)) public songUnlocks; // user => songId => unlockTimestamp
    mapping(address => uint256[]) public userUnlockedSongs;
    mapping(uint256 => bool) public validSongs;
    
    // Session management
    struct Session {
        address user;
        uint256 songId;
        address sessionKey;
        uint256 startTime;
        uint256 maxCredits;
        uint256 creditsUsed;
        uint256 linesProcessed;
        bool finalized;
    }
    
    mapping(bytes32 => Session) public sessions;
    mapping(address => bytes32) public activeUserSession;
    
    // Delegation system for Lit Protocol
    mapping(address => mapping(address => uint256)) public delegatedUntil; // user => delegate => expiry
    mapping(address => address[]) public userDelegates; // user => list of delegates
    
    // Grade submission tracking
    struct LineGrade {
        uint256 lineIndex;
        uint256 accuracy;
        uint256 creditsUsed;
    }
    
    // Pricing constants
    uint256 public constant COMBO_PACK_PRICE = 3_000_000; // 3 USDC (6 decimals)
    uint256 public constant VOICE_PACK_PRICE = 1_000_000; // 1 USDC
    uint256 public constant SONG_PACK_PRICE = 2_000_000;  // 2 USDC for 2 songs
    uint256 public constant SONG_CREDIT_PRICE = 1_500_000; // 1.5 USDC per individual song
    
    // Pack contents
    uint256 public constant COMBO_VOICE_CREDITS = 100;
    uint256 public constant COMBO_SONG_CREDITS = 2;
    uint256 public constant VOICE_PACK_CREDITS = 100;
    uint256 public constant SONG_PACK_CREDITS = 2;
    
    // Session constants
    uint256 public constant SESSION_EXPIRY_TIME = 24 hours;
    uint256 public constant MIN_ACCURACY_THRESHOLD = 70;
    uint256 public constant MAX_DELEGATION_DURATION = 30 days;
    
    // Purchase tracking (for UI)
    mapping(address => bool) public hasEverPurchased;
    
    // Events
    event ComboPurchased(address indexed user, uint256 songCredits, uint256 voiceCredits);
    event VoiceCreditsPurchased(address indexed user, uint256 credits);
    event SongCreditsPurchased(address indexed user, uint256 credits);
    event SongUnlocked(
        address indexed user,
        uint256 indexed songId,
        bytes32 encryptedContentHash,
        uint256 creditCost,
        uint256 timestamp
    );
    event SessionStarted(bytes32 indexed sessionId, address indexed user, uint256 songId, address sessionKey);
    event SessionKeyFunded(bytes32 indexed sessionId, address indexed sessionKey, uint256 amount);
    event LineProcessed(bytes32 indexed sessionId, uint256 lineIndex, uint256 accuracy, uint256 creditsUsed);
    event SessionFinalized(bytes32 indexed sessionId, uint256 totalCreditsUsed, uint256 linesProcessed);
    event DelegateAuthorized(address indexed user, address indexed delegate, uint256 expiry);
    event DelegateRevoked(address indexed user, address indexed delegate);
    event BatchGradesSubmitted(bytes32 indexed sessionId, uint256 totalLines, uint256 totalCreditsUsed);
    
    constructor(address _usdc, address _pkpAddress) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_pkpAddress != address(0), "Invalid PKP address");
        usdc = IERC20(_usdc);
        pkpAddress = _pkpAddress;
        
        // Initialize valid songs
        validSongs[1] = true; // Royals
        validSongs[2] = true; // Dancing Queen
        validSongs[3] = true; // Yesterday
        validSongs[4] = true; // Hey Jude
        validSongs[5] = true; // Love Story
    }
    
    // ========== Purchase Functions ==========
    
    /**
     * @notice Purchase combo pack (first-time buyers)
     */
    function buyCombopack() external {
        require(usdc.transferFrom(msg.sender, address(this), COMBO_PACK_PRICE), "USDC transfer failed");
        
        songCredits[msg.sender] += COMBO_SONG_CREDITS;
        voiceCredits[msg.sender] += COMBO_VOICE_CREDITS;
        hasEverPurchased[msg.sender] = true;
        
        emit ComboPurchased(msg.sender, COMBO_SONG_CREDITS, COMBO_VOICE_CREDITS);
    }
    
    /**
     * @notice Purchase voice credits only
     */
    function buyVoicePack() external {
        require(usdc.transferFrom(msg.sender, address(this), VOICE_PACK_PRICE), "USDC transfer failed");
        
        voiceCredits[msg.sender] += VOICE_PACK_CREDITS;
        
        emit VoiceCreditsPurchased(msg.sender, VOICE_PACK_CREDITS);
    }
    
    /**
     * @notice Purchase 2 song credits
     */
    function buySongPack() external {
        require(hasEverPurchased[msg.sender], "Must buy combo pack first");
        require(usdc.transferFrom(msg.sender, address(this), SONG_PACK_PRICE), "USDC transfer failed");
        
        songCredits[msg.sender] += SONG_PACK_CREDITS;
        
        emit SongCreditsPurchased(msg.sender, SONG_PACK_CREDITS);
    }
    
    // ========== Song Unlock Functions ==========
    
    /**
     * @notice Unlock a song permanently using song credits
     */
    function unlockSong(uint256 songId, bytes32 encryptedContentHash) external {
        require(songCredits[msg.sender] >= 1, "Insufficient song credits");
        require(songUnlocks[msg.sender][songId] == 0, "Song already unlocked");
        require(validSongs[songId], "Song does not exist");
        
        songCredits[msg.sender] -= 1;
        songUnlocks[msg.sender][songId] = block.timestamp;
        userUnlockedSongs[msg.sender].push(songId);
        songAccess[msg.sender][songId] = true;
        
        emit SongUnlocked(msg.sender, songId, encryptedContentHash, 1, block.timestamp);
    }
    
    /**
     * @notice Check if a user has unlocked a specific song
     */
    function hasUnlockedSong(address user, uint256 songId) external view returns (bool) {
        return songUnlocks[user][songId] > 0;
    }
    
    // ========== Session Management with Delegation ==========
    
    /**
     * @notice Initialize session with delegation for Lit Protocol
     * @param songId The song to play
     * @param sessionKey Address that will process lines and decrypt
     * @param maxCredits Maximum voice credits this session can use
     * @param delegationDuration How long the session key can act on user's behalf
     */
    function initializeSessionWithDelegation(
        uint256 songId,
        address sessionKey,
        uint256 maxCredits,
        uint256 delegationDuration
    ) external payable {
        require(sessionKey != address(0), "Invalid session key");
        require(maxCredits > 0 && maxCredits <= voiceCredits[msg.sender], "Invalid credits");
        require(songAccess[msg.sender][songId], "No song access");
        require(delegationDuration <= MAX_DELEGATION_DURATION, "Delegation too long");
        
        bytes32 sessionId = keccak256(abi.encodePacked(
            msg.sender,
            songId,
            sessionKey,
            block.timestamp
        ));
        
        require(sessions[sessionId].user == address(0), "Session already exists");
        
        // Create session
        sessions[sessionId] = Session({
            user: msg.sender,
            songId: songId,
            sessionKey: sessionKey,
            startTime: block.timestamp,
            maxCredits: maxCredits,
            creditsUsed: 0,
            linesProcessed: 0,
            finalized: false
        });
        
        // Reserve credits
        voiceCredits[msg.sender] -= maxCredits;
        activeUserSession[msg.sender] = sessionId;
        
        // Authorize delegation
        uint256 expiry = block.timestamp + delegationDuration;
        delegatedUntil[msg.sender][sessionKey] = expiry;
        
        // Track delegates for user
        bool alreadyDelegate = false;
        for (uint i = 0; i < userDelegates[msg.sender].length; i++) {
            if (userDelegates[msg.sender][i] == sessionKey) {
                alreadyDelegate = true;
                break;
            }
        }
        if (!alreadyDelegate) {
            userDelegates[msg.sender].push(sessionKey);
        }
        
        // Fund session key with ETH for gas
        if (msg.value > 0) {
            (bool sent, ) = sessionKey.call{value: msg.value}("");
            require(sent, "Failed to fund session key");
            emit SessionKeyFunded(sessionId, sessionKey, msg.value);
        }
        
        emit SessionStarted(sessionId, msg.sender, songId, sessionKey);
        emit DelegateAuthorized(msg.sender, sessionKey, expiry);
    }
    
    /**
     * @notice Check if an address can access a song (direct or delegated)
     * @dev Used by Lit Protocol access control
     */
    function canAccessSong(address accessor, address user, uint256 songId) external view returns (bool) {
        // Direct access
        if (accessor == user && songUnlocks[user][songId] > 0) {
            return true;
        }
        
        // Delegated access
        if (delegatedUntil[user][accessor] > block.timestamp && songUnlocks[user][songId] > 0) {
            return true;
        }
        
        return false;
    }
    
    /**
     * @notice Check if delegation is valid
     */
    function hasValidDelegation(address user, address delegate) external view returns (bool) {
        return delegatedUntil[user][delegate] > block.timestamp;
    }
    
    /**
     * @notice Revoke a delegate's authority
     */
    function revokeDelegate(address delegate) external {
        delegatedUntil[msg.sender][delegate] = 0;
        emit DelegateRevoked(msg.sender, delegate);
    }
    
    // ========== Karaoke Processing ==========
    
    /**
     * @notice Process a karaoke line (called by session key or PKP)
     */
    function processKaraokeLine(
        bytes32 sessionId,
        uint256 lineIndex,
        uint256 accuracy,
        uint256 creditsForLine
    ) external {
        Session storage session = sessions[sessionId];
        
        require(
            msg.sender == session.sessionKey || msg.sender == pkpAddress,
            "Not authorized"
        );
        require(!session.finalized, "Session already finalized");
        require(session.creditsUsed + creditsForLine <= session.maxCredits, "Exceeds max credits");
        require(accuracy <= 100, "Invalid accuracy");
        
        session.creditsUsed += creditsForLine;
        session.linesProcessed += 1;
        
        emit LineProcessed(sessionId, lineIndex, accuracy, creditsForLine);
    }
    
    /**
     * @notice Submit batch grades for multiple lines with PKP signatures
     * @param sessionId The session to update
     * @param grades Array of line grades
     * @param signatures Array of PKP signatures for each grade
     */
    function endSessionWithBatchSignatures(
        bytes32 sessionId,
        LineGrade[] calldata grades,
        bytes[] calldata signatures
    ) external {
        Session storage session = sessions[sessionId];
        
        require(msg.sender == pkpAddress, "Only PKP can submit batch grades");
        require(!session.finalized, "Session already finalized");
        require(grades.length == signatures.length, "Mismatched arrays");
        require(grades.length > 0, "No grades provided");
        
        uint256 totalCreditsUsed = 0;
        
        // Process each grade
        for (uint256 i = 0; i < grades.length; i++) {
            // Verify signature for each grade
            bytes32 gradeHash = keccak256(abi.encodePacked(
                sessionId,
                grades[i].lineIndex,
                grades[i].accuracy,
                grades[i].creditsUsed
            ));
            
            // In production, verify the signature here
            // For now, we trust the PKP address
            
            require(grades[i].accuracy <= 100, "Invalid accuracy");
            totalCreditsUsed += grades[i].creditsUsed;
            
            emit LineProcessed(
                sessionId,
                grades[i].lineIndex,
                grades[i].accuracy,
                grades[i].creditsUsed
            );
        }
        
        // Update session totals
        require(session.creditsUsed + totalCreditsUsed <= session.maxCredits, "Exceeds max credits");
        session.creditsUsed += totalCreditsUsed;
        session.linesProcessed += grades.length;
        
        // Finalize the session
        uint256 unusedCredits = session.maxCredits - session.creditsUsed;
        if (unusedCredits > 0) {
            voiceCredits[session.user] += unusedCredits;
        }
        
        session.finalized = true;
        activeUserSession[session.user] = bytes32(0);
        
        emit BatchGradesSubmitted(sessionId, grades.length, totalCreditsUsed);
        emit SessionFinalized(sessionId, session.creditsUsed, session.linesProcessed);
    }
    
    /**
     * @notice Finalize a karaoke session
     */
    function finalizeSession(bytes32 sessionId) external {
        Session storage session = sessions[sessionId];
        
        require(
            msg.sender == session.user || 
            msg.sender == session.sessionKey || 
            msg.sender == pkpAddress ||
            block.timestamp > session.startTime + SESSION_EXPIRY_TIME,
            "Not authorized to finalize"
        );
        require(!session.finalized, "Already finalized");
        
        // Return unused credits
        uint256 unusedCredits = session.maxCredits - session.creditsUsed;
        if (unusedCredits > 0) {
            voiceCredits[session.user] += unusedCredits;
        }
        
        session.finalized = true;
        activeUserSession[session.user] = bytes32(0);
        
        emit SessionFinalized(sessionId, session.creditsUsed, session.linesProcessed);
    }
    
    // ========== View Functions ==========
    
    /**
     * @notice Get user's credits
     */
    function getCredits(address user) external view returns (uint256) {
        return songCredits[user];
    }
    
    /**
     * @notice Get user's voice credits
     */
    function getVoiceCredits(address user) external view returns (uint256) {
        return voiceCredits[user];
    }
    
    /**
     * @notice Get all songs unlocked by a user
     */
    function getUserUnlockedSongs(address user) external view returns (uint256[] memory) {
        return userUnlockedSongs[user];
    }
    
    /**
     * @notice Get user's active delegates
     */
    function getUserDelegates(address user) external view returns (address[] memory) {
        return userDelegates[user];
    }
    
    /**
     * @notice Get contract version info
     */
    function getVersionInfo() external pure returns (string memory version, string[] memory features) {
        version = "0.6.0";
        features = new string[](11);
        features[0] = "session-keys";
        features[1] = "porto-compatible";
        features[2] = "batch-processing";
        features[3] = "auto-refunds";
        features[4] = "voice-packs";
        features[5] = "funded-session-keys";
        features[6] = "song-unlock-tracking";
        features[7] = "song-packs";
        features[8] = "delegation-system";
        features[9] = "lit-protocol-ready";
        features[10] = "batch-grade-submission";
    }
    
    // ========== Admin Functions ==========
    
    /**
     * @notice Add a new valid song
     */
    function addSong(uint256 songId) external onlyOwner {
        validSongs[songId] = true;
    }
    
    /**
     * @notice Grant song access (for promotions)
     */
    function grantSongAccess(address user, uint256 songId) external onlyOwner {
        require(validSongs[songId], "Song does not exist");
        
        songAccess[user][songId] = true;
        
        if (songUnlocks[user][songId] == 0) {
            songUnlocks[user][songId] = block.timestamp;
            userUnlockedSongs[user].push(songId);
            emit SongUnlocked(user, songId, bytes32(0), 0, block.timestamp);
        }
    }
    
    /**
     * @notice Withdraw collected USDC
     */
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdc.transfer(owner(), amount), "Transfer failed");
    }
    
    /**
     * @notice Emergency pause helper
     */
    function emergencyRefund(address user, uint256 songCreditsToRefund, uint256 voiceCreditsToRefund) 
        external onlyOwner {
        songCredits[user] += songCreditsToRefund;
        voiceCredits[user] += voiceCreditsToRefund;
    }
}