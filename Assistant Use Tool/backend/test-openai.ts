import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({
  baseURL: process.env.ZHIPU_BASE_URL,
  apiKey: process.env.ZHIPU_API_KEY,
});

async function test() {
  try {
    const stream = await client.chat.completions.create({
      model: 'glm-4.6',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    });
    for await (const chunk of stream) {
      console.log(JSON.stringify(chunk));
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
