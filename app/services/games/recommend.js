const R = require('ramda');
const Cache = require('../../utils/cache');

const cache = Cache({ maxAge: 2000, max: 1000 });

const metricList = R.curry((metricFunction, list) =>
  R.pipe(R.values, R.reduce(metricFunction, R.head(R.values(list)) || 0))(list));

const average = list => metricList(R.add, list) / R.length(R.values(list));
const maxOf = metricList(R.max);
const minOf = metricList(R.min);
const fieldName = 'recommended';
const sort = matches =>
  R.pipe(
    R.values,
    R.sortWith([
      R.descend(R.prop('recommended')),
      R.descend(R.pipe(R.prop('updated'), d => new Date(d).getTime())),
      R.ascend(R.pipe(R.prop('id'))),
    ]),
    R.indexBy(R.prop('id')),
  )(matches);
const normalize = (schedule, isRematchRound) => {
  const recomendationsValues = R.values(R.pluck(fieldName, schedule));
  const [max, min] = [maxOf(recomendationsValues), minOf(recomendationsValues)];
  const range = max - min;
  if (range === 0) {
    return R.mapObjIndexed(match => ({
      ...match,
      [fieldName]: isRematchRound || !match.willBeRematch ? 1 : 0,
      enabled: isRematchRound || !match.willBeRematch,
    }))(schedule);
  }
  const normalized = R.mapObjIndexed((match) => {
    if (match.status !== 'SCHEDULED') {
      return { ...match, [fieldName]: 1 };
    }

    const score = Math.max(0, (match[fieldName] - min) / range);
    const recommends = {
      [fieldName]: match.willBeRematch ? score * 0.75 * (isRematchRound ? 0 : 1) : score,
      enabled: isRematchRound || !match.willBeRematch,
    };
    cache.set(match.id, recommends);
    return {
      ...match,
      ...recommends,
    };
  })(schedule);
  return normalized;
};
module.exports.contest = async ({ id, gid }) => {
  // DIRTY HACK NEED TO BE RE-DEVELOPED
  const detailedGame = require('./detailedGame'); // eslint-disable-line
  const reccomends = cache.get(id);
  if (!reccomends) {
    const schedule = await cache.getOrSet(`g:${gid}`, async () =>
      detailedGame({ gid }).then(R.prop('schedule')));
    const related = R.pick(['enabled', fieldName, 'willBeRematch'], schedule[id]);
    return related;
  }
  return reccomends;
};
module.exports.game = (game) => {
  const { table, schedule } = game;
  if (!R.isEmpty(table) || R.isEmpty(schedule)) {
    const played = R.pipe(R.indexBy(R.prop('id')), R.mapObjIndexed(R.prop('played')))(table);
    const avgPlayed = average(played);
    const isRematchRound = minOf(played) >= table.length - 1;
    const toPlayScore = R.mapObjIndexed(R.pipe(R.subtract(avgPlayed)), played);
    const scoredSchedule = R.mapObjIndexed((match) => {
      if (match.status !== 'SCHEDULED') {
        return { ...match, enabled: true, [fieldName]: 0 };
      }
      const willBeRematch = schedule[match.rematch].status !== 'SCHEDULED';
      const enabled = isRematchRound || !match.willBeRematch;
      return {
        ...match,
        willBeRematch,
        enabled,
        [fieldName]: enabled ? toPlayScore[match.home] + toPlayScore[match.visitor] : 0,
      };
    })(schedule);
    const normalized = normalize(scoredSchedule, isRematchRound);
    return {
      ...game,
      schedule: sort(normalized),
    };
  }
  return game;
};
