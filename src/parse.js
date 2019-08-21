const util = require('util');
const fs = require('fs');
const path = require('path');
const exec = util.promisify(require('child_process').exec);
const crypto = require('crypto');

const conf = require('../config');

// Parsing regexes
// Parse an active` todo like:
// [2]>13872a7f716e76 Todo text
// first group is priority, second is note hash, third is text
const todoRegexp = /^\[(?<priority>(?<completed>-)*\d)\](?<notehash>>[\dA-Za-z]+)*\s(?<text>.*)$/;

async function gitUpdate() {
  if (fs.existsSync(conf.tmpdirpath)) {
    const { stderr } = await exec('git pull', { cwd: conf.tmpdirpath });
    if (stderr) {
      console.error(stderr);
      throw new Error('Error while pulling git repo');
    }
    console.log('Successfully pulled git repo');
  } else {
    const { stderr } = await exec(`git clone ${conf.gitrepourl} ${conf.tmpdirpath}`);
    if (stderr) {
      console.error(stderr);
      throw new Error('Error while cloning git repo');
    }
    console.log('Successfully cloned git repo');
  }
}


async function parseTodoFile() {
  const todos = new Map();

  const cnt = await fs.promises.readFile(path.join(conf.tmpdirpath, conf.calcursepath, 'todo'), 'utf8');
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


module.exports = {
  gitUpdate, parseTodoFile,
};

'git --no-pager diff -p --no-color --raw HEAD^^ -- calcurse/.calcurse/todo calcurse/.calcurse/todo';
