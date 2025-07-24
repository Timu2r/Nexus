const { Markup } = require('telegraf');

const faqCallbacks = (bot) => {
    const backToFaqMenuButton = Markup.inlineKeyboard([
        [Markup.button.callback('↩️ Назад к вопросам', 'back_to_faq_menu')]
    ]);

    bot.action('faq_price', (ctx) => {
        return ctx.editMessageText(
            '💰 <b>Сколько стоит разработка бота?</b>\n\n' +
            'Стоимость зависит от его сложности и функционала, который вам нужен. ' +
            'Наши тарифы начинаются <b>от 10 000 рублей.</b> ' +
            'Для точного расчёта рекомендуем обсудить ваш проект с нами!',
            { parse_mode: 'HTML', reply_markup: backToFaqMenuButton.reply_markup }
        );
    });

    bot.action('faq_time', (ctx) => {
        return ctx.editMessageText(
            '⏰ <b>Сколько времени займёт разработка?</b>\n\n' +
            'Сроки напрямую зависят от функционала и сложности вашего проекта. ' +
            'В среднем, разработка занимает <b>от 1 до 4 недель.</b> ' +
            'Мы всегда стремимся выполнять работу качественно и в срок!',
            { parse_mode: 'HTML', reply_markup: backToFaqMenuButton.reply_markup }
        );
    });

    bot.action('faq_stack', (ctx) => {
        return ctx.editMessageText(
            '🛠️ <b>Какие технологии мы используем?</b>\n\n' +
            'Для создания надёжных и современных ботов мы применяем передовые технологии: ' +
            '<b>Node.js, Python, Telegraf, Prisma, PostgreSQL</b> и другие проверенные инструменты. ' +
            'Это гарантирует высокое качество и стабильность вашего бота.',
            { parse_mode: 'HTML', reply_markup: backToFaqMenuButton.reply_markup }
        );
    });

    bot.action('faq_turnkey', (ctx) => {
        return ctx.editMessageText(
            '🔑 <b>Вы разрабатываете ботов "под ключ"?</b>\n\n' +
            'Да, мы предлагаем <b>полный цикл разработки</b> — от вашей идеи до запуска и последующей поддержки. ' +
            'Вам не придётся беспокоиться ни о чём, мы возьмём на себя все этапы!',
            { parse_mode: 'HTML', reply_markup: backToFaqMenuButton.reply_markup }
        );
    });

    bot.action('faq_legal', (ctx) => {
        return ctx.editMessageText(
            '🏢 <b>Вы работаете с юридическими лицами?</b>\n\n' +
            'Безусловно! Мы сотрудничаем с юридическими лицами и предоставляем <b>все необходимые документы</b> ' +
            'для официального оформления сотрудничества (договоры, акты и т.д.).',
            { parse_mode: 'HTML', reply_markup: backToFaqMenuButton.reply_markup }
        );
    });

    bot.action('back_to_faq_menu', (ctx) => {
        return ctx.editMessageText(
            '<b>❓ Частые вопросы:</b>',
            {
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('Сколько стоит бот?', 'faq_price')],
                    [Markup.button.callback('За сколько вы сделаете?', 'faq_time')],
                    [Markup.button.callback('Какие технологии используете?', 'faq_stack')],
                    [Markup.button.callback('Можете ли сделать под ключ?', 'faq_turnkey')],
                    [Markup.button.callback('Работаете с юр. лицами?', 'faq_legal')]
                ]).reply_markup
            }
        );
    });
};

module.exports = faqCallbacks;