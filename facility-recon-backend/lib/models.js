const mongoose = require('mongoose');

let datasources = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  host: {
    type: String
  },
  sourceType: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  username: {
    type: String
  },
  password: {
    type: String
  },
})

let datasourcepair = new mongoose.Schema({
  source1: {
    type: String
  },
  source2: {
    type: String
  },
  status: {
    type: String
  }
})

let metadata = new mongoose.Schema({
  lastUpdated: {
    type: String
  }
})
let DataSources = mongoose.model('DataSources', datasources)
let DataSourcePair = mongoose.model('DataSourcePair', datasourcepair)
let MetaData = mongoose.model('MetaData', metadata)
module.exports = {
  DataSources,
  DataSourcePair,
  MetaData
}