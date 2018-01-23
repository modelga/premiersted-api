const app = require('express').Router();
const { protectLevel } = require('../../utils/jwt');

const atLeastUser = protectLevel('USER');

app.use('/', atLeastUser, require('./games'));
app.use('/', atLeastUser, require('./results'));

module.exports = app;
