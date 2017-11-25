const { contests } = require('../../db');
const R = require('ramda');
const rules = require('./rules');
const table = require('./table');
const detailedGame = require('./detailedGame');

const getCurrentRound = R.curry((aTable, uid) => R.pipe(R.find(R.propEq('id', uid)), R.prop('played'), R.inc)(aTable));

module.exports = {
  async postResult({
    id, gid, result, status,
  }) {
    await rules.postOrUpdate({
      id, gid, result, status, force: false,
    });
    const theTable = await table.getTable({ gid });
    const contest = await contests.findById({ id });
    const isRematch = R.has('isRematch', contest)
      ? contest.isRematch
      : (await contests.findById({ id: contest.rematch })).status !== 'SCHEDULED';
    const [homeRound, visitorRound] = R.map(
      getCurrentRound(theTable),
      [contest.home, contest.visitor],
    );
    const round = contest.round || {
      home: homeRound,
      visitor: visitorRound,
    };
    await contests.update({
      ...contest,
      result,
      status,
      edited: R.inc(contest.edited || -1),
      round,
      isRematch,
    });
    await table.updateTable({ gid });
    return detailedGame({ gid });
  },

  async editResult({
    id, gid, result, status, force, ...other
  }) {
    await rules.postOrUpdate({
      id, gid, result, status, force,
    });
    const contest = await contests.findById({ id });
    await contests.update({
      ...contest,
      ...R.omit(['round', 'isRematch'], other),
      result,
      status,
      edited: contest.edited + 1,
    });
    await table.updateTable({ gid });
    return detailedGame({ gid });
  },
  async rejectResult({ id, gid }) {
    await rules.rejectResult({ id, gid });
    const contest = R.pickAll(
      ['id', 'home', 'visitor', 'gid', 'rematch',
        'scheduled', 'round', 'isRematch', 'edited'],
      await contests.findById({ id }),
    );
    await contests.update({ ...contest, edited: contest.edited + 1, status: 'SCHEDULED' });
    await table.updateTable({ gid });
    return detailedGame({ gid });
  },
};
