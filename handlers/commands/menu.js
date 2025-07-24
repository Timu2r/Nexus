
const { getMainMenuKeyboard } = require('../../utils/keyboardUtils');

module.exports = (ctx) => {
  return ctx.reply('Главное меню:', getMainMenuKeyboard());
};
