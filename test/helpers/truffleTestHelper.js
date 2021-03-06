const skipToDate = async (dateString) => {

    // Reference: https://github.com/trufflesuite/ganache-cli
    // No need for smnapshot id if we don't want to revert

    // note seems to skip 1 hour earlier than requested
    let block = await web3.eth.getBlock("latest");
    let ts0 = block.timestamp;
    let ts1 = Math.round(Date.parse(dateString) / 1000);
    let advancement = ts1 - ts0;

    await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [advancement]
    }, function(err, result) {});

    await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        params: []
    }, function(err, result) {});

}

const advanceTimeTo = async (dateString) => {
    // THIS DOES NOT WORK CORRECTLY
    let advancement = Math.round(Date.parse(dateString) / 1000) - Math.round(Date.now() / 1000);
    await advanceTime(advancement);
    await advanceBlock();

    return Promise.resolve(web3.eth.getBlock('latest'));
}

const advanceTimeAndBlock = async (time) => {
    await advanceTime(time);
    await advanceBlock();

    return Promise.resolve(web3.eth.getBlock('latest'));
}

const advanceTime = (time) => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [time],
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err); }
            return resolve(result);
        });
    });
}

const advanceBlock = () => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_mine",
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err); }
            const newBlockHash = web3.eth.getBlock('latest').hash;

            return resolve(newBlockHash)
        });
    });
}

module.exports = {
    advanceTime,
    advanceBlock,
    advanceTimeAndBlock,
    advanceTimeTo,
    skipToDate
}
