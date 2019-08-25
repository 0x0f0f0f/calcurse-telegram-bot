const util = require('util');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const wtd = require('what-the-diff');

const exec = util.promisify(require('child_process').exec);


// Parsing regexes
// Parse an active` todo like:
// [2]>13872a7f716e76 Todo text
// first group is priority, second is note hash, third is text
const todoRegexp = /^\[(?<priority>(?<completed>-)*\d)\](?<notehash>>[\dA-Za-z]+)*\s(?<text>.*)$/;

// Parse a string and extract a todo object
function unmarshalTodo(todostr) {
  const m = todostr.match(todoRegexp);
  if (m == null) return m;
  return {
    priority: Math.abs(parseInt(m.groups.priority, 10)),
    completed: m.groups.completed === '-',
    notehash: m.groups.notehash ? m.groups.notehash.slice(1) : null,
    text: m.groups.text,
  };
}

// Convert a todo object to a string
function marshalTodo(t) {
  return `[${t.completed ? '-' : ''}${t.priority}]${t.notehash != null ? `>${t.notehash}` : ''} ${t.text}`;
}


async function parseTodoFile(tmpdirpath, calcursepath) {
  const todos = new Map();

  const cnt = await fs.promises.readFile(path.join(tmpdirpath, calcursepath, 'todo'), 'utf8');
  cnt.split('\n').forEach((todostr) => {
    const t = unmarshalTodo(todostr);
    if (t == null) return;
    const key = crypto.createHash('sha256').update(JSON.stringify(t)).digest('hex');
    todos.set(key, t);
  });
  console.log('Successfully parsed todo list');
  // return Array.from(todos.values());
  return todos;
}

async function getTodoArray(tmpdirpath, calcursepath) {
  return Array.from((await parseTodoFile(tmpdirpath, calcursepath)).values());
}

// Read and parse the TODO file diff with last commit in dotfiles folder
async function parseTodoDiff(tmpdirpath, calcursepath) {
  if (!fs.existsSync(tmpdirpath)) throw new Error('git repository folder not found');
  const { stdout, stderr } = await exec(`git --no-pager diff --no-color HEAD^^ -- ${path.join(calcursepath, 'todo')} ${path.join(calcursepath, 'todo')}`,
    { cwd: tmpdirpath });
  if (stderr) {
    console.error(stderr);
    throw new Error('Error while diffing TODO file');
  }
  let result;
  try {
    result = wtd.parse(stdout);
  } catch (err) {
    console.error(err);
    throw new Error(err);
  }
  return result[0];
}

async function addTodo(tmpdirpath, calcursepath, tobj) {
  if (!fs.existsSync(tmpdirpath)) throw new Error('git repository folder not found');
  if (tobj.priority < 0 || tobj.priority > 9) throw new Error('priority must be between 0 and 9');

  // Get an array of todo objects in the todo file
  let cnt = (await fs.promises.readFile(path.join(tmpdirpath, calcursepath, 'todo'), 'utf8'))
    .toString().split('\n')
    .map((l) => unmarshalTodo(l))
    .filter((l) => l !== null);

  // Insert new todo in array
  cnt.push(tobj);

  cnt = cnt.sort((todo1, todo2) => {
    // Separate by completion
    if (todo1.completed && todo2.completed) return 0;
    if (todo1.completed && !todo2.completed) return 1;
    if (!todo1.completed && todo2.completed) return -1;
    // Sort by priority
    if (todo1.priority === 0) return 1;
    if (todo1.priority > todo2.priority) return 1;
    if (todo1.priority < todo2.priority) return -1;
    // If priority is the same sort by text alphabetically
    if (todo1.text > todo2.text) return 1;
    if (todo1.text < todo2.text) return -1;
    return 0;
  });

  return fs.promises.writeFile(path.join(tmpdirpath, calcursepath, 'todo'),
    cnt.map((l) => marshalTodo(l)).join('\n'));
}

async function markTodo(tmpdirpath, calcursepath, todoline) {
  return 'TODO';
}

module.exports = {
  parseTodoFile,
  parseTodoDiff,
  getTodoArray,
  addTodo,
  marshalTodo,
  markTodo,
};
