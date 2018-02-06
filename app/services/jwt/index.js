const { users } = require('../../db');
const jwt = require('../../utils/jwt');
const jwtLib = require('jsonwebtoken');
const randomatic = require('randomatic');
const Cache = require('../../utils/cache');
const { Unauthorized } = require('../../router/exceptions');

const cache = Cache({ maxAge: 1000 * 180, max: 100 });
const getUserTemporaryPass = async id => cache.getOrSet(id, async () => randomatic('Aa0', 16));

const issuer = 'Premiersted-External';

const generateExternalToken = (pass, data) => jwtLib.sign({ data }, pass, {
  issuer,
  expiresIn: '1 hour',
});

module.exports = {
  async exchange(user) {
    return {
      token: jwt.getToken({ user: await users.findById(user.id) }),
    };
  },

  async external(user) {
    const { id, meta: { slack } } = await users.findById(user.id);
    const pass = await getUserTemporaryPass(id);
    return {
      token: generateExternalToken(pass, { id, slack }),
    };
  },

  async verifyExternal(token) {
    const { data: { id } } = jwtLib.decode(token);
    const pass = await getUserTemporaryPass(id);
    try {
      jwtLib.verify(token, pass, { issuer });
      return users.findById(id);
    } catch (e) {
      throw new Unauthorized('Invalid external token');
    }
  },
};

