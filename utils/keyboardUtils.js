const { Markup } = require('telegraf');

const getMainMenuKeyboard = () => {
    return Markup.keyboard([
        ['Что мы делаем', 'Тарифы и кейсы'],
        ['Оставить заявку', 'Частые вопросы'],
        ['Связаться с нами']
    ]).resize();
};

module.exports = {
    getMainMenuKeyboard
};