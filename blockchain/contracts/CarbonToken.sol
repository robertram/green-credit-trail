// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CarbonToken
 * @notice ERC-20 token representing carbon credits for a single environmental project.
 *         1 token = 1 tCO₂ offset. Buyers pay in AVAX (Avalanche native currency).
 */
contract CarbonToken is ERC20, ReentrancyGuard {
    // ─── State Variables ─────────────────────────────────────────────────────

    /// @notice Name of the environmental project
    string public projectName;

    /// @notice Category of the project (e.g. "Reforestation", "Solar", "Mangrove")
    string public projectType;

    /// @notice Country where the project is located
    string public country;

    /// @notice IPFS URI pointing to verification documents
    string public evidenceURI;

    /// @notice Wallet address of the project owner / issuer
    address public issuer;

    /// @notice Price per token in wei (AVAX)
    uint256 public pricePerToken;

    /// @notice Whether the project has been verified by the marketplace admin
    bool public isVerified;

    /// @notice Total number of tokens that have been retired (burned) to offset CO₂
    uint256 public totalRetired;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when tokens are permanently retired (burned) to offset CO₂
    event TokensRetired(address indexed by, uint256 amount, uint256 timestamp);

    /// @notice Emitted when the issuer updates the evidence URI
    event EvidenceUpdated(string newURI, uint256 timestamp);

    /// @notice Emitted when the issuer updates the token price
    event PriceUpdated(uint256 newPrice);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    /// @dev Restricts function access to the issuer address
    modifier onlyIssuer() {
        require(msg.sender == issuer, "CarbonToken: caller is not the issuer");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @notice Deploys the carbon credit token and mints the initial supply to the issuer.
     * @param name           ERC-20 token name
     * @param symbol         ERC-20 token symbol
     * @param _projectName   Human-readable project name
     * @param _projectType   Project category (e.g. "Reforestation")
     * @param _country       Country of origin
     * @param _evidenceURI   IPFS URI for verification documents
     * @param issuerAddress  Wallet of the actual project owner (set by the marketplace factory)
     * @param _pricePerToken Price per token in wei (AVAX)
     * @param initialSupply  Number of tokens to mint on deployment (must be > 0)
     */
    constructor(
        string memory name,
        string memory symbol,
        string memory _projectName,
        string memory _projectType,
        string memory _country,
        string memory _evidenceURI,
        address issuerAddress,
        uint256 _pricePerToken,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        require(issuerAddress != address(0), "CarbonToken: zero issuer address");
        require(_pricePerToken > 0, "CarbonToken: price must be > 0");
        require(initialSupply > 0, "CarbonToken: initial supply must be > 0");

        issuer = issuerAddress;
        projectName = _projectName;
        projectType = _projectType;
        country = _country;
        evidenceURI = _evidenceURI;
        pricePerToken = _pricePerToken;

        _mint(issuerAddress, initialSupply);
    }

    // ─── Issuer Functions ─────────────────────────────────────────────────────

    /**
     * @notice Mints additional carbon credit tokens to the issuer.
     * @param amount Number of tokens to mint
     */
    function mint(uint256 amount) external onlyIssuer {
        require(amount > 0, "CarbonToken: amount must be > 0");
        _mint(issuer, amount);
    }

    /**
     * @notice Permanently retires (burns) tokens to offset CO₂.
     *         Anyone who holds tokens can retire them.
     * @param amount Number of tokens to retire
     */
    function retire(uint256 amount) external nonReentrant {
        require(amount > 0, "CarbonToken: amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "CarbonToken: insufficient balance");

        // Effects
        totalRetired += amount;

        // Interactions
        _burn(msg.sender, amount);

        emit TokensRetired(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Updates the IPFS URI for project verification documents.
     * @param newURI New IPFS URI
     */
    function updateEvidenceURI(string calldata newURI) external onlyIssuer {
        evidenceURI = newURI;
        emit EvidenceUpdated(newURI, block.timestamp);
    }

    /**
     * @notice Updates the AVAX price per token.
     * @param newPrice New price in wei (AVAX)
     */
    function updatePrice(uint256 newPrice) external onlyIssuer {
        require(newPrice > 0, "CarbonToken: price must be > 0");
        pricePerToken = newPrice;
        emit PriceUpdated(newPrice);
    }

    /**
     * @notice Withdraws all accumulated AVAX from token sales to the issuer.
     *         Uses pull payment pattern — issuer initiates withdrawal.
     */
    function withdraw() external onlyIssuer nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "CarbonToken: no AVAX to withdraw");

        // Effects before interaction
        (bool success, ) = issuer.call{value: balance}("");
        require(success, "CarbonToken: AVAX transfer failed");
    }

    /// @dev Allows the contract to receive AVAX from token sales
    receive() external payable {}
}
