const app = require('express').Router();
const { protectLevel } = require('../../utils/jwt');
const {
  get, scan, findById, subscribe, unsubscribe, getConnectors,
} = require('../../services/events');
const R = require('ramda');

app.use(protectLevel('USER'));

app.ws('/ws', (ws) => {
  subscribe(ws);
  ws.on('close', () => unsubscribe(ws));
});

app.get('/', (req, res) => {
  res.handle(get({ ...req.query, relate: '*', type: 'common' }));
});

app.get('/connectors', (req, res) => {
  res.handle(getConnectors());
});

app.get('/:type', (req, res) => {
  const result = R.cond([
    [R.has('scan'), () => scan(req.params.type)],
    [R.has('id'), () => findById({ id: req.params.type })],
    [R.T, () => get({ ...req.params, ...req.query, relate: '*' })],
  ])(req.query);
  res.handle(result);
});

app.get('/:type/:relate', (req, res) => {
  res.handle(get({ ...req.params, ...req.query }));
});

module.exports = app;
