// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract KaraokeSchoolV2 is Initializable, OwnableUpgradeable {
    IERC20 public immutable usdcToken;
    address public immutable splitsContract;
    
    uint256 public constant COMBO_PRICE = 7_000_000; // 7 USDC (6 decimals)
    uint256 public constant VOICE_PACK_PRICE = 4_000_000; // 4 USDC
    uint256 public constant SONG_PACK_PRICE = 3_000_000; // 3 USDC
    
    mapping(address => uint256) public voiceCredits;
    mapping(address => uint256) public songCredits;
    mapping(address => mapping(uint256 => bool)) public hasUnlockedSong;
    mapping(address => string) public userCountry;
    
    event CreditsPurchased(address indexed user, uint256 voiceAmount, uint256 songAmount);
    event SongUnlocked(address indexed user, uint256 indexed songId);
    event KaraokeStarted(address indexed user, uint256 indexed songId);
    event ExerciseStarted(address indexed user, uint256 exerciseCount);
    event PurchaseWithCountry(address indexed user, string country, uint256 usdcAmount, string packType);
    
    error InsufficientCredits();
    error AlreadyUnlocked();
    error SongNotUnlocked();
    error Unauthorized();
    error InvalidCountryCode();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address _usdcToken, 
        address _splitsContract
    ) {
        usdcToken = IERC20(_usdcToken);
        splitsContract = _splitsContract;
        _disableInitializers();
    }

    function initialize(address initialOwner) external initializer {
        __Ownable_init(initialOwner);
    }
    
    function buyCombopack(string calldata country) external {
        if (bytes(country).length != 2) revert InvalidCountryCode();
        
        // Transfer directly to splits contract
        require(usdcToken.transferFrom(msg.sender, splitsContract, COMBO_PRICE), "Transfer failed");
        
        // Store country if first purchase
        if (bytes(userCountry[msg.sender]).length == 0) {
            userCountry[msg.sender] = country;
        }
        
        voiceCredits[msg.sender] += 100;
        songCredits[msg.sender] += 10;
        
        emit CreditsPurchased(msg.sender, 100, 10);
        emit PurchaseWithCountry(msg.sender, country, COMBO_PRICE, "combo");
    }
    
    function buyVoicePack(string calldata country) external {
        if (bytes(country).length != 2) revert InvalidCountryCode();
        
        require(usdcToken.transferFrom(msg.sender, splitsContract, VOICE_PACK_PRICE), "Transfer failed");
        
        if (bytes(userCountry[msg.sender]).length == 0) {
            userCountry[msg.sender] = country;
        }
        
        voiceCredits[msg.sender] += 50;
        
        emit CreditsPurchased(msg.sender, 50, 0);
        emit PurchaseWithCountry(msg.sender, country, VOICE_PACK_PRICE, "voice");
    }
    
    function buySongPack(string calldata country) external {
        if (bytes(country).length != 2) revert InvalidCountryCode();
        
        require(usdcToken.transferFrom(msg.sender, splitsContract, SONG_PACK_PRICE), "Transfer failed");
        
        if (bytes(userCountry[msg.sender]).length == 0) {
            userCountry[msg.sender] = country;
        }
        
        songCredits[msg.sender] += 5;
        
        emit CreditsPurchased(msg.sender, 0, 5);
        emit PurchaseWithCountry(msg.sender, country, SONG_PACK_PRICE, "song");
    }
    
    function unlockSong(uint256 songId) external {
        if (songCredits[msg.sender] == 0) revert InsufficientCredits();
        if (hasUnlockedSong[msg.sender][songId]) revert AlreadyUnlocked();
        
        songCredits[msg.sender] -= 1;
        hasUnlockedSong[msg.sender][songId] = true;
        
        emit SongUnlocked(msg.sender, songId);
    }
    
    function startKaraoke(uint256 songId) external {
        if (voiceCredits[msg.sender] < 30) revert InsufficientCredits();
        if (!hasUnlockedSong[msg.sender][songId]) revert SongNotUnlocked();
        
        voiceCredits[msg.sender] -= 30;
        
        emit KaraokeStarted(msg.sender, songId);
    }
    
    function startExercise(uint256 numExercises) external {
        if (numExercises == 0) revert InsufficientCredits();
        if (voiceCredits[msg.sender] < numExercises) revert InsufficientCredits();
        
        voiceCredits[msg.sender] -= numExercises;
        
        emit ExerciseStarted(msg.sender, numExercises);
    }
    
    
    // Emergency function to recover any stuck tokens (not USDC from purchases)
    function recoverToken(address token, uint256 amount) external onlyOwner {
        require(token != address(usdcToken) || IERC20(token).balanceOf(address(this)) == 0, "Cannot withdraw purchase funds");
        IERC20(token).transfer(owner(), amount);
    }
}