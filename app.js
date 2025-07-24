
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.use(require('./middlewares/loggerMiddleware'));
bot.use(require('./middlewares/session'));

const startHandler = require('./handlers/commands/start');
const menuHandler = require('./handlers/commands/menu');
const helpHandler = require('./handlers/commands/help');
const messageDispatcher = require('./handlers/textMessages/messageDispatcher');
const faqCallbacks = require('./handlers/callbacks/faqCallbacks');

bot.start(startHandler);
bot.command('menu', menuHandler);
bot.command('help', helpHandler);

bot.on('text', messageDispatcher);

faqCallbacks(bot);

bot.catch(require('./handlers/errorHandler'));

bot.launch(() => {
  console.log('Bot started');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
