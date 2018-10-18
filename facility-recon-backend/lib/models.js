const mongoose = require('mongoose');

let DataSources = new mongoose.Schema({
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

let DataSourcePair = new mongoose.Schema({
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

let MetaData = new mongoose.Schema({
  lastUpdated: {
    type: String
  }
})
let DataSourcesSchema = mongoose.model('DataSources', DataSources)
let DataSourcePairSchema = mongoose.model('DataSourcePair', DataSourcePair)
let MetaDataSchema = mongoose.model('MetaData', MetaData)
module.exports = {
  DataSourcesSchema,
  DataSourcePairSchema,
  MetaDataSchema
}