const {exec} = require('child_process');

function toolInfo() {
  return {
    name: 'bash',
    description: 'Run commands in a bash shell. Output is returned with any\n' +
      'stderr captured. This command does not have network access.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The bash command to run.'
        }
      },
      required: ['command']
    }
  };
}

function runCommand(command) {
  return new Promise((resolve) => {
    exec(command, {shell: '/bin/bash', timeout: 120000}, (error, stdout, stderr) => {
      if (error) {
        const msg = stderr ? stderr.toString().trim() : error.message;
        resolve(`Error: ${msg}`);
      } else {
        let result = stdout.toString().trim();
        if (stderr && stderr.toString().trim()) {
          result += `\nError:\n${stderr.toString().trim()}`;
        }
        resolve(result.trim());
      }
    });
  });
}

module.exports = { runCommand, toolInfo, toolFunction: runCommand };
