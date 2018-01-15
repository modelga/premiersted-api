const jwt = require('jsonwebtoken');
const config = require('../config')();

const users = require('../services/users');
const level = require('../services/level');

const getToken = ({ user }) =>
  jwt.sign(user, config.get('JWT_SECRET'), {
    issuer: 'Premiersted',
    expiresIn: '7 days',
  });
const templatePopup = ({ token }) => `
  <html>
    <head>
      <title>JWT Token</title>
      <script>
        window.addEventListener('message', (event) => {
          if (event.data == 'ready?') {
            event.source.postMessage({jwt: '${token}'},'*');
            window.close();
          }
        });
      </script>
    </head>
  </html>
`;

const templateRedirect = ({ token, returnUrl, where }) => `
  <html>
    <head>
      <title>JWT Token</title>
      <script>
        window.location="${returnUrl}?token=${token}&where=${where}";
      </script>
    </head>
  </html>
`;
const auth = ({ user, query: { returnUrl, where } }, res) => {
  const tpl = returnUrl ? templateRedirect : templatePopup;
  if (user) {
    res.send(tpl({ token: getToken({ user }), returnUrl, where }));
  }
};

const propagateAuthIssue = msg => (reqOrWs, res, code = 401) => {
  if (reqOrWs.upgrade) {
    if (!reqOrWs.closing) {
      reqOrWs.ws.send(msg);
      process.nextTick(() => reqOrWs.ws.close());
    }
    reqOrWs.closing = true; // eslint-disable-line
    return;
  }
  res.status(code).send(msg);
};

const decodeJWT = (req, res, next) => {
  const token = req.headers['auth-token'] || req.headers['sec-websocket-protocol'];
  if (!req.user && token) {
    jwt.verify(token, config.get('JWT_SECRET'), {}, (err, decoded) => {
      if (err) {
        propagateAuthIssue(`Unauthorized: ${err.message}`)(req, res);
      }
      req.user = decoded;
    });
  }
  next();
};

const protect = (req, res, next) => {
  decodeJWT(req, res, () => {});
  if (req.user) {
    next();
  } else {
    propagateAuthIssue('Unauthorized: no token provided')(req, res);
  }
};

const protectLevel = requestedLevel => (req, res, next) => {
  protect(req, res, () => {
    users
      .getAccess(req.user)
      .then((userLevel) => {
        if (level.atLeast(userLevel, requestedLevel)) {
          next();
        } else {
          propagateAuthIssue(`Forbidden: insufficient permissions ${userLevel}, needs ${requestedLevel}`)(req, res, 403);
        }
      })
      .catch((e) => {
        console.error(e);
        propagateAuthIssue('Internal Server Error')(req, res, 500);
      });
  });
};
module.exports = {
  auth,
  protect,
  protectLevel,
  getToken,
  decodeJWT,
};
