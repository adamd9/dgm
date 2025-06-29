const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

function getGitCommitHash(repoPath = '.') {
  try {
    return execSync('git rev-parse HEAD', {cwd: repoPath}).toString().trim();
  } catch (e) {
    return null;
  }
}

function diffVersusCommit(repoPath, commit) {
  let output = '';
  try {
    output += execSync(`git diff ${commit}`, {cwd: repoPath}).toString();
    const untracked = execSync('git ls-files --others --exclude-standard', {cwd: repoPath}).toString().split('\n');
    untracked.forEach(f => {
      if (!f) return;
      const devnull = process.platform === 'win32' ? 'NUL' : '/dev/null';
      output += execSync(`git diff --no-index ${devnull} ${f}`, {cwd: repoPath}).toString();
    });
  } catch (e) {
    if (e.stdout) output += e.stdout.toString();
  }
  return output;
}

function resetToCommit(repoPath, commit) {
  try {
    execSync(`git reset --hard ${commit}`, {cwd: repoPath});
    execSync('git clean -fd', {cwd: repoPath});
  } catch (e) {}
}

function applyPatch(repoPath, patchStr) {
  try {
    execSync('git apply --reject -', {cwd: repoPath, input: patchStr});
  } catch (e) {}
}

module.exports = {getGitCommitHash, diffVersusCommit, resetToCommit, applyPatch};
