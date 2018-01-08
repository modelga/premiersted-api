const { games } = require('../../services');
const { NotFound, BadRequest, withError } = require('../exceptions');
const { protectLevel } = require('../../utils/jwt');

const onlyAdmin = protectLevel('ADMIN');

const gameExists = async (req, res, next) => {
  const { id } = req.params;
  const exists = await games.exists(req.params.id);
  if (exists) {
    return next();
  }
  return res.handle(withError(new NotFound(`Game ${id} does not exists`)));
};

const myContestOrAdmin = async (req, res, next) => {
  const { params: { id, cid } } = req;
  const userId = req.user.id;
  const { gid, visitor, home } = await games.contest({ cid });
  if ([visitor.user.id, home.user.id].includes(userId)) {
    return next();
  }
  return onlyAdmin(req, res, next);
};

const myRequestOrAdmin = async (req, res, next) => {
  const userId = req.user.id;
  const { uid } = req.body;
  if (userId === uid) {
    return next();
  }
  return onlyAdmin(req, res, next);
};
const isContestInGame = async (req, res, next) => {
  const { params: { id, cid } } = req;
  const contest = await games.contestTeaser({ cid });
  if (contest.gid !== id) {
    return res.handle(withError(new BadRequest(`Contest ${cid} do not belongs to game ${id}, cause belongs to ${contest.gid}`)));
  }
  req.contest = contest;
  return next();
};

module.exports = {
  gameExists,
  myContestOrAdmin,
  isContestInGame,
  onlyAdmin,
  myRequestOrAdmin,
};
