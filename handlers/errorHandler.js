
const logger = require('../utils/logger');

module.exports = (error, ctx) => {
  logger.error(`Error for ${ctx.updateType}`, error);
  ctx.reply('Что-то пошло не так. Попробуйте еще раз позже.');
};
