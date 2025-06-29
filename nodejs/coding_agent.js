const fs = require('fs');
const { diffVersusCommit } = require('./git_utils');
const { chatWithAgent, CLAUDE_MODEL } = require('./llm_withtools');

function setupLogger(file) {
  return msg => fs.appendFileSync(file, msg + '\n');
}

class AgenticSystem {
  constructor(opts) {
    this.problemStatement = opts.problemStatement;
    this.gitDir = opts.gitDir;
    this.baseCommit = opts.baseCommit;
    this.chatHistoryFile = opts.chatHistoryFile || './chat_history.md';
    this.testDescription = opts.testDescription;
    this.logger = setupLogger(this.chatHistoryFile);
    this.codeModel = CLAUDE_MODEL;
  }

  getCurrentEdits() {
    return diffVersusCommit(this.gitDir, this.baseCommit);
  }

  async forward() {
    const instruction = `I have uploaded a code repository in ${this.gitDir}. Help solve the following problem.\n\n<problem_description>\n${this.problemStatement}\n</problem_description>\n\n<test_description>\n${this.testDescription || ''}\n</test_description>`;
    await chatWithAgent(instruction, { model: this.codeModel, logging: this.logger });
  }
}

module.exports = {AgenticSystem};
