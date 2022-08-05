const { privateKey } = require("../config");
const { Interface } = require('@ethersproject/abi');

class Service {

    constructor() {
        this.web3 = null;
        this.account = null;
        this.swapBSCContract = null;
        this.swapETHContract = null;
    }

    async swapBSC(amount, tokenAddr, recipient) {

        let tx = this.swapBSCContract.methods.swapUSDTTOToken(amount, tokenAddr, recipient);

        try {
            await this.sendTransaction(tx, this.swapBSCContract.options.address);
        }catch (e){
            console.log(e);
        }
    }

    async swapETH(amount, tokenAddr, recipient) {

        let tx = this.swapBSCContract.methods.swapUSDTTOToken(amount, tokenAddr, recipient);

        try {
            await this.sendTransaction(tx, this.swapBSCContract.options.address);
        }catch (e){
            console.log(e);
        }
    }


    async sendTransaction(tx, contractAddress) {
        this.web3.eth.accounts.wallet.add(privateKey);
        const gas = await tx.estimateGas({from: this.account.address});
        const gasPrice = await this.web3.eth.getGasPrice();
        const data = tx.encodeABI();
        const nonce = await this.web3.eth.getTransactionCount(this.account.address);

        const txData = {
            from: this.account.address,
            to: contractAddress,
            data: data,
            gas,
            gasPrice,
            nonce, 
        };
        return await this.web3.eth.sendTransaction(txData);
    }
}

module.exports = new Service();
