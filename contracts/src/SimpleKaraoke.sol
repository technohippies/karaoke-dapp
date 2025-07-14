// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SimpleKaraoke {
    IERC20 public immutable usdcToken;
    address public owner;
    address public pkpAddress;
    
    uint256 public constant COMBO_PRICE = 3_000_000; // 3 USDC (6 decimals)
    uint256 public constant VOICE_PACK_PRICE = 1_000_000; // 1 USDC
    uint256 public constant SONG_PACK_PRICE = 2_000_000; // 2 USDC
    
    mapping(address => uint256) public voiceCredits;
    mapping(address => uint256) public songCredits;
    mapping(address => mapping(uint256 => bool)) public hasUnlockedSong;
    
    event CreditsPurchased(address indexed user, uint256 voiceAmount, uint256 songAmount);
    event SongUnlocked(address indexed user, uint256 indexed songId);
    
    error InsufficientCredits();
    error AlreadyUnlocked();
    error Unauthorized();
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _usdcToken, address _pkpAddress) {
        usdcToken = IERC20(_usdcToken);
        pkpAddress = _pkpAddress;
        owner = msg.sender;
    }
    
    function buyCombopack() external {
        require(usdcToken.transferFrom(msg.sender, address(this), COMBO_PRICE), "Transfer failed");
        voiceCredits[msg.sender] += 100;
        songCredits[msg.sender] += 10;
        emit CreditsPurchased(msg.sender, 100, 10);
    }
    
    function buyVoicePack() external {
        require(usdcToken.transferFrom(msg.sender, address(this), VOICE_PACK_PRICE), "Transfer failed");
        voiceCredits[msg.sender] += 50;
        emit CreditsPurchased(msg.sender, 50, 0);
    }
    
    function buySongPack() external {
        require(usdcToken.transferFrom(msg.sender, address(this), SONG_PACK_PRICE), "Transfer failed");
        songCredits[msg.sender] += 5;
        emit CreditsPurchased(msg.sender, 0, 5);
    }
    
    function unlockSong(uint256 songId) external {
        if (songCredits[msg.sender] == 0) revert InsufficientCredits();
        if (hasUnlockedSong[msg.sender][songId]) revert AlreadyUnlocked();
        
        songCredits[msg.sender]--;
        hasUnlockedSong[msg.sender][songId] = true;
        emit SongUnlocked(msg.sender, songId);
    }
    
    function setPkpAddress(address _pkpAddress) external onlyOwner {
        pkpAddress = _pkpAddress;
    }
    
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdcToken.transfer(owner, amount), "Transfer failed");
    }
}