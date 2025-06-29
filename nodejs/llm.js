const { OpenAI } = require('openai');
const anthropic = require('@anthropic-ai/sdk');

const MAX_OUTPUT_TOKENS = 4096;

function createClient(model) {
  if (model.startsWith('gpt-') || model.startsWith('o1-') || model.startsWith('o3-')) {
    return [ new OpenAI(), model ];
  }
  if (model.includes('claude')) {
    return [ new anthropic.Anthropic(), model ];
  }
  throw new Error(`Model ${model} not supported`);
}

async function getResponseFromLLM({ msg, client, model, systemMessage, msgHistory = [], temperature = 0.7 }) {
  const messages = [
    { role: 'system', content: systemMessage },
    ...msgHistory,
    { role: 'user', content: msg }
  ];
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: MAX_OUTPUT_TOKENS
  });
  const content = response.choices[0].message.content;
  const newHistory = [...msgHistory, {role:'user', content: msg}, {role:'assistant', content}];
  return [content, newHistory];
}

function extractJSONBetweenMarkers(output) {
  const match = output.match(/```json\n([\s\S]*?)\n```/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

module.exports = { createClient, getResponseFromLLM, extractJSONBetweenMarkers, MAX_OUTPUT_TOKENS };
