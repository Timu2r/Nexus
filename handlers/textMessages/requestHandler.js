const { Markup } = require('telegraf');
const logger = require('../../utils/logger');
const { getMainMenuKeyboard } = require('../../utils/keyboardUtils');

// Константы
const REQUEST_COOLDOWN_MS = 30 * 60 * 1000; // 30 минут
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID; // ID владельца для уведомлений

// Состояния и хранилища
const requestStates = {};    // Состояние заявки каждого пользователя
const userCooldowns = {};    // Время последней заявки пользователей
const requests = [];        // Временное хранилище заявок в памяти

/**
 * Обработчик заявок
 * @param {object} ctx - Контекст Telegraf
 * @returns {Promise<boolean>} - Обработано ли сообщение
 */
const requestHandler = async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message?.text;

    // Проверка на наличие текста сообщения
    if (!text) return false;

    // Обработка возврата в главное меню
    if (text === '🏠 Главное меню') {
        handleMainMenuReturn(ctx, userId);
        return true;
    }

    // Проверка кулдауна при начале новой заявки
    if (text === 'Оставить заявку' && isUserOnCooldown(userId)) {
        await notifyCooldown(ctx, userId);
        return true;
    }

    // Если пользователь не в процессе заявки и это не команда "Оставить заявку"
    const isInRequestFlow = !!requestStates[userId];
    if (!isInRequestFlow && text !== 'Оставить заявку') return false;

    // Начинаем процесс заявки
    if (!requestStates[userId]) {
        return startRequestProcess(ctx, userId);
    }

    // Обрабатываем шаги заявки
    return processRequestSteps(ctx, userId, text);
};

/**
 * Обработка шагов заявки
 */
const processRequestSteps = async (ctx, userId, text) => {
    const state = requestStates[userId];
    
    try {
        switch (state.step) {
            case 1: // Получаем имя
                return handleNameStep(ctx, userId, text);
                
            case 2: // Получаем контакт
                return handleContactStep(ctx, userId, text);
                
            case 3: // Получаем описание задачи
                return handleDescriptionStep(ctx, userId, text);
                
            default:
                await resetRequestState(ctx, userId);
                return true;
        }
    } catch (error) {
        logger.error('Ошибка при обработке шага заявки:', error);
        await resetRequestState(ctx, userId);
        return true;
    }
};

/**
 * Обработка шага с именем
 */
const handleNameStep = async (ctx, userId, text) => {
    if (!text.trim()) {
        await ctx.reply('❌ Имя не может быть пустым. Пожалуйста, введите ваше имя:');
        return true;
    }
    
    requestStates[userId] = {
        ...requestStates[userId],
        name: text.trim(),
        step: 2
    };
    
    await ctx.replyWithHTML('<b>Шаг 2 из 3:</b> Введите ваш телефон или @username:');
    return true;
};

/**
 * Обработка шага с контактом
 */
const handleContactStep = async (ctx, userId, text) => {
    if (!text.trim()) {
        await ctx.reply('❌ Контакт не может быть пустым. Введите телефон или @username:');
        return true;
    }
    
    requestStates[userId] = {
        ...requestStates[userId],
        contact: text.trim(),
        step: 3
    };
    
    await ctx.replyWithHTML('<b>Шаг 3 из 3:</b> Опишите вашу задачу / что нужно:');
    return true;
};

/**
 * Обработка шага с описанием задачи
 */
const handleDescriptionStep = async (ctx, userId, text) => {
    if (!text.trim()) {
        await ctx.reply('❌ Описание не может быть пустым. Опишите вашу задачу:');
        return true;
    }
    
    const state = requestStates[userId];
    state.description = text.trim();

    try {
        // Создаем и сохраняем заявку
        const request = createRequest(ctx, userId, state);
        requests.push(request);
        
        // Обновляем кулдаун
        userCooldowns[userId] = Date.now();
        
        // Отправляем уведомления
        await sendOwnerNotification(ctx, request);
        await sendUserConfirmation(ctx);
        
        // Очищаем состояние
        delete requestStates[userId];
        
        return true;
    } catch (error) {
        logger.error('Ошибка при обработке заявки:', error);
        await handleRequestError(ctx, userId);
        return true;
    }
};

