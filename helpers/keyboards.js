function keyboardMain(){
return {
    reply_markup: {
      keyboard: [
        ['👛 Кошелек'],
        ['🛠 Настройки'],
        ['🚀 О Сервисе']
      ],
      resize_keyboard: true
    }
  };
}
function keyboardWallet(){
  return {
    reply_markup: {
      inline_keyboard: [
        [{
          text: '➕ Внести Ripple',
          callback_data: 'buy_Ripple'
        }],
        [{
          text: '➖ Вывести Ripple',
          callback_data: 'withdraw_Ripple'
        }],
        [{
          text: '📝 XRP Чек',
          callback_data: 'give_faktura'
        }],
        [{
          text: '📑 Отчеты',
          callback_data: 'give_reports'
        }]
      ]
    }
  };
}
function keyboardSetting(){
  return {
    reply_markup: {
      inline_keyboard: [
        [{
          text: '🌍 Язык',
          callback_data: 'change_language'
        }],
        [{
          text: '🔍 Курс Ripple',
          callback_data: 'currency_XRP'
        }],
        [{
          text: '📫 Изменить адрес',
          callback_data: 'chanWge_wallet'
        }],
        [{
          text: '🤖 Тех.Поддержка',
          url: 'https://t.me/filippKuprijanov'
        }]
      ]
    }
  };
}
  function keyboardAbout(){
  return {
    reply_markup: {
      inline_keyboard: [
        [{
          text: '📡 Пользовательский чат',
          url: 'https://t.me/changebot_ru'
        }],
        [{
          text: '🤖 Поддержка',
          url: 'https://t.me/filippKuprijanov'
        }],
        [{
          text: '🌐 Наши партнеры',
          callback_data: 'get_partners'
        }],
        [{
          text: '📖 Условия',
          callback_data: 'get_terms'
        }]
      ]
    }
  };
}
function keyboardLanguage(){
return {
    reply_markup: {
      inline_keyboard: [
        [{
          text: 'EN',
          callback_data: 'change-language-en'
        }, {
          text: 'RU',
          callback_data: 'change-language-ru'
        }]
      ]
    }
  };
}
module.exports={
    keyboardMain,
    keyboardWallet,
    keyboardSetting,
    keyboardAbout,
    keyboardLanguage,
};