const {
  users, competitors, games, contests,
} = require('../../db');
const { contest } = require('../games/contest');
const R = require('ramda');
const listView = require('../games/listView');

const promiseAll = pList => Promise.all(pList);

module.exports = async ({ id }) => {
  const user = await users.findById(id);
  const gamesIdsList = R.map(R.prop('gid'))(await competitors.find({ uid: user.id }));
  const gamesList = await games
    .teasers(gamesIdsList)
    .then(listView)
    .then(R.mapTo(R.prop('id'), R.identity));
  const contestDetails = async c => contest({ cid: c.id, game: gamesList[c.gid] });
  const allContests = await contests.find({ uid: id });
  const uniqByGameId = R.uniqBy(R.prop('gid'), allContests);
  await Promise.all([R.pipe(R.map(contestDetails), promiseAll)(uniqByGameId)]);
  const [contestsList] = await Promise.all([
    R.pipe(R.map(contestDetails), promiseAll)(allContests),
  ]);
  return {
    ...user,
    games: gamesList,
    contests: contestsList,
  };
};
