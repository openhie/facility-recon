const mongoose = require('mongoose');

const {
  Schema,
} = mongoose;

const usersFields = {
  firstName: {
    type: String,
    required: true,
  },
  otherName: {
    type: String,
  },
  surname: {
    type: String,
    required: true,
  },
  role: {
    type: Schema.Types.ObjectId,
    ref: 'Roles',
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  lastModified: {
    type: Date,
  },
};
const Users = new mongoose.Schema(usersFields);
const Roles = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  tasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Tasks',
  }],
});

const DataSources = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  host: {
    type: String,
  },
  sourceType: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  enableAutosync: {
    type: Boolean,
  },
  // share to specific users only
  shared: {
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'Users',
    }],
  },
  // share to all system users and decide to limit what they can view based on their attached location
  shareToAll: {
    limitByUserLocation: {
      type: Boolean,
    },
    activated: {
      type: Boolean,
    },
  },
  // share wuth all users that are on the same orgid as the datasource owner
  shareToSameOrgid: {
    type: Boolean,
  },
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  // this will be removed in the future, we will rely on the owner.id instead
  userID: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  owner: {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    orgId: {
      type: String,
    },
  },
});

const SharedDataSourceLocations = new mongoose.Schema({
  dataSource: {
    type: Schema.Types.ObjectId,
    ref: 'DataSources',
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
  },
  location: {
    type: String,
  },
});

const SMTP = new mongoose.Schema({
  host: {
    type: String,
  },
  port: {
    type: String,
  },
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  secured: {
    type: Boolean,
  },
});

const DataSourcePair = new mongoose.Schema({
  source1: {
    type: Schema.Types.ObjectId,
    ref: 'DataSources',
  },
  source2: {
    type: Schema.Types.ObjectId,
    ref: 'DataSources',
  },
  status: {
    type: String,
  },
  shared: {
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'Users',
    }],
    activeUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'Users',
    }],
  },
  // this will be removed in the future, we will rely on the owner.id instead
  userID: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  owner: {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    orgId: {
      type: String,
    },
  },
});

const MetaData = new mongoose.Schema({
  lastUpdated: {
    type: String,
  },
  config: {
    userConfig: [{
      userID: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
      },
      reconciliation: {
        useCSVHeader: {
          type: Boolean,
        },
      },
    }],
    generalConfig: {
      selfRegistration: {
        enabled: {
          type: Boolean,
        },
        requiresApproval: {
          type: Boolean,
        },
      },
      allowShareToAllForNonAdmin: {
        type: Boolean,
      },
      datasetsAdditionWays: [],
      datasetsAutosyncTime: {
        type: String,
      },
      reconciliation: {
        parentConstraint: {
          enabled: {
            type: Boolean,
          },
          idAutoMatch: {
            type: Boolean,
          },
          nameAutoMatch: {
            type: Boolean,
          },
        },
        singlePair: {
          type: Boolean,
        },
        singleDataSource: {
          type: Boolean,
        },
        fixSource2To: {
          type: Schema.Types.ObjectId,
          ref: 'DataSources',
        },
        fixSource2: {
          type: Boolean,
        },
      },
      recoProgressNotification: {
        enabled: {
          type: Boolean,
        },
        url: {
          type: String,
        },
        username: {
          type: String,
        },
        password: {
          type: String,
        },
      },
      authDisabled: {
        type: Boolean,
      },
      authMethod: {
        type: String,
      },
      externalAuth: {
        pullOrgUnits: {
          type: Boolean,
        },
        shareOrgUnits: {
          type: Boolean,
        },
        shareByOrgId: {
          type: Boolean,
        },
        datasetName: {
          type: String,
        },
        adminRole: {
          type: String,
        },
        userName: {
          type: String,
        },
        password: {
          type: String,
        },
      },
    },
  },
  recoStatus: {
    type: String,
  },
  forms: [{}],
  levelMapping: {
    facility: {
      type: String,
    },
    code: {
      type: String,
    },
    level1: {
      type: String,
    },
    level2: {
      type: String,
    },
    level3: {
      type: String,
    },
    level4: {
      type: String,
    },
    level5: {
      type: String,
    },
    level6: {
      type: String,
    },
    level7: {
      type: String,
    },
    level8: {
      type: String,
    },
    level9: {
      type: String,
    },
    level10: {
      type: String,
    },
  },
});
const Tasks = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
  },
  display: {
    type: String,
  },
});
module.exports = {
  Users,
  Roles,
  DataSources,
  SharedDataSourceLocations,
  DataSourcePair,
  MetaData,
  usersFields,
  Tasks,
  SMTP,
};
