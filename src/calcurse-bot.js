/* eslint-disable eqeqeq */

const TelegramBot = require('node-telegram-bot-api');
const conf = require('../config');
const parse = require('./parse');

// Create the bot
const bot = new TelegramBot(conf.token, { polling: true });

// TODO create new todo
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

// Remove note hash and mark '-' as completed
const buildDiffTodoString = (alteredLines) => alteredLines
  .map((line) => line.replace(/>[\dA-Za-z]+/, ' (NOTE CHANGED)')
    .replace(/\[-/, 'COMPLETED: [')).join('\n');

// Listen on sigpipe to parse the diff and detect new/deleted/completed todos
process.on('SIGPIPE', async (signal) => {
  const sentMsg = await bot.sendMessage(conf.privchatid, `Received ${signal}`);
  const editMsgOptions = {
    chat_id: conf.privchatid,
    message_id: sentMsg.message_id,
  };

  await bot.editMessageText('Retrieving TODO file from git', editMsgOptions);

  try {
    await parse.gitUpdate(conf.tmpdirpath, conf.gitrepourl);
  } catch (error) {
    console.error(error);
    await bot.editMessageText(`Error: ${error}`, editMsgOptions);
  }

  // TODO parse diff
  await bot.editMessageText('Parsing last commit TODO diff', editMsgOptions);
  const diffResult = await parse.parseTodoDiff(conf.tmpdirpath, conf.calcursepath);

  if (!diffResult || diffResult.status !== 'modified') {
    await bot.deleteMessage(conf.privchatid, sentMsg.message_id);
  }

  const alteredLines = [];

  diffResult.hunks.forEach((hunk) => {
    hunk.lines.forEach((line) => {
      // If first char of the diff line is not + o - ignore the line
      if (line[0] == '-' || line[0] == '+') alteredLines.push(line);
    });
  });

  console.dir(buildDiffTodoString(alteredLines));

  bot.editMessageText(`TODOs edited in last commit:\n${buildDiffTodoString(alteredLines)}`, editMsgOptions);
});

// echo
bot.onText(/\/echo (.+)/, (msg, match) => {
  if (msg.chat.id != conf.privchatid) return;
  bot.sendMessage(msg.chat.id, match[1]);
});

// Get a list of todos
bot.onText(/\/(active|completed)/, async (msg, match) => {
  if (msg.chat.id != conf.privchatid) return;
  const sentMsg = await bot.sendMessage(msg.chat.id, 'Retrieving TODO file from git', {
    reply_to_message_id: msg.message_id,
  });

  try {
    await parse.gitUpdate(conf.tmpdirpath, conf.gitrepourl);
  } catch (error) {
    console.error(error);
    await bot.editMessageText(`Error: ${error}`, {
      chat_id: msg.chat.id,
      message_id: sentMsg.message_id,
    });
  }

  await bot.editMessageText('Parsing TODO file', {
    chat_id: msg.chat.id,
    message_id: sentMsg.message_id,
  });

  let todos;
  try {
    todos = await parse.getTodoArray(conf.tmpdirpath, conf.calcursepath);
  } catch (error) {
    await bot.editMessageText(`Error: ${error}`, {
      chat_id: msg.chat.id,
      message_id: sentMsg.message_id,
    });
  }

  await bot.editMessageText(buildTodoString(todos, match[1] == 'completed'), {
    chat_id: msg.chat.id,
    message_id: sentMsg.message_id,
  });
});

// TODO add todo
bot.onText(/\/add (\d+)\s+(.*)/, async (msg, match) => {
  if (msg.chat.id != conf.privchatid) return;
  try {
    await parse.addTodo(conf.tmpdirpath, conf.calcursepath, {
      priority: parseInt(match[1], 10),
      text: match[2],
      completed: false,
      notehash: null,
    });
  } catch (err) {
    bot.sendMessage(msg.chat.id, `Error: ${err}`);
    return;
  }

  bot.sendMessage(msg.chat.id, 'TODO added');
});


// TODO mark todo as completed
bot.onText(/\/mark (\d+)/, (msg) => {
  if (msg.chat.id != conf.privchatid) return;
  bot.sendMessage(msg.chat.id, 'Not yet implemented');
});
