const E = require('../exceptions');
const R = require('ramda');

const use = R.always;

const codeToHeader = R.cond([
  [R.equals(400), use('Bad Request')],
  [R.equals(401), use('Unauthorized')],
  [R.equals(403), use('Forbidden')],
  [R.equals(404), use('Not Found')],
  [R.equals(405), use('Method Not Allowed')],
  [R.equals(408), use('Request Timeout')],
  [R.equals(409), use('Conflict')],
  [R.T, use('Server Error')],
]);

module.exports = async (err, req, res, next) => {
  const message = R.concat(': ', R.defaultTo(req.path, R.prop('message', err) || null));
  const { code, msg, payload } = R.cond([
    [R.is(E.BadRequest), use({ code: 400, msg: `Bad Request${message}` })],
    [R.is(E.Unauthorized), use({ code: 401, msg: `Unauthorized${message}` })],
    [R.is(E.NotFound), use({ code: 404, msg: `Not Found${message}` })],
    [R.is(E.Conflict), use({ code: 409, msg: `Conflict: ${err.message}` })],
    [R.is(E.Forbidden), use({ code: 403, msg: `Forbidden: ${err.message}` })],
    [
      R.both(R.has('statusCode')),
      e => ({ code: e.statusCode || 500, msg: `${codeToHeader(e.statusCode)}: ${e.message}` }),
    ],
    [R.T, use({ code: 500, msg: `Internal Server Error${message}` })],
  ])((await res.result) || err);
  if (!code || code >= 500) {
    // all codes below are under control
    console.error(err);
  }
  if (payload) {
    return res.status(code || 500).json(payload);
  }
  if (!req.upgrade) {
    res.status(code || 500).send(msg);
  }
  return next();
};
