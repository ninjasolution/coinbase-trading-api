const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Web3 = require('web3')
const SwapContract = require("./src/blockchain/abis/SwapContract.json");
const TokenContract = require("./src/blockchain/abis/ERC20.json");

const config = require("./src/config");
const Moralis = require("moralis/node");



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

  var inToken = "";
  const network = req.body.network;
  if(!req.body.inToken) {
    res.send({success: false, signature: null, error: "Require Token Symbol or Address!" })
  }else{
    inToken = req.body.inToken;
  }

  var outToken = "";
  if(!req.body.outToken) {
    res.send({success: false, signature: null, error: "Require Token Symbol or Address!" })
  }else {
    outToken = req.body.outToken;
  }

  const amount = req.body.amount?.toString();
  const _web3 = new Web3(new Web3.providers.HttpProvider(config[`${network}Provider`]["node"]));
  account = _web3.eth.accounts.privateKeyToAccount(config.privateKey)

  const recipient = config[`swap${network}Address`];
  if(checkAddress(req.body.recipient)) {
    recipient = req.body.recipient;
  }

  console.log(inToken, outToken, amount, network, "************")

  web3 = _web3;
  swapContract = new _web3.eth.Contract(SwapContract.abi, config[`swap${network}Address`]);

  if(checkAddress(inToken)) {
    const tokenContract = new _web3.eth.Contract(TokenContract.abi, inToken);
    let name = await tokenContract.methods.name().call();
    console.log(name)
    
    let balance = await tokenContract.methods.balanceOf(config[`swap${network}Address`]).call();
    console.log(balance, amount)

    if(!(balance > Math.pow(10, 18) * amount)) {
      
      console.log("before transfer")

      let tx = tokenContract.methods.approve(config[`swap${network}Address`], _web3.utils.toWei(amount));
      let alowanceAmount = await tokenContract.methods.allowance(account.address, config[`swap${network}Address`]).call();
      console.log(alowanceAmount)

      try {
        await sendTransaction(tx, tokenContract.options.address);
      }catch (e){
          console.log(e, "approve error");
      }
      console.log("approved")

      tx = tokenContract.methods.transfer(config[`swap${network}Address`], _web3.utils.toWei(amount));

      try {
        await sendTransaction(tx, tokenContract.options.address);
      }catch (e){
          console.log(e, "transfer error");
      }
      console.log("Token is transfered")
    
    }
    
    console.log("swap enable")  
  }
  


  console.log(inToken, outToken, "---------------")
  let signature = "";
  let netDetails = config[`${network}Provider`];

  if(netDetails.coin === outToken) {
    console.log("tokenToEth", inToken, outToken)
    try {
      signature = await swapTokenToETH(inToken, amount, recipient);
    }catch (e){
      console.log(e);
      return res.send({success: false, signature: null, error: e.toString() })
    }
  }else if(netDetails.coin === inToken) {
    console.log("ethToToken", inToken, outToken)
    try {
      signature = await swapETHToToken(outToken, amount, recipient);
    }catch (e){
      console.log(e);
      return res.send({success: false, signature: null, error: e.toString() })
    }
  }else {
    try {
      console.log("tokenToToken", inToken, outToken)
      signature = await swapTokenToToken(inToken, amount, outToken, recipient);
    }catch (e){
      console.log(e);
      return res.send({success: false, signature: null, error: e.toString() })
    }  
  }
  
  console.log("swapped", signature.transactionHash)
  return res.send({success: true, signature: signature.transactionHash, error: null })

})

app.get("/api/balance/:network", async (req, res) => {
  const network = req.params.network;
  console.log(network)
  const _web3 = new Web3(new Web3.providers.HttpProvider(config[`${network}Provider`]["node"]));
  account = _web3.eth.accounts.privateKeyToAccount(config.privateKey)

  const tokenContract = new web3.eth.Contract(TokenContract.abi, config[`usdt${network}Address`]);
  
  let balance = await tokenContract.methods.balanceOf(account.address).call();
  
  res.send({balance})

})

const swapETHToToken = async (outToken, amount, recipient) => {
  console.log(web3.utils.toWei(amount))
  let tx = swapContract.methods.swapETHToToken(web3.utils.toWei(amount), outToken, recipient);
  let signature = await sendTransaction(tx, swapContract.options.address);
  return signature;
}

const swapTokenToETH = async (inToken, amount, recipient) => {
  let tx = swapContract.methods.swapTokenToETH(inToken, web3.utils.toWei(amount), recipient);
  let signature = await sendTransaction(tx, swapContract.options.address);
  return signature;
}


const swapTokenToToken = async (inToken, amount, outToken, recipient) => {
  console.log(inToken, amount, outToken, recipient)
  let tx = swapContract.methods.swapTokenToToken(inToken, web3.utils.toWei(amount), outToken, recipient);
  let signature = await sendTransaction(tx, swapContract.options.address);
  return signature;
}


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

const checkAddress = address => {
  if(address && address.length === 42) {
    return true;
  }else {
    return false;
  }
}


// set port, listen for requests
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
