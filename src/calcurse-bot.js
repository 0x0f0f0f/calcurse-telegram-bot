/* eslint-disable eqeqeq */

const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const conf = require('../config');
const parse = require('./parseutils');
const Todo = require('./todo');
const Apt = require('./apts');
const git = require('./git');

// Create the bot
const bot = new TelegramBot(conf.token, { polling: true });

const todoFilePath = path.join(conf.gitworkdir, conf.calcursepath, Todo.filename());
const aptsFilePath = path.join(conf.gitworkdir, conf.calcursepath, Apt.filename());

// TODO read note from todo

const buildTodoString = (todos, completed) => {
  let str = completed ? 'COMPLETED\n' : 'ACTIVE:\n';
  let count = 0;
  if (!todos) return 'Error parsing';
  todos.filter((todo) => completed == todo.completed).forEach((todo) => {
    str += `${count}: ${completed ? '' : `[${todo.priority}]`} ${todo.text}\n`;
    count += 1;
  });
  return str;
};

const buildAptsString = (apts) => {
  if (apts.length === 0) return 'No appointment found';
  // TODO read and embed note
  return apts.map((a) => a.toString()).join('\n');
};

// Remove note hash and mark '-' as completed
const buildDiffTodoString = (alteredLines) => alteredLines
  .map((line) => line.replace(/>[\dA-Za-z]+/, ' (NOTE CHANGED)')
    .replace(/\[-/, 'COMPLETED: [')).join('\n');

const buildDiffAptsString = (alteredLines) => alteredLines
  .map((line) => line.replace(/>[\dA-Za-z]+/, ' (NOTE CHANGED)')).join('\n');


// Listen on sigpipe to parse the diff and detect new/deleted/completed todos and appointments
process.on('SIGPIPE', async (signal) => {
  let alteredLines = [];
  try {
    let sentMsg = await bot.sendMessage(conf.privchatid, `Received ${signal}`);
    let editOpts = {
      chat_id: conf.privchatid,
      message_id: sentMsg.message_id,
    };
    await bot.editMessageText('Pulling from git', editOpts);
    await git.cloneOrPull(conf.gitrepourl, conf.gitworkdir);

    // Parse todo diff
    await bot.editMessageText('Parsing last commit diff in todo file', editOpts);
    let diffResult = await git.parseLastCommitDiff(conf.gitworkdir, todoFilePath);
    if (!diffResult || diffResult.status !== 'modified') {
      await bot.deleteMessage(conf.privchatid, sentMsg.message_id);
    } else {
      diffResult.hunks.forEach((hunk) => {
        hunk.lines.forEach((line) => {
          // If first char of the diff line is not + or - ignore the line
          if (line[0] == '-' || line[0] == '+') alteredLines.push(line);
        });
      });
      await bot.editMessageText(`TODOs edited in last commit:\n${buildDiffTodoString(alteredLines)}`, editOpts);
    }

    // Parse apts diff
    sentMsg = await bot.sendMessage(conf.privchatid, 'Parsing last commit diff in apts file');
    editOpts = {
      chat_id: conf.privchatid,
      message_id: sentMsg.message_id,
    };
    diffResult = await git.parseLastCommitDiff(conf.gitworkdir, aptsFilePath);
    if (!diffResult || diffResult.status !== 'modified') {
      await bot.deleteMessage(conf.privchatid, sentMsg.message_id);
    } else {
      alteredLines = [];
      diffResult.hunks.forEach((hunk) => {
        hunk.lines.forEach((line) => {
          // If first char of the diff line is not + or - ignore the line
          if (line[0] == '-' || line[0] == '+') alteredLines.push(line);
        });
      });
      await bot.editMessageText(`Appointments edited in last commit:\n${buildDiffAptsString(alteredLines)}`, editOpts);
    }
  } catch (err) {
    console.error(err);
    await bot.sendMessage(`${err}`);
  }
});

// Get a list of todos
bot.onText(/\/(active|completed)/, async (msg, match) => {
  if (msg.chat.id != conf.privchatid) return;
  try {
    const sentMsg = await bot.sendMessage(msg.chat.id, 'Retrieving file from git', {
      reply_to_message_id: msg.message_id,
    });
    const editOpts = { chat_id: conf.privchatid, message_id: sentMsg.message_id };
    await git.cloneOrPull(conf.gitrepourl, conf.gitworkdir);
    await bot.editMessageText('Parsing todo file', editOpts);
    const todos = await parse.getEntityArray(todoFilePath, Todo);
    await bot.editMessageText(buildTodoString(todos, match[1] == 'completed'), editOpts);
  } catch (err) {
    console.error(err);
    await bot.sendMessage(msg.chat.id, `${err}`);
  }
});

// Add a todo
bot.onText(/\/add (\d+)\s+(.*)/, async (msg, match) => {
  if (msg.chat.id != conf.privchatid) return;
  try {
    // Pull
    await git.cloneOrPull(conf.gitrepourl, conf.gitworkdir);
    // Add new todo
    const tobj = new Todo({
      priority: parseInt(match[1], 10),
      text: match[2],
      completed: false,
      notehash: null,
    });
    await parse.addToFile(todoFilePath, tobj, Todo);
    // Add, commit and push
    await git.add(conf.gitworkdir, path.join(conf.calcursepath, 'todo'));
    await git.commit(conf.gitworkdir, 'todo added by bot');
    await git.push(conf.gitworkdir, 'master');
  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, `${err}`);
    return;
  }

  bot.sendMessage(msg.chat.id, 'todo added');
});

// TODO mark todo as completed
bot.onText(/\/mark (\d+)/, (msg) => {
  if (msg.chat.id != conf.privchatid) return;
  bot.sendMessage(msg.chat.id, 'Not yet implemented');
});

bot.onText(/\/(today|now|week)/, async (msg, match) => {
  if (msg.chat.id != conf.privchatid) return;
  try {
    const sentMsg = await bot.sendMessage(msg.chat.id, 'Retrieving file from git', {
      reply_to_message_id: msg.message_id,
    });
    const editOpts = { chat_id: conf.privchatid, message_id: sentMsg.message_id };
    const now = new Date(Date.now());
    await git.cloneOrPull(conf.gitrepourl, conf.gitworkdir);
    await bot.editMessageText('Parsing apts file', editOpts);
    let apts = await parse.getEntityArray(aptsFilePath, Apt);

    if (match[1] === 'today') apts = apts.filter((a) => a.isSameDay(now));
    if (match[1] === 'now') apts = apts.filter((a) => a.inEventRange(now));

    await bot.editMessageText(buildAptsString(apts), editOpts);
  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, `${err}`);
  }
});
