const util = require('util');
const path = require('path');
const fs = require('fs');
const exec = util.promisify(require('child_process').exec);
const wtd = require('what-the-diff');

async function cloneOrPull(gitrepourl, gitworkdir) {
  if (fs.existsSync(gitworkdir)) {
    const { stderr } = await exec('git pull -q', { cwd: gitworkdir });
    if (stderr) {
      console.error(stderr);
      throw new Error('Error while pulling git repo');
    }
    console.log('Successfully pulled git repo');
  } else {
    const { stderr } = await exec(`git clone -q ${gitrepourl} ${gitworkdir}`);
    if (stderr) {
      console.error(stderr);
      throw new Error('Error while cloning git repo');
    }
  }
}

async function add(gitworkdir, filepath) {
  // Add to git
  const { stderr } = await exec(`git add ${filepath}`, { cwd: gitworkdir });
  if (stderr) {
    console.error(stderr);
    throw new Error('Error while adding TODO file to git repo');
  }
}

// Commit change
async function commit(gitworkdir, commitmsg) {
  const { stderr } = await exec(`git commit -m "${commitmsg}"`, { cwd: gitworkdir });
  if (stderr) {
    console.error(stderr);
    throw new Error('Error while committing');
  }
}

// Create a commit and push it to the master branch
async function push(gitworkdir, branch) {
  // Push changes
  const { stderr } = await exec(`git push -u origin ${branch}`, { cwd: gitworkdir });
  if (stderr) {
    console.error(stderr);
    throw new Error('Error pushing repository');
  }

  console.log('Successfully pushed git repository');
}

// Parse a diff
async function parseLastCommitDiff(gitworkdir, file) {
  const filepath = path.relative(gitworkdir, file);
  if (!fs.existsSync(gitworkdir)) throw new Error('git repository folder not found');
  const { stdout, stderr } = await exec(`git --no-pager diff --no-color HEAD^^ -- ${filepath} ${filepath}`,
    { cwd: gitworkdir });
  if (stderr) {
    console.error(stderr);
    throw new Error(`Error while diffing file ${filepath}`);
  }
  let result;
  try {
    result = wtd.parse(stdout);
  } catch (err) {
    console.error(err);
    throw new Error(err);
  }
  return result.length > 0 ? result[0] : null;
}

module.exports = {
  cloneOrPull,
  add,
  commit,
  push,
  parseLastCommitDiff,
};
