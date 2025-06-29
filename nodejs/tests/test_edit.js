const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {toolFunction} = require('../tools/edit');

function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'edit-'));
  const file = path.join(tmp, 'file.txt');
  fs.writeFileSync(file, 'a\nb\n');
  let result = toolFunction('view', file);
  assert(result.includes('a'));

  result = toolFunction('edit', file, 'new');
  assert(result.includes('overwritten'));
  assert.strictEqual(fs.readFileSync(file, 'utf8'), 'new');

  const newFile = path.join(tmp, 'new.txt');
  result = toolFunction('create', newFile, 'data');
  assert(result.includes('File created'));
  assert.strictEqual(fs.readFileSync(newFile, 'utf8'), 'data');
  console.log('edit tool tests passed');
}

module.exports = run;
