const {
  users, competitors, games, contests,
} = require('../../db');
const { contest } = require('../games/contest');
const R = require('ramda');
const listView = require('../games/listView');

const contestDetails = async c => contest({ cid: c.id });
const promiseAll = pList => Promise.all(pList);

module.exports = async ({ id }) => {
  const user = await users.findById(id);
  const gamesIdsList = R.map(R.prop('gid'))(await competitors.find({ uid: user.id }));
  const [contestsList, gamesList] = await Promise.all([
    contests.find({ uid: id }).then(R.pipe(R.map(contestDetails), promiseAll)),
    games
      .teasers(gamesIdsList)
      .then(listView)
      .then(R.mapTo(R.prop('id'), R.identity)),
  ]);
  return {
    ...user,
    games: gamesList,
    contests: contestsList,
  };
};
