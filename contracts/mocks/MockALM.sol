// SPDX-License-Identifier: UNLICENSED

pragma solidity =0.6.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockALM is ERC20 {
    uint256 private constant _INITIAL_SUPPLY = 100000000000 * (10**18);

    constructor() public ERC20("Alium coin", "ALM") {
        _setupDecimals(18);
        _mint(msg.sender, _INITIAL_SUPPLY);
    }
}
