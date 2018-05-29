const { users } = require('../../db');
const R = require('ramda');
const userDetails = require('./userDetails');
const cachedFind = require('./cachedFind');

module.exports = {
  cachedFind,
  async exists({ id }) {
    return !!await users.findById(id);
  },
  async get(q) {
    return R.cond([[R.prop('id'), userDetails], [R.T, async () => users.getAll()]])(q);
  },
  async getAccess({ id }) {
    return users.getAccess(id);
  },
  async update({ id, body }, { right }) {
    const user = await users.findById(id);
    await Promise.all([
      users.updateMeta({
        ...user,
        ...body,
        id,
      }),
      right === 'ADMIN' && body.access
        ? users.setAccess({
          access: body.access,
          id,
        })
        : [],
    ]);
    cachedFind.purge(id);
    return users.findById(id);
  },
};
