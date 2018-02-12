const firebase = require('firebase-admin');
const serviceAccount = require('../credential/xrp-telewallet-bot-firebase-adminsdk-ym12z-ffb58132e2.json');
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: 'https://xrp-telewallet-bot.firebaseio.com'
});
const _db = firebase.database();
module.exports=_db;