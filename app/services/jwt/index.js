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
  expiresIn: '3m',
});

module.exports = {
  async exchange(user) {
    return {
      token: jwt.getToken({ user: await users.findById(user.id) }),
    };
  },

  async external({ id }, returnUrl) {
    const pass = await getUserTemporaryPass(id);
    return {
      token: generateExternalToken(pass, { id, returnUrl }),
    };
  },

  async verifyExternal(token) {
    try {
      const { data: { id } } = jwtLib.decode(token);
      const pass = await getUserTemporaryPass(id);
      jwtLib.verify(token, pass, { issuer });
      return users.findById(id);
    } catch (e) {
      throw new Unauthorized('Invalid external token');
    }
  },
};

