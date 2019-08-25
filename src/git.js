const util = require('util');
const fs = require('fs');
const exec = util.promisify(require('child_process').exec);

async function cloneOrPull(gitrepourl, tmpdirpath) {
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

async function add(filepath, repopath) {
  // Add to git
  const { stderr } = await exec(`git add ${filepath}`, { cwd: repopath });
  if (stderr) {
    console.error(stderr);
    throw new Error('Error while adding TODO file to git repo');
  }
}

async function commit(commitmsg, repopath) {
  // Commit change
  const { stderr } = await exec(`git commit -m "${commitmsg}"`, { cwd: repopath });
  if (stderr) {
    console.error(stderr);
    throw new Error('Error while committing TODO file to git repo');
  }
}

// Create a commit and push it to the master branch
async function push(repopath, branch) {
  // Push changes
  const { stderr } = await exec(`git push -u origin ${branch}`, { cwd: repopath });
  if (stderr) {
    console.error(stderr);
    throw new Error('Error while committing TODO file to git repo');
  }

  console.log('Successfully pushed new todos to git repo');
}

module.exports = {
  cloneOrPull,
  add,
  commit,
  push,
};
