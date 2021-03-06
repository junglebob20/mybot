const bot=require('./telegrambot.js');
const ripple=require('./rippleConServer.js');
const _db=require('./firebase.js');
const qr = require('qrcode');
const request = require('request-promise');
const rippleKeyPairs = require("ripple-keypairs");
const rippleCheckAddress = require("ripple-address-codec");
const keyboard=require('./keyboards.js');
const rippleHelpers=require('./ripplefunctions.js');

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  _db.ref("users/" + chatId).once("value")
    .then((snapshot) => {
      if (snapshot.val()) {
        bot.sendMessage(chatId, 'Добро пожаловать, ' + msg.chat.first_name + '!\nЭто быстрый и бесплатный кошелек XRP (Ripple).', keyboard.keyboardMain())
          .then(() => {
            bot.sendMessage(chatId, 'Интересующие вас вопросы можете задать в @changebot_ru');
          });
        console.log("Member already exists!");
      } else {
        ripple.connect()
          .then(() => Promise.resolve(ripple.generateAddress()))
          .then((newWallet) => _db.ref('wallets/' + chatId).set({
            address: newWallet.address,
            secret: newWallet.secret,
            balance: 0,
            usd: 0
          }))
          .then(() => _db.ref('users/' + chatId).set({first_name: msg.chat.first_name||null,last_name: msg.chat.last_name||null,username: msg.chat.username||null}))
          .then(() => {
            bot.sendMessage(chatId, 'Добро пожаловать, ' + msg.chat.first_name + '!\nЭто быстрый и бесплатный кошелек XRP (Ripple).', keyboard.keyboardMain());
          }).then(() => {
            bot.sendMessage(chatId, 'Интересующие вас вопросы можете задать в @changebot_ru');
          });;
      }
    });
});


bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  switch (msg.text) {
    case 'Кошелек':
      _db.ref('state/' + chatId).update({
          state: 'Cabinet'
        })
        .then(() => _db.ref("wallets/" + chatId).once("value"))
        .then((snapshot) => {
          Promise.all([rippleHelpers.WalletBalance(snapshot.val().address.toString()), rippleHelpers.MarketValue()])
            .then((result) => {
              console.log(result);
              let usdValue = (result[0].value * result[1].price_usd).toFixed(2);
              _db.ref("wallets/" + chatId).update({
                balance: result[0].value
              });
              _db.ref("wallets/" + chatId).update({
                usd: usdValue
              });
              return result;
            }).then((result) => {
              bot.sendMessage(chatId, 'Ripple кошелек\n\nБаланс: ' + result[0].value + ' XRP\nПримерно: ' + (result[0].value * result[1].price_usd).toFixed(2) + ' USD', keyboard.keyboardWallet());
            }).catch((error) => {
              _db.ref("wallets/" + chatId).update({
                balance: 0,
                usd: 0
              });

              bot.sendMessage(chatId, 'Ripple кошелек\n\n❌ Для активации кошелька Ripple баланс должен быть больше 22 XRP.\n\nБаланс: 0 XRP\nПримерно: 0 USD', keyboard.keyboardWallet());
            });
        });
      break;
    case 'Настройки':
      _db.ref('state/' + chatId).update({
          state: 'Settings'
        })
        .then(() => bot.sendMessage(chatId, '🛠 Настройки\n\n⚠️ Здесь вы можете настроить кошелек по своему усмотрению.\n1. Изменить язык отображения\n2. Получить актуальный курс Ripple.\n3. Импортировать внешний кошелек\n4. Связаться с тех-поддержкой', keyboard.keyboardSetting()));
      break;
    case 'О Сервисе':
      _db.ref('state/' + chatId).update({
        state: 'About'
      }).then(() => bot.sendMessage(chatId, '🚀 О сервисе\n\nНаш сервис это кошелек в котором вы можете хранить XRP(Ripple), а так же делать переводы как, непосредственно, в криптовалюте, так и в USD (по предоставленному курсу).\n\nПо всем техническим вопросам и уточнениям просьба обращаться к оператору on-line поддержки.', keyboard.keyboardAbout()));
      break;
  }
  _db.ref("state/" + chatId + '/state').once("value", state => {
    switch (state.val()) {
      case 'withdraw_Ripple-1':
        const withdraw_address = msg.text;
        _db.ref('wallets/' + chatId).once('value')
          .then((snapshot) => {
            if (snapshot.val().address != withdraw_address) {
              try {
                const address = rippleCheckAddress.decodeAccountID(withdraw_address);
                _db.ref("withdraw-orders/" + chatId).update({
                    withdraw_address: withdraw_address
                  })
                  .then(() => bot.sendMessage(chatId, 'Вставьте deposit tag (опционально)'))
                  .then(() => _db.ref('state/' + chatId).update({
                    state: 'withdraw_Ripple-2'
                  }));
              } catch (error) {
                console.log(error);
                bot.sendMessage(chatId, 'Введен неправельный XRP адрес! Попробуйте еще раз!');
              }
            } else {
              bot.sendMessage(chatId, 'Вывод на актуальный кошелек! Введите адрес XRP еще раз!');
            }
          });
        break;
      case 'withdraw_Ripple-2':
        _db.ref("withdraw-orders/" + chatId).update({
            withdraw_destination_tag: msg.text||null
          })
          .then(() => {
            bot.sendMessage(chatId, 'Сколько XRP вы хотите вывести?')
          })
          .then(() => _db.ref('state/' + chatId).update({
            state: 'withdraw_Ripple-3'
          }));
        break;
      case 'withdraw_Ripple-3':
        const amount = msg.text;
        if (amount.match(/^[0-9]+$/)) {
          _db.ref("wallets/" + chatId).once('value')
            .then((snapshot) => {
              if (parseFloat(amount) > parseFloat(snapshot.val().balance)) {
                bot.sendMessage(chatId, 'Введенная сумма превышет ваш баланс XRP!')
              } else {
                _db.ref("withdraw-orders/" + chatId).update({
                    withdraw_amount: amount.toString()
                  })
                  .then(() => {
                    bot.sendMessage(chatId, 'Вы уверены что хотите отправить средства?\n\n После этого действия средства будут оправлены на указанный адрес. \n\nYes/No')
                  })
                  .then(() => _db.ref('state/' + chatId).update({
                    state: 'withdraw_Ripple-4'
                  }));
              }
            });
        } else {
          bot.sendMessage(chatId, "Введите корректную сумму!");
        }
        break;
      case 'withdraw_Ripple-4':
        if (msg.text.toLowerCase() === 'yes') {
          Promise.all([_db.ref("wallets/" + chatId).once("value"), _db.ref("withdraw-orders/" + chatId).once("value")])
            .then(result => rippleHelpers.payToWallet(result[0].val().address, result[0].val().secret, result[1].val().withdraw_amount, result[1].val().withdraw_address))
            .then((result) => {
              if (result.resultCode === "tesSUCCESS") {
                bot.sendMessage(chatId, 'Вывод осуществлен! Историю транзакций доступна во вкладке Отчеты')
                  .then(() => _db.ref('state/' + chatId).update({
                    state: 'Cabinet'
                  }));
              } else {
                bot.sendMessage(chatId, 'Ой, произошла ошибка, повторите.')
                  .then(() => _db.ref('state/' + chatId).update({
                    state: 'Cabinet'
                  }));
              }
            })
        } else if (msg.text.toLowerCase() === "no") {
          _db.ref('state/' + chatId).update({
              state: 'Cabinet'
            })
            .then(() => _db.ref('withdraw-orders/' + chatId).remove())
            .then(() => bot.sendMessage(chatId, 'Вывод XRP отменен!'));
        } else {
          bot.sendMessage('Подтвердите транзакцию.Yes/No');
        }
        break;
      case 'chanWge_wallet':
        try {
          const secret = msg.text;
          const keypair = rippleKeyPairs.deriveKeypair(secret);
          const address = rippleKeyPairs.deriveAddress(keypair.publicKey);
          _db.ref('wallets/' + chatId).update({
              address: address,
              secret: secret
            })
            .then(() => bot.sendMessage(chatId, 'Ваш новый кошелек: ' + address));
        } catch (error) {
          bot.sendMessage(chatId, 'Неправельный секретный ключ!');
        }
        break;
      case 'faktura-give':
        const faktura_amount = msg.text;
        _db.ref("wallets/" + chatId).once("value")
          .then((snapshot) => {
            if (snapshot.val().balance != '0') {
              if (parseFloat(faktura_amount) > parseFloat(snapshot.val().balance)) {
                bot.sendMessage(chatId, 'Сумма для XRP чека больше вашего баланса! Введите сумму еще раз!');
              } else {
                let url = 'https://chart.googleapis.com/chart?cht=qr&chl=' + 'ripple:' + snapshot.val().address + '?amount=' + faktura_amount + '&chs=250x250&chld=L|0';
                bot.sendPhoto(chatId, url, {
                    caption: 'Передайте этот чек другому человеку для оплаты'
                  })
                  .then(() => _db.ref('state/' + chatId).update({
                    state: 'Cabinet'
                  }));
              }
            } else {
              bot.sendMessage(chatId, 'Недостаточный баланс!');
            }
          });
        break;
    }
  });
});
bot.on('callback_query', (callback_query) => {
  const chatId = callback_query.message.chat.id;
  switch (callback_query.data) {
    case 'buy_Ripple':
      _db.ref('state/' + chatId).update({
          state: 'buy_Ripple'
        })
        .then(() =>
          bot.sendMessage(chatId, '➕ 👛Внести Ripple\n\nДля пополнения XRP с внешнего кошелька используйте многоразовый адрес ниже.\n\nСредства поступают через 1 подтверждение сети.')
          .then(() => _db.ref("wallets/" + chatId + '/address').once("value"))
          .then((snapshot) => bot.sendMessage(chatId, snapshot.val())));
      break;
    case 'withdraw_Ripple':
      bot.sendMessage(chatId,'➖ 👛Вывести Ripple\n\nДля вывода XRP на внешний кошелек воспользуйтесь формой ниже.');
      _db.ref("wallets/" + chatId).once("value")
        .then((snapshot) => {

          if (snapshot.val().balance.toString() != '0') {
            _db.ref('state/' + chatId).update({
                state: 'withdraw_Ripple-1'
              })
              .then(() => _db.ref("withdraw-orders/" + chatId).remove())
              .then(() => {
                Promise.all([rippleHelpers.WalletBalance(snapshot.val().address.toString()), rippleHelpers.MarketValue()])
                  .then((result) => {
                    let usdValue = (result[0].value * result[1].price_usd).toFixed(2);
                    _db.ref("wallets/" + chatId).update({
                      balance: result[0].value
                    });
                    _db.ref("wallets/" + chatId).update({
                      usd: usdValue
                    });
                    return result;
                  }).then((result, error) => {
                    bot.sendMessage(chatId, 'Впишите номер внешнего кошелька ниже.');
                  }).catch((error) => {
                    _db.ref("wallets/" + chatId).update({
                      balance: 0,
                      usd: 0
                    });
                    bot.sendMessage(chatId, '❌ Ошибка!\n\nНа вашем балансе недостаточно средств для вывода на внешний кошелек.\nДля получения доступа к данной услуге, баланс вашего кошелька должен составлять не менее 22 XRP.\n\nМин. сумма: 22 XRP.\nДоступно: 0 XRP');
                  });
              });
          } else {
            bot.sendMessage(chatId, '❌ Ошибка!\n\nНа вашем балансе недостаточно средств для вывода на внешний кошелек.\nДля получения доступа к данной услуге, баланс вашего кошелька должен составлять не менее 22 XRP.\n\nМин. сумма: 22 XRP.\nДоступно: 0 XRP');
          }
        })
      break;
    case 'give_faktura':
      _db.ref('state/' + chatId).update({
          state: 'faktura-give'
        })
        .then(() => _db.ref("wallets/" + chatId).once("value"))
        .then((snapshot) => {
          Promise.all([rippleHelpers.WalletBalance(snapshot.val().address.toString()), rippleHelpers.MarketValue()])
            .then((result) => {
              let usdValue = (result[0].value * result[1].price_usd).toFixed(2);
              _db.ref("wallets/" + chatId).update({
                balance: result[0].value
              });
              _db.ref("wallets/" + chatId).update({
                usd: usdValue
              });
              return result;
            }).then((result, error) => {
              bot.sendMessage(chatId, '✏📝XRP Чек\n\nТребуемая сумма в XRP? (Чек может обналичить любой пользователь, знающий код).\n\nДоступно: ' + result[0].value + ' XRP\nПримерно: ' + (result[0].value * result[1].price_usd).toFixed(2) + ' USD');
            }).catch((error) => {
              _db.ref("wallets/" + chatId).update({
                balance: 0,
                usd: 0
              });
              bot.sendMessage(chatId, '✏📝XRP Чек\n\nТребуемая сумма в XRP? (Чек может обналичить любой пользователь, знающий код).\n\nДоступно: 0 XRP\nПримерно: 0 XRP');
            });
        });
      break;
    case 'give_reports':
    _db.ref('state/' + chatId).update({state: 'give_reports'})
      .then(()=>_db.ref("wallets/" + chatId).once("value"))
        .then((snapshot) => {

          if (snapshot.val().balance != '0') {
            request('https://data.ripple.com/v2/accounts/r9LFPRCT4jRHqeHcgiRGjGMHWkA76nE4Fb/transactions?type=Payment&result=tesSUCCESS&limit=3')
              .then((result) => {
                const keyboardReports = {
                  reply_markup: {
                    inline_keyboard: [
                    ]
                  }
                };
                const reports = JSON.parse(result);
                reports.transactions.forEach(element => {
                    let sendDeposit;
                    let addressDest;
                    const date = new Date(element.date);
                    const newdate = date.toUTCString().slice(5).slice(0,11); //date
                    const transactionId = element.hash;
                    const amountTrans=element.meta.delivered_amount/1000000;
                    if(element.tx.Account===snapshot.val().address){
                      sendDeposit='Send';
                      addressDest=element.tx.Destination;
                    }else{
                      sendDeposit='Receive';
                      address=element.tx.Account;
                    }
                    const text_report=sendDeposit+' '+newdate+' '+amountTrans.toString()+' XRP';
                    keyboardReports.reply_markup.inline_keyboard.push([{text:text_report,callback_data:transactionId}]);
                });
                bot.sendMessage(chatId,'Транзакции с кошелька: '+snapshot.val().address,keyboardReports);
              });
          } else {
            bot.sendMessage(chatId, 'Отчеты будут доступны после активации аккаунта!');
          }
        });
      break;
    case 'chanWge_wallet':
      bot.sendMessage(chatId, 'Для импорта внешнего кошелька введите секретный ключ вашего кошелька.')
        .then(() => _db.ref('state/' + chatId).update({
          state: 'chanWge_wallet'
        }));
      break;
    case 'currency_XRP':
      MarketValue()
        .then((result) => {

          bot.sendMessage(chatId, '💎Ripple Курс\n\n💵Курс XRP/USD: ' + result.price_usd + '\n\n💸Курс XRP/BTC: ' + result.price_btc);
        });
      break;
    case 'get_partners':
      bot.sendMessage(chatId, '🌐Партнеры\n\n📃Здесь представлен список всех компаний и проектов сотрудничающих в предоставлении услуг данным кошельком.')
      break;
    case 'change_language':
      bot.sendMessage(chatId, 'XRP кошелек доступен в следующих языках!', keyboard.keyboardLanguage());
      break;
  }
});
