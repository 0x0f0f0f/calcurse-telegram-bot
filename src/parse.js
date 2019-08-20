const util = require('util')
const fs = require('fs')
const path = require('path')
const exec = util.promisify(require('child_process').exec)
const crypto = require('crypto')

const conf = require('../config')

// Parsing regexes
// Parse an active` todo like:
// [2]>13872a7f716e76 Todo text
// first group is priority, second is note hash, third is text
const todoRegexp = /^\[(?<priority>(?<completed>\-)*\d)\](?<notehash>>[\dA-Za-z]+)*\s(?<text>.*)$/
const completedTodoRegexp = /^\[(?<priority>\-\d)\](?<notehash>>[\dA-Za-z]+)*\s(?<text>.*)$/


async function gitUpdate() {
    if(fs.existsSync(conf.tmpdirpath)) {
        const { stdout, stderr } = await exec(`git pull`, {cwd: conf.tmpdirpath})
        if(stderr) {
            console.error(stderr)
            throw new Error(`Error while pulling git repo`)
        }
        console.log('Successfully pulled git repo')
        return 
    } else {
        const { stdout, stderr } = await  exec(`git clone ${conf.gitrepourl} ${conf.tmpdirpath}`)
        if(stderr) {
            console.error(stderr)
            throw new Error(`Error while cloning git repo`)
        }
        console.log('Successfully cloned git repo')
        return
    }
}


async function parseTodoFile () {
    let cnt
    let todos = new Map()
    
    cnt = await fs.promises.readFile(path.join(conf.tmpdirpath, conf.calcursepath, 'todo'), 'utf8')
    cnt.split("\n").forEach(todostr => {
        // Match if the current todo is active
        let m = todostr.match(todoRegexp)
        if (m != null) {
            let t = {
                priority: parseInt(m.groups.priority),
                completed: m.groups.completed == "-" ? true : false,
                notehash: m.groups.notehash ? m.groups.notehash.slice(1) : null,
                text: m.groups.text
            }
            let key = crypto.createHash('sha256').update(JSON.stringify(t)).digest('hex')
            todos.set(key, t)
        }
    });
    console.log("Successfully parsed todo list")
    return Array.from(todos.values())
}


module.exports = {
    gitUpdate,  parseTodoFile
}