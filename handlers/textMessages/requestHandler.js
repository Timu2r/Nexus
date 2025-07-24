const { Markup } = require('telegraf')
const logger = require('../../utils/logger')
const { getMainMenuKeyboard } = require('../../utils/keyboardUtils')

const REQUEST_COOLDOWN_MS = 30 * 60 * 1000
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID

const MESSAGES = {
	MAIN_MENU_RETURN: '✅ Вы успешно вернулись в главное меню!',
	COOLDOWN_MESSAGE: minutes =>
		`⏰ Пожалуйста, подождите! Вы сможете оставить новую заявку через ${minutes} минут.`,
	START_REQUEST_PROMPT:
		'📝 <b>Оставить заявку</b>\n\n' +
		'<b>Шаг 1 из 3:</b> Введите ваше имя или название компании: ',
	EMPTY_NAME_ERROR:
		'❌ Имя не может быть пустым. Пожалуйста, введите ваше имя или название компании:',
	CONTACT_PROMPT:
		'<b>Шаг 2 из 3:</b> Введите ваш контакт (телефон или @username Telegram): ',
	EMPTY_CONTACT_ERROR:
		'❌ Контакт не может быть пустым. Пожалуйста, введите ваш телефон или @username:',
	DESCRIPTION_PROMPT:
		'<b>Шаг 3 из 3:</b> Подробно опишите вашу задачу или что нужно сделать: ',
	EMPTY_DESCRIPTION_ERROR:
		'❌ Описание не может быть пустым. Пожалуйста, подробно опишите вашу задачу:',
	REQUEST_SUCCESS:
		'✅ <b>Ваша заявка успешно отправлена!</b>\n\n' +
		'Мы свяжемся с вами в течение 1 рабочего дня. Благодарим за обращение!',
	REQUEST_ERROR:
		'❌ Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже или свяжитесь с нами напрямую.',
	GENERAL_ERROR:
		'❌ Произошла непредвиденная ошибка. Пожалуйста, попробуйте снова или обратитесь в поддержку.',
	REQUEST_CANCELLED:
		'❌ Заполнение заявки отменено. Вы можете начать новую заявку в любое время.',
}

const requestStates = {}
const userCooldowns = {}
const requests = []

const requestHandler = async ctx => {
	const userId = ctx.from.id
	const text = ctx.message?.text

	if (!text) return false

	if (text === '🏠 Главное меню') {
		handleMainMenuReturn(ctx, userId)
		return true
	}

	if (text === 'Оставить заявку' && isUserOnCooldown(userId)) {
		await notifyCooldown(ctx, userId)
		return true
	}

	const isInRequestFlow = !!requestStates[userId]
	if (!isInRequestFlow && text !== 'Оставить заявку') return false

	if (!requestStates[userId]) {
		return startRequestProcess(ctx, userId)
	}

	return processRequestSteps(ctx, userId, text)
}

const processRequestSteps = async (ctx, userId, text) => {
	const state = requestStates[userId]

	try {
		switch (state.step) {
			case 1:
				return handleNameStep(ctx, userId, text)

			case 2:
				return handleContactStep(ctx, userId, text)

			case 3:
				return handleDescriptionStep(ctx, userId, text)

			default:
				await resetRequestState(ctx, userId)
				return true
		}
	} catch (error) {
		logger.error('Ошибка при обработке шага заявки:', error)
		await resetRequestState(ctx, userId)
		return true
	}
}

const handleNameStep = async (ctx, userId, text) => {
	if (!text.trim()) {
		await ctx.reply(MESSAGES.EMPTY_NAME_ERROR)
		return true
	}

	requestStates[userId] = {
		...requestStates[userId],
		name: text.trim(),
		step: 2,
	}

	await ctx.replyWithHTML(MESSAGES.CONTACT_PROMPT)
	return true
}

const handleContactStep = async (ctx, userId, text) => {
	if (!text.trim()) {
		await ctx.reply(MESSAGES.EMPTY_CONTACT_ERROR)
		return true
	}

	requestStates[userId] = {
		...requestStates[userId],
		contact: text.trim(),
		step: 3,
	}

	await ctx.replyWithHTML(MESSAGES.DESCRIPTION_PROMPT)
	return true
}

