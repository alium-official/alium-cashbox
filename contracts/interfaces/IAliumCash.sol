// SPDX-License-Identifier: MIT

pragma solidity =0.6.2;

/**
 * @dev Interface of the AliumCashbox
 */
interface IAliumCash {
    function getBalance() external view returns (uint256);

    function getWalletLimit(address _wallet) external view returns (uint256);

    function getWalletWithdrawals(address _wallet)
        external
        view
        returns (uint256);

    function withdraw(uint256 _amount) external;
}
