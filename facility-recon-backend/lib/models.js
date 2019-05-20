const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let usersFields = {
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
}
let Users = new mongoose.Schema(usersFields)
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
  // share to specific users only
  shared: {
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'Users'
    }]
  },
  // share to all system users and decide to limit what they can view based on their attached location
  shareToAll: {
    limitByUserLocation: {
      type: Boolean
    },
    activated: {
      type: Boolean
    }
  },
  // share wuth all users that are on the same orgid as the datasource owner
  shareToSameOrgid: {
    type: Boolean
  },
  username: {
    type: String
  },
  password: {
    type: String
  },
  // this will be removed in the future, we will rely on the owner.id instead
  userID: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  owner: {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    },
    orgId: {
      type: String
    }
  }
})

let SharedDataSourceLocations = new mongoose.Schema({
  dataSource: {
    type: Schema.Types.ObjectId,
    ref: 'DataSources'
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'Users'
  },
  location: {
    type: String
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
  config: {
    userConfig: [{
      userID: {
        type: Schema.Types.ObjectId,
        ref: 'Users'
      },
      reconciliation: {
        useCSVHeader: {
          type: Boolean
        }
      }
    }],
    generalConfig: {
      selfRegistration: {
        type: Boolean
      },
      reconciliation: {
        parentConstraint: {
          enabled: {
            type: Boolean
          },
          idAutoMatch: {
            type: Boolean
          },
          nameAutoMatch: {
            type: Boolean
          }
        },
        singlePair: {
          type: Boolean
        }
      },
      recoProgressNotification: {
        enabled: {
          type: Boolean
        },
        url: {
          type: String
        },
        username: {
          type: String
        },
        password: {
          type: String
        }
      },
      authDisabled: {
        type: Boolean
      },
      authMethod: {
        type: String
      },
      externalAuth: {
        pullOrgUnits: {
          type: Boolean
        },
        shareOrgUnits: {
          type: Boolean
        },
        shareByOrgId: {
          type: Boolean
        },
        datasetName: {
          type: String
        },
        adminRole: {
          type: String
        },
        userName: {
          type: String
        },
        password: {
          type: String
        }
      }
    }
  },
  recoStatus: {
    type: String
  },
  forms: [{}],
  levelMapping: {
    facility: {
      type: String
    },
    code: {
      type: String
    },
    level1: {
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
let DataSourcesModel = mongoose.model('DataSources', DataSources)
let SharedDataSourceLocationsModel = mongoose.model('SharedDataSourceLocations', SharedDataSourceLocations)
let DataSourcePairModel = mongoose.model('DataSourcePair', DataSourcePair)
let MetaDataModel = mongoose.model('MetaData', MetaData)
let RolesModel = mongoose.model('Roles', Roles)
let UsersModel = mongoose.model('Users', Users)
module.exports = {
  DataSourcesModel,
  SharedDataSourceLocationsModel,
  DataSourcePairModel,
  MetaDataModel,
  UsersModel,
  RolesModel,
  usersFields
}