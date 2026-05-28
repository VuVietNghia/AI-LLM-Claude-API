const https = require('https');

const req = https.request('https://llm-hub.roxane.one/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fake-api-key',
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
});

req.write(JSON.stringify({
  model: 'glm-4.5',
  messages: [{ role: 'user', content: 'hello' }]
}));
req.end();
