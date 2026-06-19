const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️ WARNING: ANTHROPIC_API_KEY is missing. AI Style Engine features will fail to initialize.');
}

// Instantiate the SDK client singleton
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

module.exports = anthropic;