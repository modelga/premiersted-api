class BadRequest extends Error {}
class Forbidden extends Error {}
class Unauthorized extends Error {}
class NotFound extends Error {}
class Conflict extends Error {}
const error = (kind) => { throw kind; };
const withError = err => () => error(err);

module.exports = {
  BadRequest,
  NotFound,
  Conflict,
  error,
  withError,
  Forbidden,
  Unauthorized,
};

