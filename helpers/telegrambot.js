const TelegramBot = require('node-telegram-bot-api');
const token = '538229334:AAGW2P-BKVBK5vCMf08qTmGAemNMrPOA2M0';
const bot = new TelegramBot(token, {
    polling: true
});
module.exports=bot;