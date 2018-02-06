const app = require('express')();

const { protect } = require('../../utils/jwt');
const { jwt } = require('../../services');

app.put('/exchange', protect, (req, res) => {
  res.handle(jwt.exchange(req.user));
});

app.get('/external', protect, (req, res) => {
  res.handle(jwt.external(req.user));
});

app.post('/external/verify', (req, res) => {
  res.handle(jwt.verifyExternal(req.body.token));
});

module.exports = app;

