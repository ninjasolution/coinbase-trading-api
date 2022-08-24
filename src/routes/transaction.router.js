const transaction =  require("../controllers/transaction.controller");

module.exports = (app) => {

    app.post("/api/deposit", transaction.deposit);
    app.post("/api/buy", transaction.buy);
    app.post("/api/sell", transaction.sell);
    app.post("/api/withdraw", transaction.withdraw);

}