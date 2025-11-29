const {Sequelize} = require('sequelize');
const { options } = require('./models/Chunk');

module.exports = new Sequelize({
   dialect: 'sqlite',
   storage: 'db.sqlite3',
   logging: false,
});