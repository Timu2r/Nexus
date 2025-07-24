
const logger = require('../utils/logger');

module.exports = (ctx, next) => {
  const start = new Date();
  return next().then(() => {
    const ms = new Date() - start;
    logger.info('Response time: %sms', ms);
  });
};
