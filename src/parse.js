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


async function parseTodoFile(tmpdirpath, calcursepath) {
  const todos = new Map();

  const cnt = await fs.promises.readFile(path.join(tmpdirpath, calcursepath, 'todo'), 'utf8');
  cnt.split('\n').forEach((todostr) => {
    // Match if the current todo is active
    const m = todostr.match(todoRegexp);
    if (m != null) {
      const t = {
        priority: parseInt(m.groups.priority, 10),
        completed: m.groups.completed === '-',
        notehash: m.groups.notehash ? m.groups.notehash.slice(1) : null,
        text: m.groups.text,
      };
      const key = crypto.createHash('sha256').update(JSON.stringify(t)).digest('hex');
      todos.set(key, t);
    }
  });
  console.log('Successfully parsed todo list');
  return Array.from(todos.values());
}

// Read and parse the TODO file diff with last commit in dotfiles folder
async function parseTodoDiff(tmpdirpath, calcursepath) {
  if (fs.existsSync(tmpdirpath)) {
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
  throw new Error('git repository folder not found');
}

module.exports = {
  gitUpdate, parseTodoFile, parseTodoDiff,
};
