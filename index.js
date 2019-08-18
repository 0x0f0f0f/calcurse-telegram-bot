const dotenv = require('dotenv')
const TelegramBot = require('node-telegram-bot-api')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')


// Read env variables from .env
dotenv.config()
const token = process.env.TOKEN
const privchatid = process.env.PRIVATECHATID
const calcursepath = process.env.CALCURSEPATH
const gitrepourl = process.env.GITREPOURL

const bot = new TelegramBot(token, {polling: true})

// Parsing regexes
// Parse an active` todo like:
// [2]>13872a7f716e76 Todo text
// first group is priority, second is note hash, third is text
const todoRegexp = /^\[(?<priority>(?<completed>\-)*\d)\](?<notehash>>[\dA-Za-z]+)*\s(?<text>.*)$/
const completedTodoRegexp = /^\[(?<priority>\-\d)\](?<notehash>>[\dA-Za-z]+)*\s(?<text>.*)$/

let todos = []

// TODO observable array notify on new
// TODO create new todo
// TODO read note from todo

const parseTodoFile = async () => {
    let cnt;
    try {
        cnt = fs.readFileSync(path.join(__dirname, 'tmp', calcursepath, 'todo'), 'utf8')
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

const updateThenParse = () => {
    if(fs.existsSync('./tmp')) {
        exec(`git pull`, {cwd: path.join(__dirname, 'tmp')}, (err, stdout, stderr) => {
            console.error(stderr)
            if(err) {
                console.error(`Error while pulling git repo: ${err.code}`)
                bot.sendMessage(privchatid, "ERROR: Could not pull git repo")
            }
            console.log('pulled git repo')
            parseTodoFile()
        })
    } else {
        exec(`git clone ${gitrepourl} ./tmp`, (err, stdout, stderr) => {
            if(err) {
                console.error(`Error while cloning git repo: ${err.code}`)
                bot.sendMessage(privchatid, "ERROR: Could not clone git repo")
            }
            console.log('cloned git repo')
            parseTodoFile()
        })
    }
}


updateThenParse()
setTimeout(updateThenParse, 20000)


// echo
bot.onText(/\/echo (.+)/, (msg, match) => {
    if(msg.chat.id != privchatid) return
    bot.sendMessage(msg.chat.id, match[1])
})

// Get a list of active todos
bot.onText(/\/active/, (msg, match) => {
    if(msg.chat.id != privchatid) return
    parseTodoFile.then(_ => bot.sendMessage(msg.chat.id, buildTodoString(todos, false)))
})

// Get a list of completed todos
bot.onText(/\/completed/, (msg, match) => {
    if(msg.chat.id != privchatid) return
    parseTodoFile.then(_ => bot.sendMessage(msg.chat.id, buildTodoString(todos, true)))
})

// TODO mark todo as completed
bot.onText(/\/mark (\d+)/, (msg, match) => {
    if(msg.chat.id != privchatid) return
    bot.sendMessage(msg.chat.id, "Not yet implemented")
})