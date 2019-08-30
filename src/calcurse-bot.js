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

async function pollDueAppointments() {
  try {
    await git.cloneOrPull(conf.gitrepourl, conf.gitworkdir);
    const now = new Date(Date.now());
    const apts = await parse.getEntityArray(aptsFilePath, Apt);
    const dueToday = apts.filter((a) => a.isSameDay(now));
    const dueTomorrow = apts.filter((a) => a.isTomorrow());

    if (dueToday.length === 0 && dueTomorrow.length === 0) return;
    await bot.sendMessage(conf.privchatid, `Appointments due today:\n${buildAptsString(dueToday)}\n\nDue tomorrow:\n${buildAptsString(dueTomorrow)}`);
  } catch (err) {
    console.error(err);
    await bot.sendMessage(`${err}`);
  }
}

// Listen on sigpipe to parse the diff and detect new/deleted/completed todos and appointments
process.on('SIGPIPE', async (signal) => {
  let alteredLines = [];
  try {
    await bot.sendMessage(conf.privchatid, `Received ${signal}`);
    await git.cloneOrPull(conf.gitrepourl, conf.gitworkdir);

    // Parse todo diff
    let diffResult = await git.parseLastCommitDiff(conf.gitworkdir, todoFilePath);
    if (diffResult && diffResult.status === 'modified') {
      diffResult.hunks.forEach((hunk) => {
        hunk.lines.forEach((line) => {
          // If first char of the diff line is not + or - ignore the line
          if (line[0] == '-' || line[0] == '+') alteredLines.push(line);
        });
      });
      await bot.sendMessage(conf.privchatid, `TODOs edited in last commit:\n${buildDiffTodoString(alteredLines)}`);
    }

    // Parse apts diff
    diffResult = await git.parseLastCommitDiff(conf.gitworkdir, aptsFilePath);
    if (diffResult && diffResult.status === 'modified') {
      alteredLines = [];
      diffResult.hunks.forEach((hunk) => {
        hunk.lines.forEach((line) => {
          // If first char of the diff line is not + or - ignore the line
          if (line[0] == '-' || line[0] == '+') alteredLines.push(line);
        });
      });
      await bot.sendMessage(conf.privchatid, `Appointments edited in last commit:\n${buildDiffAptsString(alteredLines)}`);
    }

    pollDueAppointments();
  } catch (err) {
    console.error(err);
    await bot.sendMessage(`${err}`);
  }
});


pollDueAppointments();
setInterval(pollDueAppointments, conf.dueappointmentspollfreq);

// Get a list of todos
bot.onText(/\/(active|completed)/, async (msg, match) => {
  if (msg.chat.id != conf.privchatid) return;
  try {
    await git.cloneOrPull(conf.gitrepourl, conf.gitworkdir);
    const todos = await parse.getEntityArray(todoFilePath, Todo);
    await bot.sendMessage(msg.chat.id, buildTodoString(todos, match[1] == 'completed'), {
      reply_to_message_id: msg.message_id,
    });
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

// Get appointments
bot.onText(/\/(today|tomorrow|now|week)/, async (msg, match) => {
  if (msg.chat.id != conf.privchatid) return;
  try {
    const now = new Date(Date.now());
    await git.cloneOrPull(conf.gitrepourl, conf.gitworkdir);
    let apts = await parse.getEntityArray(aptsFilePath, Apt);

    if (match[1] === 'today') apts = apts.filter((a) => a.isSameDay(now));
    if (match[1] === 'tomorrow') apts = apts.filter((a) => a.isTomorrow());
    if (match[1] === 'now') apts = apts.filter((a) => a.inEventRange(now));
    if (match[1] === 'week') apts = apts.filter((a) => a.isSameWeek(now));

    await bot.sendMessage(msg.chat.id, buildAptsString(apts), {
      reply_to_message_id: msg.message_id,
    });
  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, `${err}`);
  }
});
