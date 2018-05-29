const { users } = require('../../db');
const Cache = require('../../utils/cache');

const cache = Cache({ maxAge: 1000 * 60, max: 100 });
const getCached = async ({ id }) =>
  cache.getOrSet(id, async () => {
    const {
      meta: {
        avatar_url, name, displayName, team,
      },
    } = await users.findById(id, ['users']);
    return {
      id, name: displayName || name, team, avatar_url,
    };
  });

module.exports = getCached;
const purge = async (id) => { cache.del(id); cache.del(`det:${id}`); };
module.exports.purge = purge;
