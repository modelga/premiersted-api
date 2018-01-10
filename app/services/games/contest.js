const { competitors, contests } = require('../../db');
const R = require('ramda');

const cachedUser = require('../users/cachedFind');
const clubs = require('../clubs');
const teaser = require('./teaser');
const recommend = require('../games/recommend');

module.exports = {
  async contest({ cid, game }) {
    const contest = await contests.findById({ id: cid });
    const recommends = await recommend.contest(contest);
    const clubDetails = R.pipe(R.head, R.prop('club'), id => clubs.get({ id }));
    const { gid } = contest;
    const gameDetails = game || (await teaser(gid));
    const [homeClub, visitorClub, homeUser, visitorUser, editedBy] = await Promise.all([
      competitors.find({ gid, uid: contest.home }).then(clubDetails),
      competitors.find({ gid, uid: contest.visitor }).then(clubDetails),
      cachedUser({ id: contest.home }),
      cachedUser({ id: contest.visitor }),
      contest.editedBy ? cachedUser({ id: contest.editedBy }) : undefined,
    ]);
    return {
      enabled: true,
      ...contest,
      editedBy,
      home: { user: homeUser, club: homeClub },
      visitor: { user: visitorUser, club: visitorClub },
      gid: R.pick(['id', 'name', 'location'], gameDetails),
      ...recommends,
    };
  },
};
