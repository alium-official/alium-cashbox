// SPDX-License-Identifier: MIT

pragma solidity =0.6.2;

import "@openzeppelin/contracts/proxy/TransparentUpgradeableProxy.sol";

contract AliumCashboxUpgradeableProxy is TransparentUpgradeableProxy {
    constructor(
        address _logic,
        address admin_,
        bytes memory _data
    )
        public
        payable
        TransparentUpgradeableProxy(
            _logic,
            admin_,
            _data
        )
    {}
}
