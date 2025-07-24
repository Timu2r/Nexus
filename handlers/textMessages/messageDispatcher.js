const { Markup } = require('telegraf')
const requestHandler = require('./requestHandler')
const { requestStates } = require('./requestHandler')

module.exports = async ctx => {
    const userId = ctx.from.id
    const text = ctx.message.text
    const isInRequestFlow = !!requestStates[userId]

    if (isInRequestFlow) {
        await requestHandler.requestHandler(ctx)
        return
    }

    switch (text) {
        case 'Что мы делаем':
            return ctx.replyWithHTML(
                '<b>🚀 Профессиональные чат-боты для вашего бизнеса</b>\n\n' +
                'Мы создаем интеллектуальных помощников, которые:\n' +
                '• Увеличивают продажи и конверсию\n' +
                '• Автоматизируют поддержку клиентов\n' +
                '• Оптимизируют бизнес-процессы\n\n' +
                '<b>📌 Наши специализации:</b>\n' +
                '• Продающие боты\n' +
                '• Сервисные чат-боты\n' +
                '• HR-автоматизация\n' +
                '• Геймифицированные решения\n' +
                '• AI-интеграции'
            )
            
        case 'Тарифы и кейсы':
            return ctx.replyWithHTML(
                '<b>💎 Наши тарифные планы</b>\n\n' +
                '<b>Базовый</b> — от 10 000 руб.\n' +
                '• Чат-бот с базовой логикой\n' +
                '• Интеграция с 1 каналом\n\n' +
                '<b>Оптимальный</b> — от 20 000 руб.\n' +
                '• Расширенная функциональность\n' +
                '• Мультиканальная интеграция\n\n' +
                '<b>Премиум</b> — от 30 000 руб.\n' +
                '• Индивидуальная разработка\n' +
                '• AI-интеграции\n\n' 
            )
            
        case 'Оставить заявку':
            await requestHandler.requestHandler(ctx)
            return
            
        case 'Частые вопросы':
            return ctx.replyWithHTML(
                '<b>❓ Часто задаваемые вопросы</b>',
                Markup.inlineKeyboard([
                    [Markup.button.callback('💰 Стоимость разработки', 'faq_price')],
                    [Markup.button.callback('⏱️ Сроки реализации', 'faq_time')],
                    [Markup.button.callback('🛠️ Используемые технологии', 'faq_stack')],
                    [Markup.button.callback('🔑 Решение под ключ', 'faq_turnkey')],
                    [Markup.button.callback('🏢 Работа с юридическими лицами', 'faq_legal')]
                ])
            )
            
        case 'Связаться с нами':
            return ctx.replyWithHTML(
                '<b>📩 Контактная информация</b>\n\n' +
                'Мы всегда рады новым проектам и сотрудничеству!\n\n' +
                '<b>Менеджер по работе с клиентами:</b>\n' +
                '@Timu2r\n\n' +
                '<b>Электронная почта:</b>\n' +
                'hamidovtimur123@gmail.com'
            )
            
        default:
            return ctx.reply(
                'Пожалуйста, выберите соответствующий пункт меню для получения информации.'
            )
    }
}