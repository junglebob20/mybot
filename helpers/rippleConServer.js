const RippleAPI = require('ripple-lib').RippleAPI;
const ripple = new RippleAPI({
    server: 'wss://s.altnet.rippletest.net:51233'
}); //'wss://s1.ripple.com' 'wss://s.altnet.rippletest.net:51233'
module.exports=ripple;