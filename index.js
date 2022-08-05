const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Web3 = require('web3')
const SwapContract = require("./src/blockchain/abis/SwapContract.json");
const TokenContract = require("./src/blockchain/abis/ERC20.json");

const config = require("./src/config");

require('dotenv').config(); 

const app = express();

var corsOptions = {
  origin: "*"
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));


app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') {
      res.status(200).end()
      return;
  }
  // Pass to next layer of middleware
  next();
});

var web3 = null;
var account = null;
var swapContract = null;

app.get("/", (req, res) => {
  return res.send("Welcome!");
});

app.post("/api/swap", async (req, res) => {
  const network = req.body.network;
  const amount = req.body.amount?.toString();
  console.log(config[`usdt${network}Address`])
  const _web3 = new Web3(new Web3.providers.HttpProvider(config[`${network}Provider`]));
  account = _web3.eth.accounts.privateKeyToAccount(config.privateKey)

  web3 = _web3;
  swapContract = new _web3.eth.Contract(SwapContract.abi, config[`swap${network}Address`]);
  const tokenContract = new _web3.eth.Contract(TokenContract.abi, config[`usdt${network}Address`]);
  
  let tx = tokenContract.methods.approve(config[`swap${network}Address`], _web3.utils.toWei(amount));

  try {
    await sendTransaction(tx, tokenContract.options.address);
  }catch (e){
      console.log(e);
  }
  console.log("approved")
  let balance = await tokenContract.methods.allowance(account.address, config[`swap${network}Address`]).call();
  console.log(balance)
  
  tx = swapContract.methods.swapUSDTTOToken(_web3.utils.toWei(amount), req.body.tokenAddress, req.body.recipient);
  //0x8a9424745056Eb399FD19a0EC26A14316684e274
  let signature = "";
  try {
    signature = await sendTransaction(tx, swapContract.options.address);
  }catch (e){
      console.log(e);
  }
  console.log("swapped", signature.transactionHash)
  res.send({success: true, signature: signature.transactionHash })

})

app.get("/api/balance/:network", async (req, res) => {
  const network = req.params.network;
  console.log(network)
  const _web3 = new Web3(new Web3.providers.HttpProvider(config[`${network}Provider`]));
  account = _web3.eth.accounts.privateKeyToAccount(config.privateKey)

  const tokenContract = new _web3.eth.Contract(TokenContract.abi, config[`usdt${network}Address`]);
  
  let balance = await tokenContract.methods.balanceOf(account.address).call();
  
  res.send({balance})

})
const sendTransaction = async (tx, contractAddress) => {
  web3.eth.accounts.wallet.add(config.privateKey);
  const gas = await tx.estimateGas({from: account.address});
  const gasPrice = await web3.eth.getGasPrice();
  const data = tx.encodeABI();
  const nonce = await web3.eth.getTransactionCount(account.address);

  const txData = {
      from: account.address,
      to: contractAddress,
      data: data,
      gas,
      gasPrice,
      nonce, 
  };
  return await web3.eth.sendTransaction(txData);
}




// set port, listen for requests
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
