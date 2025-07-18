// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract KaraokeSchool {
    IERC20 public immutable usdcToken;
    address public owner;
    address public pkpAddress;
    
    uint256 public constant COMBO_PRICE = 3_000_000; // 3 USDC (6 decimals)
    uint256 public constant VOICE_PACK_PRICE = 1_000_000; // 1 USDC
    uint256 public constant SONG_PACK_PRICE = 2_000_000; // 2 USDC
    
    mapping(address => uint256) public voiceCredits;
    mapping(address => uint256) public songCredits;
    mapping(address => mapping(uint256 => bool)) public hasUnlockedSong;
    mapping(address => string) public userCountry;
    
    event CreditsPurchased(address indexed user, uint256 voiceAmount, uint256 songAmount);
    event SongUnlocked(address indexed user, uint256 indexed songId);
    event KaraokeStarted(address indexed user, uint256 indexed songId);
    event PurchaseWithCountry(address indexed user, string country, uint256 usdcAmount, string packType);
    
    error InsufficientCredits();
    error AlreadyUnlocked();
    error SongNotUnlocked();
    error Unauthorized();
    error InvalidCountryCode();
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _usdcToken, address _pkpAddress) {
        usdcToken = IERC20(_usdcToken);
        pkpAddress = _pkpAddress;
        owner = msg.sender;
    }
    
    function buyCombopack(string calldata country) external {
        if (bytes(country).length != 2) revert InvalidCountryCode();
        require(usdcToken.transferFrom(msg.sender, address(this), COMBO_PRICE), "Transfer failed");
        
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
        require(usdcToken.transferFrom(msg.sender, address(this), VOICE_PACK_PRICE), "Transfer failed");
        
        // Store country if first purchase
        if (bytes(userCountry[msg.sender]).length == 0) {
            userCountry[msg.sender] = country;
        }
        
        voiceCredits[msg.sender] += 50;
        
        emit CreditsPurchased(msg.sender, 50, 0);
        emit PurchaseWithCountry(msg.sender, country, VOICE_PACK_PRICE, "voice");
    }
    
    function buySongPack(string calldata country) external {
        if (bytes(country).length != 2) revert InvalidCountryCode();
        require(usdcToken.transferFrom(msg.sender, address(this), SONG_PACK_PRICE), "Transfer failed");
        
        // Store country if first purchase
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
        
        songCredits[msg.sender]--;
        hasUnlockedSong[msg.sender][songId] = true;
        emit SongUnlocked(msg.sender, songId);
    }
    
    function startKaraoke(uint256 songId) external {
        if (!hasUnlockedSong[msg.sender][songId]) revert SongNotUnlocked();
        if (voiceCredits[msg.sender] == 0) revert InsufficientCredits();
        
        voiceCredits[msg.sender]--;
        emit KaraokeStarted(msg.sender, songId);
    }
    
    function setPkpAddress(address _pkpAddress) external onlyOwner {
        pkpAddress = _pkpAddress;
    }
    
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdcToken.transfer(owner, amount), "Transfer failed");
    }
}