/**
 * Создание объекта заявки
 */
const createRequest = (ctx, userId, state) => ({
    id: requests.length + 1,
    name: state.name,
    contact: state.contact,
    description: state.description,
    userId: userId,
    createdAt: new Date(),
    user: {
        telegramId: userId,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name || '',
        username: ctx.from.username || '',
    }
});

/**
 * Отправка уведомления владельцу
 */
const sendOwnerNotification = async (ctx, request) => {
    if (!OWNER_CHAT_ID) return;

    const notificationMessage = 
        `🆕 <b>Новая заявка #${request.id}</b>\n\n` +
        `👤 <b>Имя:</b> ${request.name}\n` +
        `📞 <b>Контакт:</b> ${request.contact}\n` +
        `📝 <b>Описание:</b> ${request.description}\n\n` +
        `📅 <b>Дата:</b> ${request.createdAt.toLocaleString('ru-RU')}\n` +
        `🆔 <b>Telegram ID:</b> ${request.userId}` +
        (request.user.username ? `\n👤 <b>Username:</b> @${request.user.username}` : '');

    try {
        await ctx.telegram.sendMessage(
            OWNER_CHAT_ID, 
            notificationMessage, 
            { parse_mode: 'HTML' }
        );
    } catch (err) {
        logger.error('Ошибка отправки уведомления владельцу:', err);
    }
};

/**
 * Отправка подтверждения пользователю
 */
const sendUserConfirmation = async (ctx) => {
    await ctx.replyWithHTML(
        '✅ <b>Спасибо! Мы свяжемся в течение 1 рабочего дня.</b>\n\n' +
        'Ваша заявка принята и передана в обработку.',
        getMainMenuKeyboard()
    );
};

/**
 * Обработка ошибки при создании заявки
 */
const handleRequestError = async (ctx, userId) => {
    delete requestStates[userId];
    await ctx.reply(
        '❌ Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.',
        getMainMenuKeyboard()
    );
};

/**
 * Начало процесса заявки
 */
const startRequestProcess = async (ctx, userId) => {
    requestStates[userId] = { step: 1 };
    await ctx.replyWithHTML(
        '📝 <b>Оставить заявку</b>\n\n' +
        '<b>Шаг 1 из 3:</b> Введите ваше имя:',
        Markup.removeKeyboard()
    );
    return true;
};

/**
 * Проверка кулдауна пользователя
 */
const isUserOnCooldown = (userId) => {
    if (!userCooldowns[userId]) return false;
    
    const lastRequestTime = userCooldowns[userId];
    const now = Date.now();
    return now - lastRequestTime < REQUEST_COOLDOWN_MS;
};

/**
 * Уведомление о кулдауне
 */
const notifyCooldown = async (ctx, userId) => {
    const lastRequestTime = userCooldowns[userId];
    const now = Date.now();
    const remainingTime = REQUEST_COOLDOWN_MS - (now - lastRequestTime);
    const minutes = Math.ceil(remainingTime / (1000 * 60));
    
    await ctx.reply(
        `⏰ Пожалуйста, подождите! Вы сможете оставить новую заявку через ${minutes} минут.`,
        getMainMenuKeyboard()
    );
};

/**
 * Обработка возврата в главное меню
 */
const handleMainMenuReturn = async (ctx, userId) => {
    if (requestStates[userId]) {
        delete requestStates[userId];
    }
    await ctx.reply(
        '✅ Вы успешно вернулись в главное меню!',
        getMainMenuKeyboard()
    );
};

/**
 * Сброс состояния заявки
 */
const resetRequestState = async (ctx, userId) => {
    delete requestStates[userId];
    await ctx.reply(
        '❌ Произошла ошибка. Пожалуйста, попробуйте снова.',
        getMainMenuKeyboard()
    );
};

/**
 * Отмена заявки
 */
const cancelRequest = async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return false;

    if (requestStates[userId]) {
        delete requestStates[userId];
        await ctx.reply(
            '❌ Заявка отменена.',
            getMainMenuKeyboard()
        );
        return true;
    }
    return false;
};

/**
 * Получение всех заявок (для отладки)
 */
const getAllRequests = () => [...requests];

module.exports = {
    requestHandler,
    cancelRequest,
    requestStates,
    getAllRequests
};