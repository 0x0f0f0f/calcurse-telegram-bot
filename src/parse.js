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
    priority: parseInt(m.groups.priority, 10),
    completed: m.groups.completed === '-',
    notehash: m.groups.notehash ? m.groups.notehash.slice(1) : null,
    text: m.groups.text,
  };
}

// Convert a todo object to a string
function marshalTodo(t) {
  return `[${t.completed ? '-' : ''}${t.priority}]${t.notehash != null ? `>${t.notehash}` : ''} ${t.text}`;
}

async function gitUpdate(tmpdirpath, gitrepourl) {
  if (fs.existsSync(tmpdirpath)) {
    const { stderr } = await exec('git pull', { cwd: tmpdirpath });
    if (stderr) {
      console.error(stderr);
      throw new Error('Error while pulling git repo');
    }
    console.log('Successfully pulled git repo');
  } else {
    const { stderr } = await exec(`git clone ${gitrepourl} ${tmpdirpath}`);
    if (stderr) {
      console.error(stderr);
      throw new Error('Error while cloning git repo');
    }
    console.log('Successfully cloned git repo');
  }
}

// Create a commit and push it to the master branch
async function gitPushTodos(tmpdirpath, calcursepath, commitmsg) {
  // Add to git
  const { stderr } = await exec(`git add ${path.join(calcursepath, 'todo')}`, { cwd: tmpdirpath });
  if (stderr) {
    console.error(stderr);
    throw new Error('Error while adding TODO file to git repo');
  }

  // Commit change
  const { stderr1 } = await exec(`git commit -m "${commitmsg}"`, { cwd: tmpdirpath });
  if (stderr1) {
    console.error(stderr1);
    throw new Error('Error while committing TODO file to git repo');
  }

  // Push changes
  const { stderr2 } = await exec(`git push -u origin master`, { cwd: tmpdirpath });
  if (stderr2) {
    console.error(stderr2);
    throw new Error('Error while committing TODO file to git repo');
  }
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
  
  const todostr = marshalTodo(tobj);
  
  // TODO find line number where to insert todo in file

  const lineNumber = 0;

  const cnt = (await fs.promises.readFile(path.join(tmpdirpath, calcursepath, 'todo'), 'utf8')).toString().split('\n');

  cnt.splice(lineNumber, 0, marshalTodo);

  await fs.promises.writeFile(path.join(calcursepath, 'todo'), cnt.join('\n'));
  await gitPushTodos(tmpdirpath, calcursepath, 'Todo added by bot');
}

async function markTodo(tmpdirpath, calcursepath, todoline) {
  return 'TODO';
}

module.exports = {
  gitUpdate,
  parseTodoFile,
  parseTodoDiff,
  getTodoArray,
  addTodo,
  marshalTodo,
  markTodo,
};
