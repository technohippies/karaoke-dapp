// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract KaraokeSchoolV4 is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    address public immutable splitsContract;
    
    uint256 public constant COMBO_PRICE = 2000000000000000; // 0.002 ETH (~7 USD at ~$3500/ETH)
    uint256 public constant VOICE_PACK_PRICE = 1100000000000000; // 0.0011 ETH (~3.85 USD)
    uint256 public constant SONG_PACK_PRICE = 800000000000000; // 0.0008 ETH (~2.8 USD)
    
    // FIXED CREDIT AMOUNTS
    uint256 public constant COMBO_VOICE_CREDITS = 2000;
    uint256 public constant COMBO_SONG_CREDITS = 3;
    uint256 public constant VOICE_PACK_CREDITS = 2000;
    uint256 public constant SONG_PACK_CREDITS = 3;
    
    mapping(address => uint256) public voiceCredits;
    mapping(address => uint256) public songCredits;
    mapping(address => mapping(uint256 => bool)) public hasUnlockedSong;
    mapping(address => string) public userCountry;
    
    event CreditsPurchased(address indexed user, uint256 voiceAmount, uint256 songAmount);
    event SongUnlocked(address indexed user, uint256 indexed songId);
    event KaraokeStarted(address indexed user, uint256 indexed songId);
    event ExerciseStarted(address indexed user, uint256 exerciseCount);
    event PurchaseWithCountry(address indexed user, string country, uint256 amount, string packType);
    
    error InsufficientCredits();
    error AlreadyUnlocked();
    error SongNotUnlocked();
    error Unauthorized();
    error InvalidCountryCode();
    error IncorrectETHAmount();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address _splitsContract
    ) {
        splitsContract = _splitsContract;
        _disableInitializers();
    }

    function initialize(address initialOwner) external initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }
    
    // Required by UUPSUpgradeable - only owner can upgrade
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    function buyCombopack(string calldata country) external payable {
        if (bytes(country).length != 2) revert InvalidCountryCode();
        
        if (msg.value != COMBO_PRICE) revert IncorrectETHAmount();
        
        payable(splitsContract).transfer(msg.value);
        
        // Store country if first purchase
        if (bytes(userCountry[msg.sender]).length == 0) {
            userCountry[msg.sender] = country;
        }
        
        // FIXED: Correct credit amounts
        voiceCredits[msg.sender] += COMBO_VOICE_CREDITS;
        songCredits[msg.sender] += COMBO_SONG_CREDITS;
        
        emit CreditsPurchased(msg.sender, COMBO_VOICE_CREDITS, COMBO_SONG_CREDITS);
        emit PurchaseWithCountry(msg.sender, country, COMBO_PRICE, "combo");
    }
    
    function buyVoicePack(string calldata country) external payable {
        if (bytes(country).length != 2) revert InvalidCountryCode();
        
        if (msg.value != VOICE_PACK_PRICE) revert IncorrectETHAmount();
        
        payable(splitsContract).transfer(msg.value);
        
        if (bytes(userCountry[msg.sender]).length == 0) {
            userCountry[msg.sender] = country;
        }
        
        voiceCredits[msg.sender] += VOICE_PACK_CREDITS;
        
        emit CreditsPurchased(msg.sender, VOICE_PACK_CREDITS, 0);
        emit PurchaseWithCountry(msg.sender, country, VOICE_PACK_PRICE, "voice");
    }
    
    function buySongPack(string calldata country) external payable {
        if (bytes(country).length != 2) revert InvalidCountryCode();
        
        if (msg.value != SONG_PACK_PRICE) revert IncorrectETHAmount();
        
        payable(splitsContract).transfer(msg.value);
        
        if (bytes(userCountry[msg.sender]).length == 0) {
            userCountry[msg.sender] = country;
        }
        
        songCredits[msg.sender] += SONG_PACK_CREDITS;
        
        emit CreditsPurchased(msg.sender, 0, SONG_PACK_CREDITS);
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
    
    // Emergency function to recover any stuck tokens
    function recoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    // Emergency function to recover any stuck ETH
    function recoverETH(uint256 amount) external onlyOwner {
        payable(owner()).transfer(amount);
    }
    
    // Storage gap for future upgrades
    uint256[50] private __gap;
}