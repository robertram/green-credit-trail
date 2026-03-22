// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CarbonToken.sol";

/**
 * @title CarbonMarketplace
 * @notice Factory and registry contract that deploys and tracks all CarbonToken contracts.
 *         Buyers purchase carbon credits using AVAX. A platform fee (in basis points)
 *         is collected on each purchase.
 */
contract CarbonMarketplace is ReentrancyGuard, Ownable {
    // ─── State Variables ─────────────────────────────────────────────────────

    /// @notice All deployed CarbonToken contract addresses
    address[] public allProjects;

    /// @notice Maps issuer address → their deployed token contracts
    mapping(address => address[]) public issuerProjects;

    /// @notice Maps token contract address → verified status
    mapping(address => bool) public verifiedProjects;

    /// @notice Platform fee in basis points (e.g. 250 = 2.5%). Max 1000 (10%).
    uint256 public platformFeeBps;

    /// @notice Address that receives platform fees
    address public feeRecipient;

    /// @dev Maximum allowed platform fee: 10%
    uint256 private constant MAX_FEE_BPS = 1000;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a new carbon credit project token is deployed
    event ProjectCreated(
        address indexed issuer,
        address indexed tokenContract,
        string projectName,
        uint256 timestamp
    );

    /// @notice Emitted when a buyer purchases carbon credit tokens
    event TokensPurchased(
        address indexed buyer,
        address indexed project,
        uint256 amount,
        uint256 avaxPaid,
        uint256 timestamp
    );

    /// @notice Emitted when a project is verified by the admin
    event ProjectVerified(address indexed project, uint256 timestamp);

    /// @notice Emitted when a project's verification is revoked by the admin
    event ProjectRevoked(address indexed project, uint256 timestamp);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @notice Deploys the marketplace.
     * @param _platformFeeBps Initial platform fee in basis points (max 1000)
     * @param _feeRecipient   Address that receives platform fees (must not be zero)
     */
    constructor(uint256 _platformFeeBps, address _feeRecipient) Ownable(msg.sender) {
        require(_platformFeeBps <= MAX_FEE_BPS, "CarbonMarketplace: fee exceeds 10%");
        require(_feeRecipient != address(0), "CarbonMarketplace: zero fee recipient");

        platformFeeBps = _platformFeeBps;
        feeRecipient = _feeRecipient;
    }

    // ─── Project Management ───────────────────────────────────────────────────

    /**
     * @notice Deploys a new CarbonToken contract and registers it in the marketplace.
     * @param name          ERC-20 token name
     * @param symbol        ERC-20 token symbol
     * @param _projectName  Human-readable project name
     * @param _projectType  Project category (e.g. "Reforestation")
     * @param _country      Country of origin
     * @param _evidenceURI  IPFS URI for verification documents
     * @param _pricePerToken Price per token in wei (AVAX). Must be > 0.
     * @param initialSupply Initial token supply. Must be > 0.
     * @return tokenAddress Address of the deployed CarbonToken contract
     */
    function createProject(
        string memory name,
        string memory symbol,
        string memory _projectName,
        string memory _projectType,
        string memory _country,
        string memory _evidenceURI,
        uint256 _pricePerToken,
        uint256 initialSupply
    ) external returns (address tokenAddress) {
        // Checks
        require(_pricePerToken > 0, "CarbonMarketplace: price must be > 0");
        require(initialSupply > 0, "CarbonMarketplace: supply must be > 0");

        // Deploy the token, passing msg.sender as the issuer so tokens are
        // minted directly to the project owner — not to this contract.
        CarbonToken token = new CarbonToken(
            name,
            symbol,
            _projectName,
            _projectType,
            _country,
            _evidenceURI,
            msg.sender,   // issuerAddress: actual project owner
            _pricePerToken,
            initialSupply
        );

        tokenAddress = address(token);

        allProjects.push(tokenAddress);
        issuerProjects[msg.sender].push(tokenAddress);

        emit ProjectCreated(msg.sender, tokenAddress, _projectName, block.timestamp);
    }

    /**
     * @notice Purchases carbon credit tokens from a verified project.
     *         Caller must send exact AVAX: (amount × pricePerToken) + platform fee.
     *         The issuer must have pre-approved this marketplace contract via
     *         `CarbonToken.approve(marketplace, amount)` before this call.
     * @param projectToken Address of the CarbonToken contract
     * @param amount       Number of tokens to purchase
     */
    function buyTokens(address projectToken, uint256 amount)
        external
        payable
        nonReentrant
    {
        // ── Checks ────────────────────────────────────────────────────────────
        require(projectToken != address(0), "CarbonMarketplace: zero token address");
        require(amount > 0, "CarbonMarketplace: amount must be > 0");
        require(verifiedProjects[projectToken], "CarbonMarketplace: project not verified");

        CarbonToken token = CarbonToken(payable(projectToken));
        uint256 price = token.pricePerToken();
        uint256 totalCost = price * amount;
        uint256 fee = (totalCost * platformFeeBps) / 10_000;
        uint256 requiredAvax = totalCost + fee;

        require(msg.value == requiredAvax, "CarbonMarketplace: incorrect AVAX amount");

        address tokenIssuer = token.issuer();
        require(
            token.allowance(tokenIssuer, address(this)) >= amount,
            "CarbonMarketplace: marketplace not approved by issuer"
        );
        require(
            token.balanceOf(tokenIssuer) >= amount,
            "CarbonMarketplace: issuer has insufficient tokens"
        );

        // ── Effects ───────────────────────────────────────────────────────────
        // (ERC-20 state changes happen inside transferFrom — still counts as effects
        //  because we do external AVAX sends after)

        // ── Interactions ──────────────────────────────────────────────────────
        // 1. Transfer tokens from issuer to buyer
        bool transferred = token.transferFrom(tokenIssuer, msg.sender, amount);
        require(transferred, "CarbonMarketplace: token transfer failed");

        // 2. Send AVAX (minus fee) to the token contract for issuer withdrawal
        (bool sentToToken, ) = projectToken.call{value: totalCost}("");
        require(sentToToken, "CarbonMarketplace: AVAX to token contract failed");

        // 3. Send platform fee to fee recipient
        if (fee > 0) {
            (bool sentFee, ) = feeRecipient.call{value: fee}("");
            require(sentFee, "CarbonMarketplace: fee transfer failed");
        }

        emit TokensPurchased(msg.sender, projectToken, amount, msg.value, block.timestamp);
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    /**
     * @notice Marks a project as verified, enabling token purchases.
     * @param projectToken Address of the CarbonToken contract to verify
     */
    function verifyProject(address projectToken) external onlyOwner {
        require(projectToken != address(0), "CarbonMarketplace: zero address");
        require(!verifiedProjects[projectToken], "CarbonMarketplace: already verified");
        verifiedProjects[projectToken] = true;
        emit ProjectVerified(projectToken, block.timestamp);
    }

    /**
     * @notice Revokes verification from a project, disabling further purchases.
     * @param projectToken Address of the CarbonToken contract to revoke
     */
    function revokeVerification(address projectToken) external onlyOwner {
        require(verifiedProjects[projectToken], "CarbonMarketplace: not verified");
        verifiedProjects[projectToken] = false;
        emit ProjectRevoked(projectToken, block.timestamp);
    }

    /**
     * @notice Updates the platform fee. Cannot exceed 10% (1000 bps).
     * @param newFeeBps New fee in basis points
     */
    function updatePlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "CarbonMarketplace: fee exceeds 10%");
        platformFeeBps = newFeeBps;
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Returns all metadata for a given CarbonToken in a single call.
     * @param projectToken Address of the CarbonToken contract
     * @return tokenProjectName  Project name
     * @return tokenProjectType  Project type/category
     * @return tokenCountry      Country of origin
     * @return tokenEvidenceURI  IPFS evidence URI
     * @return tokenIssuer       Issuer wallet address
     * @return tokenPrice        Price per token in wei (AVAX)
     * @return tokenVerified     Whether the project is verified
     * @return tokenTotalSupply  Total token supply
     * @return tokenTotalRetired Total tokens retired/burned
     */
    function getProjectDetails(address projectToken)
        external
        view
        returns (
            string memory tokenProjectName,
            string memory tokenProjectType,
            string memory tokenCountry,
            string memory tokenEvidenceURI,
            address tokenIssuer,
            uint256 tokenPrice,
            bool tokenVerified,
            uint256 tokenTotalSupply,
            uint256 tokenTotalRetired
        )
    {
        CarbonToken token = CarbonToken(payable(projectToken));
        return (
            token.projectName(),
            token.projectType(),
            token.country(),
            token.evidenceURI(),
            token.issuer(),
            token.pricePerToken(),
            verifiedProjects[projectToken],
            token.totalSupply(),
            token.totalRetired()
        );
    }

    /**
     * @notice Returns all deployed project token addresses.
     * @return Array of CarbonToken contract addresses
     */
    function getAllProjects() external view returns (address[] memory) {
        return allProjects;
    }

    /**
     * @notice Returns all project token addresses for a given issuer.
     * @param issuerAddress Issuer wallet address
     * @return Array of CarbonToken contract addresses
     */
    function getIssuerProjects(address issuerAddress)
        external
        view
        returns (address[] memory)
    {
        return issuerProjects[issuerAddress];
    }

    /// @dev Rejects accidental AVAX sends directly to the marketplace
    receive() external payable {
        revert("CarbonMarketplace: direct AVAX transfers not accepted");
    }
}
