const { createClient, getResponseFromLLM } = require('./llm');
const { loadAllTools } = require('./tools');

const CLAUDE_MODEL = 'bedrock/us.anthropic.claude-3-5-sonnet-20241022-v2:0';
const OPENAI_MODEL = 'o3-mini-2025-01-31';

async function processToolCall(toolsDict, name, input) {
  if (name in toolsDict) {
    return await toolsDict[name].function(input.command || input, input.path, input.file_text);
  }
  return `Error: tool ${name} not found`;
}

async function chatWithAgent(msg, { model = CLAUDE_MODEL, msgHistory = [], logging = console.log } = {}) {
  const systemMessage = 'You are a coding agent.';
  const [client, clientModel] = createClient(model);
  const tools = loadAllTools(logging);
  const toolsDict = Object.fromEntries(tools.map(t => [t.info.name, t]));
  let [response, history] = await getResponseFromLLM({ msg, client, model: clientModel, systemMessage, msgHistory });
  logging(response);
  let toolMatch = response.match(/<tool_use>\n([\s\S]*?)\n<\/tool_use>/);
  while (toolMatch) {
    let toolInfo;
    try { toolInfo = JSON.parse(toolMatch[1].replace(/'/g, '"')); } catch { toolInfo = null; }
    if (!toolInfo || !toolInfo.tool_name) break;
    const result = await processToolCall(toolsDict, toolInfo.tool_name, toolInfo.tool_input || {});
    const toolMsg = `Tool Used: ${toolInfo.tool_name}\nTool Input: ${JSON.stringify(toolInfo.tool_input)}\nTool Result: ${result}`;
    [response, history] = await getResponseFromLLM({ msg: toolMsg, client, model: clientModel, systemMessage, msgHistory: history });
    toolMatch = response.match(/<tool_use>\n([\s\S]*?)\n<\/tool_use>/);
  }
  return history.concat([{ role: 'assistant', content: response }]);
}

module.exports = { CLAUDE_MODEL, OPENAI_MODEL, chatWithAgent };
