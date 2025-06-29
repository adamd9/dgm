const assert = require('assert');
const {runCommand} = require('../tools/bash');

async function run() {
  let result = await runCommand("echo 'hello world'");
  assert(result.includes('hello world'));

  result = await runCommand('ls /nonexistent/directory');
  assert(result.includes('Error'));
  console.log('bash tool tests passed');
}

module.exports = run;
