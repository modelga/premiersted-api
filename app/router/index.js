/* eslint-disable global-require */

const { protect } = require('../utils/jwt');

module.exports = (app) => {
  app.use(require('./utils/handle'));
  app.use('/_health', require('./_health'));
  app.use('/users', protect, require('./users'));
  app.use('/games', protect, require('./games'));
  app.use('/events', protect, require('./events'));
  app.use('/contests', protect, require('./contests'));
  app.use('/clubs', require('./clubs'));
  app.use(require('./utils/error'));
};

