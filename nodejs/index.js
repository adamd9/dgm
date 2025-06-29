const minimist = require('minimist');
const {AgenticSystem} = require('./coding_agent');

const args = minimist(process.argv.slice(2));

const system = new AgenticSystem({
  problemStatement: args.problem_statement,
  gitDir: args.git_dir || '.',
  baseCommit: args.base_commit || 'HEAD',
  chatHistoryFile: args.chat_history_file || './chat_history.md',
  testDescription: args.test_description
});

system.forward();
