const dotenv = require('dotenv')
const TelegramBot = require('node-telegram-bot-api')
const fs = require('fs')
const path = require('path')

// Read env variables from .env
dotenv.config()
const token = process.env.TOKEN
const privchatid = process.env.PRIVATECHATID
const calcursepath = process.env.CALCURSEPATH

const bot = new TelegramBot(token, {polling: true})

// Parsing regexes
// Parse an active` todo like:
// [2]>13872a7f716e76 Todo text
// first group is priority, second is note hash, third is text
const todoRegexp = /^\[(?<priority>(?<completed>\-)*\d)\](?<notehash>>[\dA-Za-z]+)*\s(?<text>.*)$/
const completedTodoRegexp = /^\[(?<priority>\-\d)\](?<notehash>>[\dA-Za-z]+)*\s(?<text>.*)$/

let todos = []

const parseTodoFile = async () => {
    let cnt;
    try {
        cnt = fs.readFileSync(path.join(calcursepath, 'todo'), 'utf8')
    } catch (err) {
        console.error(err)
        bot.sendMessage(privchatid, "ERROR: Could not read todo file")
    }

    cnt.split("\n").forEach(todostr => {
        // Match if the current todo is active
        let m = todostr.match(todoRegexp)
        if (m != null) {
            todos.push({
                priority: parseInt(m.groups.priority),
                completed: m.groups.completed == "-" ? true : false,
                notehash: m.groups.notehash ? m.groups.notehash.slice(1) : null,
                text: m.groups.text
            })
        }
    });

    console.log("TODO LISTS parsed")
}

const buildTodoString = (todos, completed) => {
    let str = completed ? "COMPLETED\n" : "ACTIVE:\n"
    let count = 0
    todos.filter(todo => completed == todo.completed).forEach(todo => {
        str += `${count}: ` + (completed ? "" : `(${todo.priority}) `) + `${todo.text}\n`
        count++
    })
    return str
}

parseTodoFile()

bot.onText(/\/echo (.+)/, (msg, match) => {
    if(msg.chat.id != privchatid) return
    console.log("Message from: " + msg.chat.id)
    bot.sendMessage(msg.chat.id, match[1])
})


bot.onText(/\/active/, (msg, match) => {
    if(msg.chat.id != privchatid) return
    console.log("Message from: " + msg.chat.id)
    
    bot.sendMessage(msg.chat.id, buildTodoString(todos, false))
})

bot.onText(/\/completed/, (msg, match) => {
    if(msg.chat.id != privchatid) return
    console.log("Message from: " + msg.chat.id)
    
    bot.sendMessage(msg.chat.id, buildTodoString(todos, true))
})