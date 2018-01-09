const { games, competitors, contests } = require('../../db');

const clubs = require('../clubs');
const users = require('../users');
const teaser = require('./teaser');
const recommend = require('./recommend');

const R = require('ramda');

const continuatedGames = R.pipe(
  R.mapObjIndexed((list, id) => teaser(id).then(R.assoc('promoted', list))),
  R.values,
);

module.exports = async ({ gid }) => {
  const game = await games.findById(gid);
  if (!game) {
    return null;
  }
  const listOfCompetitors = await competitors.find({ gid });
  const parent = game.parent ? await teaser(game.parent) : undefined;
  const continueIn = game.continueIn
    ? R.indexBy(R.prop('id'), await Promise.all(continuatedGames(game.continueIn)))
    : undefined;
  const competitor = R.groupBy(
    R.prop('id'),
    await Promise.all(R.map(({ uid }) => users.cachedFind({ id: uid }), listOfCompetitors)),
  );
  const competitorList = R.mapTo(
    R.path(['user', 'id']),
    R.identity,
    R.map(
      R.pipe(R.omit(['gid']), ({ club, uid }) => ({
        club: clubs.get({ id: club }),
        user: competitor[uid][0],
      })),
      listOfCompetitors,
    ),
  );
  const schedule = R.pipe(R.mapTo(R.prop('id'), R.identity))(await contests.find({ gid }));

  const detailedGame = {
    ...game,
    parent,
    continueIn,
    players: listOfCompetitors.map(({ uid }) => competitor[uid]).map(R.head),
    competitors: competitorList,
    competitorsSize: R.keys(competitorList).length,
    schedule,
  };

  return recommend(detailedGame);
};
