const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let Users = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  otherName: {
    type: String
  },
  surname: {
    type: String,
    required: true
  },
  role: {
    type: Schema.Types.ObjectId,
    ref: 'Roles',
    required: true
  },
  userName: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  lastModified: {
    type: Date
  }
})

let Roles = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }
})

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
  userID: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  }
})

let DataSourcePair = new mongoose.Schema({
  source1: {
    type: Schema.Types.ObjectId,
    ref: 'DataSources'
  },
  source2: {
    type: Schema.Types.ObjectId,
    ref: 'DataSources'
  },
  status: {
    type: String
  },
  shared: {
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'Users'
    }],
    activeUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'Users'
    }]
  },
  userID: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  }
})

let MetaData = new mongoose.Schema({
  lastUpdated: {
    type: String
  },
  recoStatus: {
    type: String
  },
  levelMapping:{
    facility: {
      type: String
    },
    code: {
      type: String
    },
    level1:{
      type: String
    },
    level2: {
      type: String
    },
    level3: {
      type: String
    },
    level4: {
      type: String
    },
    level5: {
      type: String
    },
    level6: {
      type: String
    },
    level7: {
      type: String
    },
    level8: {
      type: String
    },
    level9: {
      type: String
    },
    level10: {
      type: String
    }
  }
})
let DataSourcesSchema = mongoose.model('DataSources', DataSources)
let DataSourcePairSchema = mongoose.model('DataSourcePair', DataSourcePair)
let MetaDataSchema = mongoose.model('MetaData', MetaData)
let RolesSchema = mongoose.model('Roles', Roles)
let UsersSchema = mongoose.model('Users', Users)
module.exports = {
  DataSourcesSchema,
  DataSourcePairSchema,
  MetaDataSchema,
  UsersSchema,
  RolesSchema
}