// SPDX-License-Identifier: MIT

pragma solidity =0.6.2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./libraries/Privilegeable.sol";
import "./interfaces/IAliumCash.sol";

contract AliumCashbox is Initializable, Privilegeable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct Account {
        uint256 totalLimit;
        uint256 withdrawn;
    }

    mapping(address => Account) public allowedList;

    address public almToken;

    address public withdrawAdmin;

    event WalletLimit(address wallet, uint256 limit);

    function initialize(address _token, address _aliumCashboxAdmin)
        public
        initializer
    {
        require(_token != address(0), "token address!");
        require(_aliumCashboxAdmin != address(0), "admin address!");
        almToken = _token;
        _addAdmin(_aliumCashboxAdmin);
    }

    /********** public functions ***************/

    /**
     * @dev get alium token ballance on the contract
     */

    function getBalance() external view returns (uint256) {
        return (IERC20(almToken).balanceOf(address(this)));
    }

    /**
     * @dev get actual alium token withdrawal limit for the wallet
     */

    function getWalletLimit(address _wallet) external view returns (uint256) {
        return (allowedList[_wallet].totalLimit);
    }

    /**
     * @dev get alium token total withdrawn amount for the wallet
     */

    function getWalletWithdrawals(address _wallet)
        external
        view
        returns (uint256)
    {
        return (allowedList[_wallet].withdrawn);
    }

    /**
     * @dev withdraw ALM token to allowed wallet address respecting token limits
     * @param _amount ALM token amount for withdrawal
     */

    function withdraw(uint256 _amount) external {
        if (
            allowedList[msg.sender].totalLimit == 0 &&
            allowedList[msg.sender].withdrawn == 0
        ) revert("You are not allowed to claim ALMs!");
        require(
            allowedList[msg.sender].totalLimit > 0,
            "Your limit is exhausted!"
        );
        require(
            allowedList[msg.sender].totalLimit >= _amount,
            "Your query exceeds your limit!"
        );

        allowedList[msg.sender].totalLimit = allowedList[msg.sender]
            .totalLimit
            .sub(_amount);
        allowedList[msg.sender].withdrawn = allowedList[msg.sender]
            .withdrawn
            .add(_amount);

        IERC20(almToken).safeTransfer(msg.sender, _amount);
    }

    /********** admin functions ****************/
    /**
     * @dev set withdrawAdmin only for run withdrawCustom
     * @param _withdrawAdmin set wallet address
     */
    function setWithdrawAdmin(address _withdrawAdmin) public onlyAdmin {
        withdrawAdmin = _withdrawAdmin;
    }

    /**
     * @dev set (update) withdrawal limit for the wallet address, make it allowed for withdrawal
     * @param _wallet   wallet address for withdrawal allowance
     * @param _newLimit new amount limitation for withdrawal
     */

    function setWalletLimit(address _wallet, uint256 _newLimit)
        public
        onlyAdmin
    {
        require(_wallet != address(0) && _newLimit >= 0, "check input values!");
        allowedList[_wallet] = Account(_newLimit, 0);
        emit WalletLimit(_wallet, _newLimit);
    }

    /**
     * @dev withdraw accidentally received tokens
     * @param _token  token address
     * @param _sendTo address for tokens withdrawal
     * @param _amount amount of token for withdrawal
     */
    function withdrawCustom(
        address _token,
        address _sendTo,
        uint256 _amount
    ) public {
        require(msg.sender == withdrawAdmin, "Only withdrawAdmin!");
        require(
            _token != address(0) && _sendTo != address(0) && _amount > 0,
            "check input values!"
        );
        require(_token != almToken, "Alium token not allowed!");
        IERC20(_token).safeTransfer(_sendTo, _amount);
    }
}
