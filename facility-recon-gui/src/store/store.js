import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export const store = new Vuex.Store({
  // Nigeria PqlFzhuPcF1
  // Malawi lZsCb6y0KDX
  // Tanzania mdXu6iCbn2G
  state: {
    datimHierarchy: '',
    mohHierarchy: '',
    orgUnit: { OrgId: 'lZsCb6y0KDX', OrgName: 'Malawi' },
    totalLevels: '',
    recoLevel: 2,
    matchedContent: null,
    noMatchContent: null,
    flagged: null,
    mohParents: [],
    datimUnMatched: null,
    mohUnMatched: null,
    scoreResults: [],
    levelArray: [],
    showArchives: true
  }
})
