const { competitors, games, contests } = require('../../db');
const R = require('ramda');
const { Conflict, BadRequest, withError } = require('../../router/exceptions');
const users = require('../users');
const clubs = require('../clubs');

const isCompetitionsStillOpen = R.pathEq(['game', 'status'], 'OPEN');

const isInt = (value) => {
  if ((parseFloat(value) == parseInt(value, 10)) && !isNaN(value)) { // eslint-disable-line
    return true;
  }
  return false;
};
const not = R.complement;
const isOngoingGame = R.pathEq(['game', 'status'], 'ONGOING');

module.exports = {
  addCompetitor: async ({ gid, club, uid }) => {
    const list = (await competitors.find({ gid, club })).filter(f => f.uid !== uid);
    const [game] = await games.teasers([gid]);
    const userExists = await users.exists({ id: uid });
    const isExistingUser = R.propEq('userExists', true);
    const isClubAlreadyNotChosen = R.propEq('list', []);
    const isClubSet = R.prop('club');
    const isValidClub = R.pipe(R.prop('club'), R.assoc('id', R.__, {}), clubs.get, R.propEq('id', club));
    return R.cond([
      [not(isExistingUser), withError(new Conflict('This user not exists!'))],
      [not(isClubAlreadyNotChosen), withError(new Conflict('This club has been already chosen'))],
      [not(isCompetitionsStillOpen), withError(new Conflict('This competitions already started'))],
      [not(isClubSet), withError(new BadRequest('Chosen club cannot be empty'))],
      [not(isValidClub), withError(new BadRequest('Must set a valid club'))],
      [R.T, R.T],
    ])({
      list, game, userExists, club,
    });
  },
  deleteCompetitor: async ({ gid, uid }) => {
    const list = (await competitors.find({ gid, uid }));
    const [game] = await games.teasers([gid]);
    const userExists = await users.exists({ id: uid });
    const isExistingUser = R.propEq('userExists', true);
    return R.cond([
      [not(isExistingUser), withError(new Conflict('This user not exists!'))],
      [not(isCompetitionsStillOpen), withError(new Conflict('This competitions already started'))],
      [R.T, R.T],
    ])({ list, game, userExists });
  },
  schedule: async ({ gid, schedule }) => {
    const game = await games.findById(gid);
    return R.cond([
      [not(isCompetitionsStillOpen), withError(new Conflict('Game must be in OPEN state'))],
      [R.pipe(R.prop('schedule'), R.isEmpty), withError(new Conflict('Game must contains at least 2 competitors'))],
      [R.T, R.T],
    ])({ game, schedule });
  },
  completeGame: async ({ gid }) => {
    const game = await games.findById(gid);
    return R.cond([
      [R.propEq('status', 'CANCELLED'), withError(new Conflict('Cannot cancel game again'))],
      [R.propEq('status', 'EXPIRED'), withError(new Conflict('Cannot cancel expired game'))],
      [R.propEq('status', 'COMPLETED'), withError(new Conflict('Cannot cancel already completed game'))],
      [R.T, R.T],
    ])(game);
  },
  postOrUpdate: async ({
    id, gid, result, status, force,
  }) => {
    const isIntegerResultFor = field => R.pipe(R.path(['result', field]), R.both(isInt, R.gte(R.__, 0)));
    const isScheduledOrForceUpdate = R.either(R.prop('force'), R.pathEq(['contest', 'status'], 'SCHEDULED'));
    const isValidResult = R.both(isIntegerResultFor('visitor'), isIntegerResultFor('home'));
    const isProperFinalState = R.pipe(R.prop('status'), R.contains(R.__, ['PLAYED', 'WALKOVER']));

    const game = await games.findById(gid);
    const contest = await contests.findById({ id });

    return R.cond([
      [not(isOngoingGame), withError(new Conflict('Game must be in ONGOING state'))],
      [not(isScheduledOrForceUpdate), withError(new Conflict('Related contest must be in SCHEDULED state'))],
      [not(isValidResult), withError(new Conflict('Result values must be an non-negative integer'))],
      [not(isProperFinalState), withError(new Conflict('Posted result has to be in proper final status (PLAYED, WALKOVER)'))],
      [R.T, R.T],
    ])({
      game, contest, result, status, force,
    });
  },
  rejectResult: async ({ id, gid }) => {
    const isScheduled = R.pathEq(['contest', 'status'], 'SCHEDULED');
    const game = await games.findById(gid);
    const contest = await contests.findById({ id });
    return R.cond([
      [not(isOngoingGame), withError(new Conflict('Game must be in ONGOING state'))],
      [isScheduled, withError(new Conflict('Rejecting contest has to be in proper final status (PLAYED, WALKOVER)'))],
      [R.T, R.T],
    ])({ game, contest });
  },
};
