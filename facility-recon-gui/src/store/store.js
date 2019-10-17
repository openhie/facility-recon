import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import router from '../router'
import VueCookies from 'vue-cookies'

Vue.use(Vuex)

export const store = new Vuex.Store({
  state: {
    baseRouterViewKey: 0,
    alert: {
      width: '800px',
      show: false,
      msg: '',
      type: 'success', // success or error
      dismisible: true,
      transition: 'scale-transition'
    },
    auth: {
      username: '',
      userID: '',
      role: '',
      token: ''
    },
    levelMapping: {
      source1: {},
      source2: {}
    },
    config: {
      userConfig: {
        reconciliation: {
          useCSVHeader: true
        }
      },
      generalConfig: {
        reconciliation: {
          parentConstraint: {
            enabled: true,
            idAutoMatch: true,
            nameAutoMatch: false
          },
          singlePair: false,
          singleDataSource: false,
          fixSource2To: null,
          fixSource2: false
        },
        recoProgressNotification: {
          enabled: false
        },
        allowShareToAllForNonAdmin: false,
        selfRegistration: {
          enabled: false,
          requiresApproval: false
        },
        datasetsAdditionWays: ['CSV Upload', 'Remote Servers Sync'],
        datasetsAutosyncTime: '*/15 * * * *',
        authDisabled: false,
        authMethod: 'dhis2',
        externalAuth: {
          pullOrgUnits: true,
          shareOrgUnits: true,
          shareByOrgId: true,
          datasetName: null,
          adminRole: null
        }
      }
    },
    signupFields: {},
    customSignupFields: {},
    recoStatus: {
      'status': 'in-progress'
    },
    recalculateScores: false,
    dialogError: false,
    errorTitle: '',
    errorDescription: '',
    errorColor: 'primary',
    clientId: null,
    denyAccess: true,
    source2Hierarchy: '',
    source1Hierarchy: '',
    uploadRunning: false,
    dhis: {
      user: {
        orgId: '',
        orgName: ''
      },
      host: '',
      dev: {
        auth: {
          username: '',
          password: ''
        }
      }
    },
    dataSourcePairs: [],
    activePair: {
      source1: {},
      source2: {}
    },
    source1TotalAllRecords: 0,
    source2TotalAllRecords: 0,
    totalAllMapped: 0,
    totalAllFlagged: 0,
    totalAllNoMatch: 0,
    totalAllIgnore: 0,
    source1TotalAllNotMapped: 0,
    source2TotalRecords: 0,
    recoLevel: 2,
    totalSource1Levels: '',
    totalSource2Levels: '',
    matchedContent: [],
    noMatchContent: [],
    ignoreContent: [],
    flagged: [],
    source1Parents: [],
    source2UnMatched: [],
    source1UnMatched: [],
    scoreResults: [],
    levelArray: [],
    scoresProgressData: {
      scoreDialog: false,
      scoreProgressTitle: 'Waiting for progress status',
      stage: 'not final',
      scoreProgressPercent: null,
      progressType: '',
      scoreProgressTimer: false,
      progressReqTimer: '',
      requestCancelled: false,
      cancelTokenSource: ''
    },
    scoreSavingProgressData: {
      percent: null,
      savingMatches: false,
      savingProgressTimer: false,
      progressReqTimer: '',
      requestCancelled: false,
      cancelTokenSource: ''
    },
    uploadProgressData: {},
    dataSources: [],
    remoteDataSources: ['DHIS2', 'FHIR'],
    loadingServers: false,
    dynamicProgress: false,
    initializingApp: false
  }
})

axios.interceptors.request.use((config) => {
  let token = store.state.auth.token
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

axios.interceptors.response.use((response) => {
  return response
}, function (error) {
  let status = error.response.status
  if (status === 401) {
    store.state.auth.token = ''
    VueCookies.remove('token')
    router.push('login')
  }
  return Promise.reject(error)
})
