const ripple = require('./rippleConServer.js');
const request = require('request-promise');
function WalletBalance(address) {
    return Promise.resolve(ripple.connect())
        .then(() => Promise.resolve(ripple.getBalances(address)))
        .then(balance => balance[0])
        .then((balance) => {
            ripple.disconnect();
            return balance
        });
}

function MarketValue() {
    return request('https://api.coinmarketcap.com/v1/ticker/ripple/')
        .then((result) => JSON.parse(result))
        .then((result) => result[0]);
}

function payToWallet(source_address, source_secret, source_amount, destination_address) {
    const address = source_address;
    const _secret = source_secret;
    console.log(destination_address);
    const payment = {
      "source": {
        "address": address,
        "maxAmount": {
          "value": source_amount,
          "currency": "XRP",
          "counterparty": "ra6xjUcQy1YWVXBvRvMGQs5TYvAaVY6ckB"
        }
      },
      "destination": {
        "address": destination_address,
        "amount": {
          "value": source_amount,
          "currency": "XRP",
          "counterparty": "ra6xjUcQy1YWVXBvRvMGQs5TYvAaVY6ckB"
        }
      }
    };
    console.log(payment);
    return ripple.connect()
      .then(() => ripple.preparePayment(address, payment))
      .then(prepared => {
        const secret = _secret;
        return ripple.sign(prepared.txJSON, secret);
      })
      .then((signedTransaction) => {
        console.log(signedTransaction.id);
        return ripple.submit(signedTransaction.signedTransaction);
      });
  }
module.exports = {
    WalletBalance,
    MarketValue,
    payToWallet
}