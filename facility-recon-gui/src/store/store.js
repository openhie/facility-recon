import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export const store = new Vuex.Store({
  // Nigeria PqlFzhuPcF1
  // Malawi lZsCb6y0KDX
  // Tanzania mdXu6iCbn2G
  // Global ybg3MO3hcf4
  // Cote D'Ivoire ds0ADyc9UCU
  // Namibia FFVkaV9Zk1S
  // Ethiopia IH1kchw86uA
  state: {
    recoStatus: {
      'status': 'on-progress'
    },
    dialogError: false,
    errorTitle: '',
    errorDescription: '',
    clientId: null,
    denyAccess: true,
    datimHierarchy: '',
    mohHierarchy: '',
    uploadRunning: false,
    orgUnit: {
      OrgId: 'PqlFzhuPcF1',
      OrgName: 'Malawi'
    },
    mohTotalAllRecords: 0,
    datimTotalAllRecords: 0,
    totalAllMapped: 0,
    totalAllFlagged: 0,
    totalAllNoMatch: 0,
    mohTotalAllNotMapped: 0,
    datimTotalRecords: 0,
    recoLevel: 2,
    totalMOHLevels: '',
    totalDATIMLevels: '',
    matchedContent: [],
    noMatchContent: [],
    flagged: [],
    mohParents: [],
    datimUnMatched: [],
    mohUnMatched: [],
    scoreResults: [],
    levelArray: [],
    scoresProgressData: {},
    uploadProgressData: {}
  }
})
