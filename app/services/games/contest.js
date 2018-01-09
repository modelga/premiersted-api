const { competitors, contests } = require('../../db');
const R = require('ramda');

const cachedUser = require('../users/cachedFind');
const clubs = require('../clubs');
const teaser = require('./teaser');

module.exports = {
  async contest({ cid }) {
    const contest = await contests.findById({ id: cid });
    const clubDetails = R.pipe(R.head, R.prop('club'), id => clubs.get({ id }));
    const { gid } = contest;
    const game = await teaser(gid);
    const [homeClub, visitorClub, homeUser, visitorUser, editedBy] = await Promise.all([
      competitors.find({ gid, uid: contest.home }).then(clubDetails),
      competitors.find({ gid, uid: contest.visitor }).then(clubDetails),
      cachedUser({ id: contest.home }),
      cachedUser({ id: contest.visitor }),
      contest.editedBy ? cachedUser({ id: contest.editedBy }) : undefined,
    ]);
    return {
      ...contest,
      editedBy,
      home: { user: homeUser, club: homeClub },
      visitor: { user: visitorUser, club: visitorClub },
      gid: game,
    };
  },
};
