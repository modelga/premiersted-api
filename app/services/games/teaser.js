const { games } = require('../../db');
const Cache = require('../../utils/cache');

const cache = Cache({ maxAge: 1000 * 60, max: 100 });
const getCached = async id =>
  cache.getOrSet(id, async () => {
    const [game] = await games.teasers([id]);
    return game;
  });
module.exports = getCached;

const purge = async id => cache.del(id);
// TODO: find more appropiate way, eg. purge when update
module.exports.fresh = async id => purge(id).then(() => getCached(id));
