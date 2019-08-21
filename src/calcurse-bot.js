/* eslint-disable eqeqeq */

import TelegramBot from 'node-telegram-bot-api';
import conf from '../config';
import { gitUpdate, parseTodoFile } from './parse';

// Create the bot
const bot = new TelegramBot(conf.token, { polling: true });

// TODO create new todo
// TODO read note from todo

const buildTodoString = (todos, completed) => {
  let str = completed ? 'COMPLETED\n' : 'ACTIVE:\n';
  let count = 0;
  if (!todos) return 'ERROR Parsing';
  todos.filter((todo) => completed == todo.completed).forEach((todo) => {
    str += `${count}: ${completed ? '' : `(${todo.priority})`} ${todo.text}\n`;
    count += 1;
  });
  return str;
};

// Listen on sigpipe to parse the diff and detect new/deleted/completed todos
process.on('SIGPIPE', async (signal) => {
  const sentMsg = await bot.sendMessage(conf.privchatid, `Received ${signal}`);

  await bot.editMessageText('Retrieving TODO file from git', {
    chat_id: conf.conf.privchatid,
    message_id: sentMsg.message_id,
  });

  try {
    await gitUpdate();
  } catch (error) {
    console.error(error);
    await bot.editMessageText(`Error: ${error}`, {
      chat_id: conf.privchatid,
      message_id: sentMsg.message_id,
    });
  }

  // TODO parse diff
  await bot.editMessageText('Parsing TODO file diff with last commit', {
    chat_id: conf.privchatid,
    message_id: sentMsg.message_id,
  });
});

// echo
bot.onText(/\/echo (.+)/, (msg, match) => {
  if (msg.chat.id != conf.privchatid) return;
  bot.sendMessage(msg.chat.id, match[1]);
});

// Get a list of active todos
bot.onText(/\/(active|completed)/, async (msg, match) => {
  console.dir(match[1]);
  if (msg.chat.id != conf.privchatid) return;
  const sentMsg = await bot.sendMessage(msg.chat.id, 'Retrieving TODO file from git', {
    reply_to_message_id: msg.message_id,
  });

  try {
    await gitUpdate();
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
    todos = await parseTodoFile();
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

// TODO mark todo as completed
bot.onText(/\/mark (\d+)/, (msg, match) => {
  if (msg.chat.id != conf.conf.privchatid) return;
  bot.sendMessage(msg.chat.id, 'Not yet implemented');
});
