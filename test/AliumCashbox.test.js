const { accounts, privateKeys, defaultSender } = require('@openzeppelin/test-environment');
const { ether, time, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { default: BigNumber } = require('bignumber.js');
const { assert } = require('chai');
const { contract } = require('./twrapper');
const helper = require("./helpers/truffleTestHelper"); // helper to shift block/time

const Proxy = contract.fromArtifact('AliumCashboxUpgradeableProxy');
const AliumCashbox = contract.fromArtifact('AliumCashbox');
const MockALM = contract.fromArtifact('MockALM');
const MockWBTC = contract.fromArtifact('MockWBTC');
const MockWETH = contract.fromArtifact('MockWETH');

const { web3 } = MockALM;
const { BN } = web3.utils;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const money = {
    ether,
    zero: ether('0'),
    alm: ether,
    wbtc: (value) => ether(value).div(new BN (1e10))
};

describe.only('AliumCashbox Test', function () {
    const [ TestOwner, alice, bob, clarc, ProxyAdmin, ProxyAdmin2, withdrawAdmin] = accounts;

    beforeEach(async function () {
        this.alm_token = await MockALM.new()
        this.wbtc_token = await MockWBTC.new()
        this.weth_token = await MockWETH.new()
        this.AliumCashImpl1 = await AliumCashbox.new()
        this.AliumCashImpl2 = await AliumCashbox.new()
        this.AliumCashImpl3 = await AliumCashbox.new()

        /* initialize proxy with implementation1 */
        let initAliumCashData = await this.AliumCashImpl1.contract.methods.initialize(this.alm_token.address, defaultSender).encodeABI()
        let AliumCash_proxy = await Proxy.new(this.AliumCashImpl1.address, ProxyAdmin, initAliumCashData, {from: ProxyAdmin})
        this.AliumCashbox = await AliumCashbox.at(AliumCash_proxy.address)
        this.AliumCashProxyContract = await Proxy.at(AliumCash_proxy.address)


        await this.alm_token.transfer(this.AliumCashbox.address, money.alm('250000000'))
        await this.AliumCashbox.setWalletLimit(alice, money.alm('100000000'))

        await this.AliumCashProxyContract.upgradeTo(this.AliumCashImpl2.address, {from: ProxyAdmin})
        await this.AliumCashbox.setWalletLimit(bob, money.alm('50000000'))
        await this.AliumCashbox.setWithdrawAdmin(withdrawAdmin)

        await this.wbtc_token.transfer(this.AliumCashbox.address, money.wbtc('1234.5678'))
        await this.weth_token.deposit({value: money.ether('123')})
        await this.weth_token.transfer(this.AliumCashbox.address, money.ether('123'))
    })

    describe('Test upgrades of AliumCashbox', () => {
        it('upgrade', async function () {
            let tx = await this.AliumCashProxyContract.upgradeTo(this.AliumCashImpl2.address, {from: ProxyAdmin})
            expectEvent(tx.receipt, 'Upgraded', {implementation: this.AliumCashImpl2.address})
        })
        it('change proxy admin', async function () {
            let tx = await this.AliumCashProxyContract.changeAdmin(ProxyAdmin2, {from: ProxyAdmin})
            expectEvent(tx.receipt, 'AdminChanged', {previousAdmin: ProxyAdmin, newAdmin: ProxyAdmin2})
        })
    })

    describe('Test geting AliumCashbox data', ()=> {
        it('getBalance() is equal 250000000', async function () {
            let res = (await this.AliumCashbox.getBalance()).toString()
            assert.equal(res, money.alm('250000000'), 'getBalance() must be equal 250000000')
        })
        it('getWalletLimit() is 0 for unknown (clarc) wallet', async function () {
            let res = (await this.AliumCashbox.getWalletLimit(clarc)).toString();
            assert.equal(res, money.alm('0'), 'getWalletLimit(clarc) must be zero')
        })
        it('getWalletWithdrawals() is 0 for unknown (clarc) wallet', async function () {
            let res = (await this.AliumCashbox.getWalletWithdrawals(clarc)).toString()
            assert.equal(res, money.alm('0'), 'getWalletWithdrawals(clarc) must be zero')
        })
        it('getWalletLimit(alice) is 100000000 ALM & getWalletWithdrawals(alice) is 0', async function () {
            let res1 = (await this.AliumCashbox.getWalletLimit(alice)).toString()
            assert.equal(res1, money.alm('100000000'), 'getWalletLimit(alice) must be 100000000')

            let res2 = (await this.AliumCashbox.getWalletWithdrawals(alice)).toString()
            assert.equal(res2, money.alm('0'), 'getWalletWithdrawals(alice) must be 0')
        })
        it('getWalletLimit(bob) is 50000000 ALM & getWalletWithdrawals(bob) is 0', async function () {
            let res1 = (await this.AliumCashbox.getWalletLimit(bob)).toString()
            assert.equal(res1, money.alm('50000000'), 'getWalletLimit(alice) must be 50000000')

            let res2 = (await this.AliumCashbox.getWalletWithdrawals(bob)).toString()
            assert.equal(res2, money.alm('0'), 'getWalletWithdrawals(alice) must be 0')
        })
    })
    describe('Test setting AliumCashbox limits', ()=> {
        it('execute setWalletLimit() allowed only for admin, revert for others. Also grant, revoke admins rights', async function () {
            await expectRevert(
                this.AliumCashbox.setWalletLimit(alice, money.alm('1'), {from: alice}),
                'Privilegeable: caller is not the owner'
            );
            await expectRevert(
                this.AliumCashbox.setWalletLimit(bob, money.alm('1'), {from: bob}),
                'Privilegeable: caller is not the owner'
            );
            await expectRevert(
                this.AliumCashbox.setWalletLimit(clarc, money.alm('1'), {from: clarc}),
                'Privilegeable: caller is not the owner'
            );
            await expectRevert(
                this.AliumCashbox.setWalletLimit(clarc, money.alm('1'), {from: TestOwner}),
                'Privilegeable: caller is not the owner'
            );

            let tx = await this.AliumCashbox.setWalletLimit(clarc, money.alm('1'), {from: defaultSender})
            expectEvent(tx.receipt, 'WalletLimit',
                { wallet: clarc, limit: money.alm('1')});

            // give alice admins rights, defaultSender stay admin
            await this.AliumCashbox.addAdmin(alice);
            tx = await this.AliumCashbox.setWalletLimit(alice, money.alm('1'), {from: alice})
            expectEvent(tx.receipt, 'WalletLimit',
                { wallet: alice, limit: money.alm('1')});

            // alice revoke admins rights from 'defaultSender'
            await this.AliumCashbox.removeAdmin(defaultSender, {from: alice});
            await expectRevert(
                this.AliumCashbox.setWalletLimit(clarc, money.alm('1'), {from: defaultSender}),
                'Privilegeable: caller is not the owner'
            );

        });
        it('pass to setWalletLimit() incorrect inputs', async function () {
            await expectRevert(
                this.AliumCashbox.setWalletLimit(ZERO_ADDRESS, money.alm('1')),
                'check input values!'
            )
        })
    })
    describe('Test trying to withdraw AliumCashbox incorrectly and correctly', ()=> {
        it('withdraw with incorrect inputs', async function () {
            await expectRevert(
                this.AliumCashbox.withdraw(money.alm('1'), {from: clarc}),
                'You are not allowed to claim ALMs!'
            )
        })
        it('bob try to withdraw more than allowed', async function () {
            await expectRevert(
                this.AliumCashbox.withdraw(money.alm('50000001'), {from: bob}),
                'Your query exceeds your limit!'
            )
        })
        it('bob withdraw everything and try to withdraw some more', async function () {
            await this.AliumCashbox.withdraw(money.alm('50000000'), {from: bob})
            await expectRevert(
                this.AliumCashbox.withdraw(money.alm('1'), {from: bob}),
                'Your limit is exhausted!'
            )
        })
    })
    describe('Test withdrawCustom', ()=> {
        it('setWithdrawAdmin', async function () {
            let withdrawAdmin_fromSC = await this.AliumCashbox.withdrawAdmin()
            assert.equal(withdrawAdmin_fromSC, withdrawAdmin, 'withdrawAdmin is not set')
        })
        it('getBalances of accidentally wbtc tokens', async function () {
            let resBefore = (await this.wbtc_token.balanceOf(this.AliumCashbox.address)).toString()
            await this.AliumCashbox.withdrawCustom(this.wbtc_token.address, alice, resBefore, {from: withdrawAdmin})
            let resAfter = (await this.wbtc_token.balanceOf(alice)).toString()
            assert.equal(resBefore, resAfter, 'balances must be equal')
        })
        it('getBalances of accidentally weth tokens', async function () {
            let resBefore = (await this.weth_token.balanceOf(this.AliumCashbox.address)).toString()
            await this.AliumCashbox.withdrawCustom(this.weth_token.address, alice, resBefore, {from: withdrawAdmin})
            let resAfter = (await this.weth_token.balanceOf(alice)).toString()
            assert.equal(resBefore, resAfter, 'balances must be equal')
        })
        it('try withdrawCustom with zero token parameter', async function () {
            await expectRevert(
                this.AliumCashbox.withdrawCustom(ZERO_ADDRESS, alice, money.ether('1'), {from: withdrawAdmin}),
                'check input values!'
            )
        })
        it('try withdrawCustom with zero wallet receiver parameter', async function () {
            await expectRevert(
                this.AliumCashbox.withdrawCustom(this.wbtc_token.address, ZERO_ADDRESS, money.ether('1'), {from: withdrawAdmin}),
                'check input values!'
            )
        })
        it('try withdrawCustom with zero amount parameter', async function () {
            await expectRevert(
                this.AliumCashbox.withdrawCustom(this.wbtc_token.address, alice, money.ether('0'), {from: withdrawAdmin}),
                'check input values!'
            )
        })
        it('try withdrawCustom ALM tokens', async function () {
            await expectRevert(
                this.AliumCashbox.withdrawCustom(this.alm_token.address, alice, money.ether('1'), {from: withdrawAdmin}),
                'Alium token not allowed!'
            )
        })
        it('try withdrawCustom from not withdrawAdmin', async function () {
            await expectRevert(
                this.AliumCashbox.withdrawCustom(this.wbtc_token.address, alice, money.wbtc('1'), {from: alice}),
                'Only withdrawAdmin!'
            )
        })
    })
})
