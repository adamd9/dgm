const fs = require('fs');
const path = require('path');
const Docker = require('dockerode');
const { createClient, getResponseFromLLM, extractJSONBetweenMarkers } = require('./llm');

function logToFile(file, msg) {
  fs.appendFileSync(file, msg + '\n');
}

async function removeExistingContainer(docker, name, logger) {
  try {
    const container = docker.getContainer(name);
    await container.inspect();
    logger(`Removing existing container ${name}`);
    await container.stop();
    await container.remove();
  } catch (e) {
    // Container does not exist
  }
}

async function createContainer(docker, name, logger) {
  logger('Creating container');
  return docker.createContainer({
    Image: 'dgm',
    name,
    WorkingDir: '/dgm',
  });
}

async function execInContainer(container, cmd, logger) {
  const exec = await container.exec({
    Cmd: ['sh', '-lc', cmd],
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start();
  return new Promise((resolve, reject) => {
    let output = '';
    stream.on('data', (chunk) => {
      const s = chunk.toString();
      output += s;
      logger(s.trim());
    });
    stream.on('end', () => resolve(output));
    stream.on('error', reject);
  });
}

async function copyFileFromContainer(container, src, dest, logger) {
  const exec = await container.exec({
    Cmd: ['cat', src],
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start();
  return new Promise((resolve, reject) => {
    let output = '';
    stream.on('data', (chunk) => {
      output += chunk.toString();
    });
    stream.on('end', () => {
      fs.writeFileSync(dest, output);
      logger(`Copied ${src} to ${dest}`);
      resolve();
    });
    stream.on('error', reject);
  });
}

async function cleanupContainer(container, logger) {
  logger('Cleaning up container');
  await container.stop();
  await container.remove();
}

async function diagnoseProblem(entry, commit, logger) {
  const [client, model] = createClient('o1-2024-12-17');
  const sys = 'You are a helpful assistant that summarizes issues.';
  const prompt = `Diagnose the bug for task ${entry} at commit ${commit}.`;
  try {
    const [resp] = await getResponseFromLLM({ msg: prompt, client, model, systemMessage: sys });
    const json = extractJSONBetweenMarkers(resp);
    return json && (json.problem_statement || json.problemStatement);
  } catch (e) {
    logger(`Failed to diagnose problem: ${e}`);
    return null;
  }
}

async function selfImprove(opts) {
  const {
    parentCommit = 'initial',
    outputDir = './output_selfimprove',
    entry = 'django__django-10999',
    forceRebuild = false,
  } = opts || {};

  fs.mkdirSync(outputDir, { recursive: true });
  const logFile = path.join(outputDir, 'self_improve.log');
  const logger = logToFile.bind(null, logFile);
  logger('Self improvement step starting');

  const docker = new Docker();
  const runId = Date.now().toString();
  const containerName = `dgm-container-${runId}`;
  await removeExistingContainer(docker, containerName, logger);
  const container = await createContainer(docker, containerName, logger);
  await container.start();

  await execInContainer(container, "git add --all && git -c user.name='u' -c user.email='u@e' commit -m 'tmp'", logger);
  await execInContainer(container, 'python -m pip install -r requirements.txt', logger);

  const problem = await diagnoseProblem(entry, parentCommit, logger);
  if (!problem) {
    logger('Problem diagnosis failed');
    await cleanupContainer(container, logger);
    return;
  }

  const cmd = [
    'python /dgm/coding_agent.py',
    `--problem_statement "${problem.replace(/"/g, '\\"')}"`,
    '--git_dir /dgm/',
    '--chat_history_file /dgm/self_evo.md',
    `--base_commit ${parentCommit}`,
    '--outdir /dgm/',
    '--self_improve',
  ].join(' ');
  await execInContainer(container, cmd, logger);

  await copyFileFromContainer(container, '/dgm/self_evo.md', path.join(outputDir, 'self_evo.md'), logger);
  await copyFileFromContainer(container, '/dgm/model_patch.diff', path.join(outputDir, 'model_patch.diff'), logger);

  await cleanupContainer(container, logger);
}

if (require.main === module) {
  const args = require('minimist')(process.argv.slice(2));
  selfImprove({ outputDir: args.output_dir });
}

module.exports = { selfImprove };
