const app = require('express')();

const { protect } = require('../../utils/jwt');
const { jwt } = require('../../services');
const { requiredProps } = require('../helper');

app.put('/exchange', protect, (req, res) => {
  res.handle(jwt.exchange(req.user));
});

app.post('/external', requiredProps('returnUrl'), protect, (req, res) => {
  res.handle(jwt.external(req.user, req.body.returnUrl));
});

app.post('/external/verify', (req, res) => {
  res.handle(jwt.verifyExternal(req.body.token));
});

module.exports = app;

