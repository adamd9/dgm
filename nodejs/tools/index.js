const fs = require('fs');
const path = require('path');

function loadAllTools(logging = console.log) {
  const dir = __dirname;
  const files = fs.readdirSync(dir).filter(f => f !== 'index.js' && f.endsWith('.js'));
  const tools = [];
  for (const file of files) {
    const mod = require(path.join(dir, file));
    if (typeof mod.toolInfo === 'function' && typeof mod.toolFunction === 'function') {
      tools.push({
        info: mod.toolInfo(),
        function: mod.toolFunction,
        name: path.basename(file, '.js')
      });
    } else if (typeof mod.toolInfo === 'function' && typeof mod.runCommand === 'function') {
      tools.push({
        info: mod.toolInfo(),
        function: mod.runCommand,
        name: path.basename(file, '.js')
      });
    } else {
      logging(`Failed to load tool ${file}`);
    }
  }
  return tools;
}

module.exports = { loadAllTools };
