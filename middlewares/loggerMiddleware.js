const logger = require('../utils/logger');

module.exports = (ctx, next) => {
  const start = new Date();
  return next().then(() => {
    const ms = new Date() - start;

    if (ctx.message && ctx.message.from && ctx.message.text) {
      const user = ctx.message.from;
      const userName = user.username || `${user.first_name} ${user.last_name || ''}`.trim(); 
      const userId = user.id; 
      const userText = ctx.message.text;

      logger.info(`User: ${userName} (${userId}), Message: "${userText}", Response time: ${ms}ms`);
    } else {

      logger.info(`Non-message update processed, Response time: ${ms}ms`);
    }
  });
};