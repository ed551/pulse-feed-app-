const express = require('express');
const app = express();
app.use("/api/*", (req, res) => {
  console.log("Matched app.use('/api/*')");
  console.log("req.originalUrl:", req.originalUrl);
  console.log("req.path:", req.path);
  res.json({ error: `Fallback 404 for ${req.method} ${req.originalUrl || req.path}` });
});
// Create a fake request and response
const req = { 
  method: 'POST', 
  url: '/api/payout/crypto',
  originalUrl: '/api/payout/crypto',
  path: '/api/payout/crypto'
};
const res = { 
  status: function() { return this; }, 
  json: function(obj) { console.log("JSON:", obj); } 
};
// We can't easily mock express request lifecycle, let's just listen
app.listen(3002, () => {
  console.log("Listening on 3002");
  fetch('http://127.0.0.1:3002/api/payout/crypto', { method: 'POST' })
    .then(r => r.json())
    .then(console.log)
    .then(() => process.exit(0));
});
