// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../module/Math/Math.sol";
import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/SafeERC20.sol";
import "../WUSD/WUSD.sol";
import "../Utils/ReentrancyGuard.sol";
import "../Utils/StringHelpers.sol";

// Inheritance
import "./IStakingRewards.sol";
import "./RewardsDistributionRecipient.sol";
import "./Pausable.sol";

contract StakingwithoutLaunchpad is IStakingRewards, RewardsDistributionRecipient, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    WUSDStablecoin private WUSD;
    ERC20 public rewardsToken;
    ERC20 public stakingToken;
    uint256 public periodFinish;

    // Constant for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;

    // Max reward per second
    uint256 public rewardRate;

    // uint256 public rewardsDuration = 86400 hours;
    uint256 public rewardsDuration = 604800;

    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored = 0;
    uint256 public pool_weight; // This staking pool's percentage of the total WMF being distributed by all pools, 6 decimals of precision

    address public owner_address;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 private _staking_token_supply = 0;
    uint256 private _staking_token_boosted_supply = 0;
    mapping(address => uint256) private _unlocked_balances;
    mapping(address => uint256) private _boosted_balances;

    mapping(address => bool) public greylist;

    bool public unlockedStakes; // Release lock stakes in case of system migration

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken,
        address _WUSD_address,
        uint256 _pool_weight
    ) public Owned(_owner){
        owner_address = _owner;
        rewardsToken = ERC20(_rewardsToken);
        stakingToken = ERC20(_stakingToken);
        WUSD = WUSDStablecoin(_WUSD_address);
        rewardsDistribution = _rewardsDistribution;
        lastUpdateTime = block.timestamp;
        pool_weight = _pool_weight;
        rewardRate = 380517503805175038; // (uint256(12000000e18)).div(365 * 86400); // Base emission rate of 12M WMF over the first year
        rewardRate = rewardRate.mul(pool_weight).div(1e6);
        unlockedStakes = false;
    }

    /* ========== VIEWS ========== */

    function totalSupply() external override view returns (uint256) {
        return _staking_token_supply;
    }

    function totalBoostedSupply() external view returns (uint256) {
        return _staking_token_boosted_supply;
    }

    function crBoostMultiplier() public view returns (uint256) {
        uint256 multiplier = uint(MULTIPLIER_BASE).add((uint(MULTIPLIER_BASE).sub(WUSD.global_collateral_ratio())).mul(cr_boost_max_multiplier.sub(MULTIPLIER_BASE)).div(MULTIPLIER_BASE) );
        return multiplier;
    }

    // Total unlocked and locked liquidity tokens
    function balanceOf(address account) external override view returns (uint256) {
        return _unlocked_balances[account];
    }

    // Total unlocked liquidity tokens
    function unlockedBalanceOf(address account) external view returns (uint256) {
        return _unlocked_balances[account];
    }

    // Total 'balance' used for calculating the percent of the pool the account owns
    // Takes into account the locked stake time multiplier
    function boostedBalanceOf(address account) external view returns (uint256) {
        return _boosted_balances[account];
    }

    function lockedStakesOf(address account) external view returns (LockedStake[] memory) {
        return lockedStakes[account];
    }

    function stakingDecimals() external view returns (uint256) {
        return stakingToken.decimals();
    }

    function rewardsFor(address account) external view returns (uint256) {
        // You may have use earned() instead, because of the order in which the contract executes 
        return rewards[account];
    }

    function lastTimeRewardApplicable() internal view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() internal view returns (uint256) {
        if (_staking_token_supply == 0) {
            return rewardPerTokenStored;
        }
        else {
            return rewardPerTokenStored.add(
                lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate).mul(1e18).div(PRICE_PRECISION).div(_staking_token_boosted_supply)
            );
        }
    }

    function earned(address account) public override view returns (uint256) {
        return _boosted_balances[account].mul(rewardPerToken().sub(userRewardPerTokenPaid[account])).div(1e18).add(rewards[account]);
    }

    // function earned(address account) public override view returns (uint256) {
    //     return _balances[account].mul(rewardPerToken().sub(userRewardPerTokenPaid[account])).add(rewards[account]);
    // }

    function getRewardForDuration() external override view returns (uint256) {
        return rewardRate.mul(rewardsDuration).mul(crBoostMultiplier()).div(PRICE_PRECISION);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stake(uint256 amount) external override nonReentrant notPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        require(greylist[msg.sender] == false, "address has been greylisted");

        // Pull the tokens from the staker
        TransferHelper.safeTransferFrom(address(stakingToken), msg.sender, address(this), amount);

        // Staking token supply and boosted supply
        _staking_token_supply = _staking_token_supply.add(amount);
        _staking_token_boosted_supply = _staking_token_boosted_supply.add(amount);

        // Staking token balance and boosted balance
        _unlocked_balances[msg.sender] = _unlocked_balances[msg.sender].add(amount);
        _boosted_balances[msg.sender] = _boosted_balances[msg.sender].add(amount);

        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public override nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");

        // Staking token balance and boosted balance
        _unlocked_balances[msg.sender] = _unlocked_balances[msg.sender].sub(amount);
        _boosted_balances[msg.sender] = _boosted_balances[msg.sender].sub(amount);

        // Staking token supply and boosted supply
        _staking_token_supply = _staking_token_supply.sub(amount);
        _staking_token_boosted_supply = _staking_token_boosted_supply.sub(amount);

        // Give the tokens to the withdrawer
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public override nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    // If the period expired, renew it
    function retroCatchUp() internal {
        // Failsafe check
        require(block.timestamp > periodFinish, "Period has not expired yet!");

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 num_periods_elapsed = uint256(block.timestamp.sub(periodFinish)) / rewardsDuration; // Floor division to the nearest period
        uint balance = rewardsToken.balanceOf(address(this));
        require(rewardRate.mul(rewardsDuration).mul(crBoostMultiplier()).mul(num_periods_elapsed + 1).div(PRICE_PRECISION) <= balance, "Not enough WMF available");

        // uint256 old_lastUpdateTime = lastUpdateTime;
        // uint256 new_lastUpdateTime = block.timestamp;

        // lastUpdateTime = periodFinish;
        periodFinish = periodFinish.add((num_periods_elapsed.add(1)).mul(rewardsDuration));

        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();

        emit RewardsPeriodRenewed(address(stakingToken));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */
/*
    // This notifies people that the reward is being changed
    function notifyRewardAmount(uint256 reward) external override onlyRewardsDistribution updateReward(address(0)) {
        // Needed to make compiler happy

        
        // if (block.timestamp >= periodFinish) {
        //     rewardRate = reward.mul(crBoostMultiplier()).div(rewardsDuration).div(PRICE_PRECISION);
        // } else {
        //     uint256 remaining = periodFinish.sub(block.timestamp);
        //     uint256 leftover = remaining.mul(rewardRate);
        //     rewardRate = reward.mul(crBoostMultiplier()).add(leftover).div(rewardsDuration).div(PRICE_PRECISION);
        // }

        // // Ensure the provided reward amount is not more than the balance in the contract.
        // // This keeps the reward rate in the right range, preventing overflows due to
        // // very high values of rewardRate in the earned and rewardsPerToken functions;
        // // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        // uint balance = rewardsToken.balanceOf(address(this));
        // require(rewardRate <= balance.div(rewardsDuration), "Provided reward too high");

        // lastUpdateTime = block.timestamp;
        // periodFinish = block.timestamp.add(rewardsDuration);
        // emit RewardAdded(reward);
    }
*/

    // Added to support recovering LP Rewards from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwn {
        // Admin cannot withdraw the staking token from the contract
        require(tokenAddress != address(stakingToken));
        ERC20(tokenAddress).transfer(owner_address, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwn {
        require(
            periodFinish == 0 || block.timestamp > periodFinish,
            "Reward period incomplete"
        );
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }

    function initializeDefault() external onlyOwn {
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
        emit DefaultInitialization();
    }

    function greylistAddress(address _address) external onlyOwn {
        greylist[_address] = !(greylist[_address]);
    }

    function unlockStakes() external onlyOwn {
        unlockedStakes = !unlockedStakes;
    }

    function setRewardRate(uint256 _new_rate) external onlyOwn {
        rewardRate = _new_rate;
    }

    function setOwnerAndTimelock(address _new_owner) external onlyOwn {
        owner_address = _new_owner;
    }

    /* ========== MODIFIERS ========== */

    modifier updateReward(address account) {
        // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
        if (block.timestamp > periodFinish) {
            retroCatchUp();
        }
        else {
            rewardPerTokenStored = rewardPerToken();
            lastUpdateTime = lastTimeRewardApplicable();
        }
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    modifier onlyOwn() {
        require(msg.sender == owner_address || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event StakeLocked(address indexed user, uint256 amount, uint256 secs);
    event Withdrawn(address indexed user, uint256 amount);
    event WithdrawnLocked(address indexed user, uint256 amount, bytes32 kek_id);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address token, uint256 amount);
    event RewardsPeriodRenewed(address token);
    event DefaultInitialization();
    event LockedStakeMinTime(uint256 secs);
    event MaxCRBoostMultiplier(uint256 multiplier);
}