const fs = require('fs');
const path = require('path');

function toolInfo() {
  return {
    name: 'editor',
    description: 'Custom editing tool for viewing, creating and editing files.\n' +
      'Use absolute paths when specifying the file.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['view', 'create', 'edit'],
          description: 'The command to run.'
        },
        path: { type: 'string', description: 'Absolute file path.' },
        file_text: {
          type: 'string',
          description: 'Content for create or edit commands.'
        }
      },
      required: ['command', 'path']
    }
  };
}

function maybeTruncate(content, maxLength = 10000) {
  if (content.length > maxLength) {
    return content.slice(0, maxLength) + '\n<response clipped>';
  }
  return content;
}

function validatePath(p, command) {
  if (!path.isAbsolute(p)) {
    throw new Error(`The path ${p} is not an absolute path (must start with '/')`);
  }
  if (command === 'view') {
    if (!fs.existsSync(p)) {
      throw new Error(`The path ${p} does not exist.`);
    }
  } else if (command === 'create') {
    if (fs.existsSync(p)) {
      throw new Error(`Cannot create new file; ${p} already exists.`);
    }
  } else if (command === 'edit') {
    if (!fs.existsSync(p)) {
      throw new Error(`The file ${p} does not exist.`);
    }
    if (fs.lstatSync(p).isDirectory()) {
      throw new Error(`${p} is a directory and cannot be edited as a file.`);
    }
  } else {
    throw new Error(`Unknown or unsupported command: ${command}`);
  }
}

function formatOutput(content, filePath) {
  content = maybeTruncate(content);
  const lines = content.replace(/\t/g, '    ').split('\n');
  const numbered = lines.map((l, i) => `${String(i + 1).padStart(6)}\t${l}`);
  return `Here's the result of running \`cat -n\` on ${filePath}:\n` + numbered.join('\n') + '\n';
}

function viewPath(p) {
  if (fs.lstatSync(p).isDirectory()) {
    const result = [];
    const items = fs.readdirSync(p, {withFileTypes: true});
    items.forEach(item => {
      if (item.name.startsWith('.')) return;
      const full = path.join(p, item.name);
      result.push(full);
      if (item.isDirectory()) {
        const sub = fs.readdirSync(full, {withFileTypes: true});
        sub.forEach(subItem => {
          if (subItem.name.startsWith('.')) return;
          result.push(path.join(full, subItem.name));
        });
      }
    });
    return `Here's the files and directories up to 2 levels deep in ${p}, excluding hidden items:\n` + result.join('\n');
  } else {
    const content = fs.readFileSync(p, 'utf8');
    return formatOutput(content, p);
  }
}

function toolFunction(command, filePath, fileText) {
  try {
    validatePath(filePath, command);
    if (command === 'view') {
      return viewPath(filePath);
    } else if (command === 'create') {
      if (fileText === undefined) throw new Error('Missing required `file_text` for create command.');
      fs.writeFileSync(filePath, fileText);
      return `File created successfully at: ${filePath}`;
    } else if (command === 'edit') {
      if (fileText === undefined) throw new Error('Missing required `file_text` for edit command.');
      fs.writeFileSync(filePath, fileText);
      return `File at ${filePath} has been overwritten with new content.`;
    }
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

module.exports = { toolFunction, toolInfo };
