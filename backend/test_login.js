import http from 'https';

const postData = JSON.stringify({
  email: 'olisapaul1@gmail.com',
  password: '12345'
});

const options = {
  hostname: 'gravity-work.onrender.com',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 10000
};

console.log('Sending login POST request to hosted backend...');

const req = http.request(options, (res) => {
  let data = '';
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', data);
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e);
});

req.on('timeout', () => {
  console.error('Timeout!');
  req.destroy();
});

req.write(postData);
req.end();
