const Mustache = require('mustache');
const R = require('ramda');
const randomatic = require('randomatic');
const { events } = require('../../db');
const users = require('../users');
const clubs = require('../clubs');
const gamesTeaser = require('../games/teaser');

const isObject = R.both(R.is(Object), R.complement(R.is(Function)));
const isFunction = R.is(Function);
const isString = R.is(String);
let subscriptions = [];
const basicRelateResolver = [
  [R.propEq('relate', '*'), R.prop('relate')],
  [R.propEq('type', 'games'), R.pipe(R.prop('relate'), gamesTeaser.fresh)],
  // [R.either(R.propEq('type', 'contest'), R.propEq('type', 'contests')), R.pipe(R.prop('relate'), cid => games.contest({ cid }))],
  [R.propEq('type', 'users'), R.pipe(R.prop('relate'), id => users.cachedFind({ id }))],
  [R.propEq('type', 'clubs'), R.pipe(R.prop('relate'), id => Promise.resolve(clubs.get({ id })))],
];

const relateResolver = R.cond([
  ...basicRelateResolver,
  [R.T, R.prop('relate')],
]);
const linkToTypeRelate = R.pipe(
  R.replace('api://', ''),
  R.split('/'),
  ([type, relate]) => ({ type, relate, name: `${type}:${relate}` }),
);
const linkResolver = link => R.pipe(
  linkToTypeRelate,
  R.cond([
    ...basicRelateResolver,
    [R.T, ({ name }) => Promise.resolve({ name })],
  ]),
  (p => p.then(related => ({
    related,
    link,
    ...(linkToTypeRelate(link)),
    _id: randomatic('Aa0', 4),
  }))),
)(link);

const url = /(api:\/\/([^\s]*))/g;
const decorateEvent = async (event) => {
  const by = (await users.exists({ id: event.by }))
    ? await users.cachedFind({ id: event.by })
    : event.by;
  const substitutes = await Promise.all(R.map(
    linkResolver,
    R.uniq(event.message.match(url) || []),
  ));
  const message = R.reduce((out, relate) => {
    const { link, _id } = relate;
    return out.replace(link, `sub:${_id}`);
  }, event.message, substitutes);
  return {
    ...R.omit(['by', 'method', 'path', 'created', 'message'], event),
    when: event.created,
    relate: await relateResolver(event),
    by,
    message,
    substitutes: R.pipe(
      R.indexBy(R.prop('_id')),
      R.map(R.omit(['_id'])),
    )(substitutes),
  };
};

const broadcastEvent = event => () => setTimeout(async () => {
  if (!R.isEmpty(subscriptions)) {
    const [decorated, raw] = R.partition(R.pathEq(['upgradeReq', 'query', 'raw'], undefined))(subscriptions);
    raw.forEach(ws => process.nextTick(() => ws.send(JSON.stringify(event))));
    if (!R.isEmpty(decorated)) {
      const decoratedEvent = await decorateEvent(event);
      decorated.forEach(ws => process.nextTick(() => ws.send(JSON.stringify(decoratedEvent))));
    }
  }
}, 125);

const store = event => events.add(event)
  .then(broadcastEvent(event))
  .catch(e => console.error("Can't populate the event", event, e));

const systemEvent = ({ type, relate = '*' }) =>
  (...args) => {
    const template = R.find(isObject, args).tpl || R.find(isString, args);
    const subject = R.find(isObject, args);
    const message = Mustache.render(template, subject);
    store({
      type,
      relate,
      message,
      by: subject.by || 'SYSTEM',
      method: subject.method || 'SYSTEM',
      path: subject.path || 'SYSTEM',
    });
  };

const event = (...args) => {
  const template = R.find(isObject, args).tpl || R.find(isString, args);
  const { type = 'common', relate = '*' } = R.find(isObject, args) || {};
  const middleware = R.find(isFunction, args);
  Mustache.parse(`${template}`); // pre-compile

  return (req, res, next) => {
    res.once('finish', () => {
      const { body, statusCode } = res;
      const { user } = req;
      const props = { ...req.params, ...req.body };
      if (statusCode < 400) {
        const userId = R.prop('id', user) || 'not-logged';
        const message = Mustache.render(template, { body, _u: user, props });
        store({
          type,
          relate: R.ifElse(R.is(Function), f => f({ req, res }), R.identity)(relate),
          message,
          by: userId,
          method: req.method,
          path: req.originalUrl,
        });
      }
    });
    if (middleware) {
      return middleware(req, res, next);
    }
    return next();
  };
};

const predefined = (typeAndRelate = {}) => (...args) => event(...args.concat(typeAndRelate));
const isRaw = R.complement(R.propEq('raw', undefined));
const get = async (params = { relate: '*', type: 'common' }) => {
  const found = await events.find(params);
  if (isRaw(params)) {
    return found;
  }
  return Promise.all(R.map(decorateEvent, found));
};
const scan = type => events.scan(type);
const findById = ({ id }) => events.findById({ id });

let connectors = [];

const subscribe = (ws) => {
  subscriptions.push(ws);
  ws.on('message', (m) => {
    try {
      const message = JSON.parse(m);
      if (message.event === 'connector.register') {
        connectors = connectors.filter(connector => connector.ws !== ws);
        connectors.push({ data: message.data, ws });
      }
      console.log('new connector, now have', connectors.length);
    } catch (e) {
      console.log('received invalid message');
    }
  });
};

const unsubscribe = (ws) => {
  subscriptions = subscriptions.filter(ew => ew !== ws);
  connectors = connectors.filter(connector => connector.ws !== ws);
};
const mergeEvents = ((...evs) => msg => (req, res, next) => {
  evs.forEach(ev => ev(msg)(req, res, R.T));
  return next();
});

const getConnectors = () => R.pluck('data', connectors);
module.exports = {
  event,
  predefined,
  get,
  scan,
  findById,
  subscribe,
  unsubscribe,
  systemEvent,
  mergeEvents,
  getConnectors,
};
