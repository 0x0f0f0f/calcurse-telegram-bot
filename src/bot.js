
const TelegramBot = require('node-telegram-bot-api')
const conf = require('../config')
const parse = require('./parse')

// Create the bot
const bot = new TelegramBot(conf.token, {polling: true})

// TODO create new todo
// TODO read note from todo

const buildTodoString = (todos, completed) => {
    let str = completed ? "COMPLETED\n" : "ACTIVE:\n"
    let count = 0
    if(!todos) return "ERROR Parsing"
    todos.filter(todo => completed == todo.completed).forEach(todo => {
        str += `${count}: ` + (completed ? "" : `(${todo.priority}) `) + `${todo.text}\n`
        count++
    })
    return str
}

// echo
bot.onText(/\/echo (.+)/, (msg, match) => {
    if(msg.chat.id != conf.privchatid) return
    bot.sendMessage(msg.chat.id, match[1])
})

// Get a list of active todos
bot.onText(/\/(active|completed)/, async (msg, match) => {
    console.dir(match[1])
    if(msg.chat.id != conf.privchatid) return
    let sent_msg = await bot.sendMessage(msg.chat.id, "Retrieving TODO file from git", { 
        reply_to_message_id: msg.message_id
    })

    try {
        await parse.gitUpdate()
    } catch (error) {
        console.error(error)
        await bot.editMessageText(`Error: ${error}`, {
            chat_id: msg.chat.id,
            message_id: sent_msg.message_id
        })
    }

    await bot.editMessageText("Parsing TODO file", {
        chat_id: msg.chat.id,
        message_id: sent_msg.message_id
    })

    let todos 
    try {
        todos = await parse.parseTodoFile()
    } catch (error) {
        await bot.editMessageText(`Error: ${error}`, {
            chat_id: msg.chat.id,
            message_id: sent_msg.message_id
        })
    }

    await bot.editMessageText(buildTodoString(todos, match[1] == 'completed'), {
        chat_id: msg.chat.id,
        message_id: sent_msg.message_id
    })
    
})

// TODO mark todo as completed
bot.onText(/\/mark (\d+)/, (msg, match) => {
    if(msg.chat.id != conf.privchatid) return
    bot.sendMessage(msg.chat.id, "Not yet implemented")
})