const handleDescriptionStep = async (ctx, userId, text) => {
	if (!text.trim()) {
		await ctx.reply(MESSAGES.EMPTY_DESCRIPTION_ERROR)
		return true
	}

	const state = requestStates[userId]
	state.description = text.trim()

	try {
		const request = createRequest(ctx, userId, state)
		requests.push(request)

		userCooldowns[userId] = Date.now()

		await sendOwnerNotification(ctx, request)
		await sendUserConfirmation(ctx)

		delete requestStates[userId]

		return true
	} catch (error) {
		logger.error('Ошибка при обработке заявки:', error)
		await handleRequestError(ctx, userId)
		return true
	}
}

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
	},
})

const sendOwnerNotification = async (ctx, request) => {
	if (!OWNER_CHAT_ID) return

	const notificationMessage =
		`🆕 <b>Новая заявка #${request.id}</b>\n\n` +
		`👤 <b>Имя:</b> ${request.name}\n` +
		`📞 <b>Контакт:</b> ${request.contact}\n` +
		`📝 <b>Описание:</b> ${request.description}\n\n` +
		`📅 <b>Дата:</b> ${request.createdAt.toLocaleString('ru-RU')}\n` +
		`🆔 <b>Telegram ID:</b> ${request.userId}` +
		(request.user.username
			? `\n👤 <b>Username:</b> @${request.user.username}`
			: '')

	try {
		await ctx.telegram.sendMessage(OWNER_CHAT_ID, notificationMessage, {
			parse_mode: 'HTML',
		})
	} catch (err) {
		logger.error('Ошибка отправки уведомления владельцу:', err)
	}
}

const sendUserConfirmation = async ctx => {
	await ctx.replyWithHTML(MESSAGES.REQUEST_SUCCESS, getMainMenuKeyboard())
}

const handleRequestError = async (ctx, userId) => {
	delete requestStates[userId]
	await ctx.reply(
		'❌ Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.',
		getMainMenuKeyboard()
	)
}

const startRequestProcess = async (ctx, userId) => {
	requestStates[userId] = { step: 1 }
	await ctx.replyWithHTML(
		MESSAGES.START_REQUEST_PROMPT,
		Markup.keyboard([ ['🏠 Главное меню']]).resize()
	)
	return true
}

const isUserOnCooldown = userId => {
	if (!userCooldowns[userId]) return false

	const lastRequestTime = userCooldowns[userId]
	const now = Date.now()
	return now - lastRequestTime < REQUEST_COOLDOWN_MS
}

const notifyCooldown = async (ctx, userId) => {
	const lastRequestTime = userCooldowns[userId]
	const now = Date.now()
	const remainingTime = REQUEST_COOLDOWN_MS - (now - lastRequestTime)
	const minutes = Math.ceil(remainingTime / (1000 * 60))

	await ctx.reply(MESSAGES.COOLDOWN_MESSAGE(minutes), getMainMenuKeyboard())
}

const handleMainMenuReturn = async (ctx, userId) => {
	if (requestStates[userId]) {
		delete requestStates[userId]
	}
	await ctx.reply(MESSAGES.MAIN_MENU_RETURN, getMainMenuKeyboard())
}

const resetRequestState = async (ctx, userId) => {
	delete requestStates[userId]
	await ctx.reply(
		'❌ Произошла ошибка. Пожалуйста, попробуйте снова.',
		getMainMenuKeyboard()
	)
}

const cancelRequest = async ctx => {
	const userId = ctx.from?.id
	if (!userId) return false

	if (requestStates[userId]) {
		delete requestStates[userId]
		await ctx.reply('❌ Заявка отменена.', getMainMenuKeyboard())
		return true
	}
	return false
}

const getAllRequests = () => [...requests]

module.exports = {
	requestHandler,
	cancelRequest,
	requestStates,
	getAllRequests,
}
