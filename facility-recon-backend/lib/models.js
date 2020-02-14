const mongoose = require('mongoose');
const schemas = require('./schemas');

const DataSourcesModel = mongoose.model('DataSources', schemas.DataSources);
const SharedDataSourceLocationsModel = mongoose.model('SharedDataSourceLocations', schemas.SharedDataSourceLocations);
const DataSourcePairModel = mongoose.model('DataSourcePair', schemas.DataSourcePair);
const MetaDataModel = mongoose.model('MetaData', schemas.MetaData);
const RolesModel = mongoose.model('Roles', schemas.Roles);
const UsersModel = mongoose.model('Users', schemas.Users);
const TasksModel = mongoose.model('Tasks', schemas.Tasks);
const SMTPModel = mongoose.model('SMTP', schemas.SMTP);
module.exports = {
  DataSourcesModel,
  SharedDataSourceLocationsModel,
  DataSourcePairModel,
  MetaDataModel,
  UsersModel,
  RolesModel,
  TasksModel,
  SMTPModel,
};
