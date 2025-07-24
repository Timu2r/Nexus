
const { Markup } = require('telegraf');

module.exports = (ctx) => {
  return ctx.replyWithHTML(`<b>👋 Добро пожаловать!</b>

Выберите один из следующих пунктов:`, Markup.keyboard([
    ['Что мы делаем', 'Тарифы и кейсы'],
    ['Оставить заявку', 'Частые вопросы'],
    ['Связаться с нами']
  ]).resize());
};
