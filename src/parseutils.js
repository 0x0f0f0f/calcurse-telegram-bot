const fs = require('fs');
const crypto = require('crypto');

// TODO generalize in module, pass class as argument
async function parseFile(filepath, Type) {
  const map = new Map();

  const cnt = await fs.promises.readFile(filepath, 'utf8');
  cnt.split('\n').forEach((line) => {
    if (/^\s*$/.test(line)) return; // skip if line empty
    const t = new Type(line);
    if (t == null) return;
    const key = crypto.createHash('sha256').update(JSON.stringify(t)).digest('hex');
    map.set(key, t);
  });
  console.log(`Successfully parsed ${filepath}`);
  return map;
}

async function getEntityArray(filepath, Type) {
  return Array.from((await parseFile(filepath, Type)).values());
}

async function addToFile(filepath, tobj, Type) {
  if (!(tobj instanceof Type)) throw new Error('Inconsistent typing');

  // Get an array of entities from a file, line by line
  let cnt = (await fs.promises.readFile(filepath, 'utf8'))
    .toString().split('\n')
    .filter((line) => !/^\s*$/.test(line)) // skip if line empty);
    .map((line) => new Type(line));

  // Insert new element in array and sort it
  cnt.push(tobj);
  cnt = cnt.sort(Type.sort);

  return fs.promises.writeFile(filepath, cnt.map((el) => el.toString()).join('\n'));
}

module.exports = {
  parseFile,
  getEntityArray,
  addToFile,
};
