const {
  games, competitors, contests,
} = require('../../db');
const randomatic = require('randomatic');

const clubs = require('../clubs');
const users = require('../users');

const R = require('ramda');

const detailedGame = async ({ id }) => {
  const game = await games.findById(id);
  if (!game) {
    return null;
  }
  const listOfCompetitors = await competitors.find({ gid: id });
  const competitor = R.groupBy(
    R.prop('id'),
    await Promise.all(R.map(
      ({ uid }) => users.cachedFind({ id: uid }),
      listOfCompetitors,
    )),
  );
  const competitorList = R.mapTo(R.path(['user', 'id']), R.identity, R.map(
    R.pipe(R.omit(['gid']), ({ club, uid }) => ({
      club: clubs.get({ id: club }),
      user: competitor[uid][0],
    })),
    listOfCompetitors,
  ));

  return {
    ...game,
    competitors: competitorList,
  };
};
const schedule = require('./schedule');

const deleteGame = async ({ id }) => {
  await Promise.all([
    games.delete(id),
    competitors.delete({ gid: id }),
    contests.delete({ gid: id }),
  ]);
  return {};
};
module.exports = {
  get(o) {
    return R.cond([
      [R.prop('id'), detailedGame],
      [R.anyPass([R.prop('limit'), R.prop('name'), R.prop('status'), R.prop('location')]), async by => games.findBy(by)],
      [R.T, async () => games.getAll()],
    ])(o);
  },
  async delete(o) {
    return R.cond([
      [R.prop('id'), deleteGame],
      [R.T, R.always({})],
    ])(o);
  },
  async addCompetitor(id, {
    uid, club,
  }) {
    competitors.add({
      gid: id, uid, club,
    });
  },
  async create(o) {
    return games.create(o);
  },
  async update(o) {
    return games.update(o).then(({ id }) => this.get({ id }));
  },
  ...schedule,
};

