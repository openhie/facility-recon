import axios from 'axios'
const config = require('../../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)
export const scoresMixin = {
  data () {
    return {
      scoreProgressTitle: 'Waiting for progress status',
      scoreDialog: false,
      scoreProgressPercent: null,
      progressType: '',
      scoreProgressTimer: false
    }
  },
  methods: {
    checkScoreProgress () {
      const orgId = this.$store.state.orgUnit.OrgId
      const clientId = this.$store.state.clientId
      axios.get(backendServer + '/scoreProgress/' + orgId + '/' + clientId).then((scoreProgress) => {
        if (scoreProgress.data === null || scoreProgress.data === undefined || scoreProgress.data === false) {
          clearInterval(this.scoreProgressTimer)
          return
        }
        this.scoreProgressTitle = scoreProgress.data.status
        if (scoreProgress.data.percent) {
          if (this.progressType !== 'percent') {
            this.progressType = 'percent'
          }
          this.scoreProgressPercent = scoreProgress.data.percent
        }
        if (scoreProgress.data.status === 'Done') {
          clearInterval(this.scoreProgressTimer)
          this.scoreDialog = false
          this.scoreProgressTitle = 'Waiting for progress status'
        }
      }).catch((err) => {
        console.log(err)
      })
    },
    getScores () {
      this.scoreDialog = true
      this.scoreProgressTitle = 'Waiting for progress status'
      this.progressType = 'indeterminate'
      this.$store.state.mohUnMatched = null
      this.$store.state.datimUnMatched = null
      this.$store.state.matchedContent = []
      this.$store.state.noMatchContent = []
      this.$store.state.flagged = []
      this.$store.state.mohTotalAllRecords = 0
      this.$store.state.totalAllMapped = 0
      this.$store.state.totalAllFlagged = 0
      this.$store.state.totalAllNoMatch = 0
      this.$store.state.datimTotalRecords = 0
      this.$store.state.scoreResults = []
      let orgid = this.$store.state.orgUnit.OrgId
      let recoLevel = this.$store.state.recoLevel
      let totalLevels = this.$store.state.totalLevels
      const clientId = this.$store.state.clientId
      let topTree = this.$store.state.mohParents.slice(0, this.$store.state.mohParents.length)
      // generating levels
      this.$store.state.levelArray = []
      for (var k = 1; k < this.$store.state.totalLevels; k++) {
        this.$store.state.levelArray.push({text: 'Level ' + k, value: k + 1})
      }
      axios.get(backendServer + '/reconcile/' + orgid + '/' + totalLevels + '/' + recoLevel + '/' + clientId).then((scores) => {
        this.getDatimUnmached()
        this.$store.state.mohUnMatched = []
        this.$store.state.matchedContent = []
        this.$store.state.noMatchContent = []
        this.$store.state.flagged = []
        this.$store.state.scoreResults = scores.data.scoreResults
        this.$store.state.datimTotalRecords = scores.data.datimTotalRecords
        this.$store.state.datimTotalAllRecords = scores.data.datimTotalAllRecords
        this.$store.state.totalAllMapped = scores.data.totalAllMapped
        this.$store.state.totalAllFlagged = scores.data.totalAllFlagged
        this.$store.state.totalAllNoMatch = scores.data.totalAllNoMatch
        this.$store.state.mohTotalAllNotMapped = scores.data.mohTotalAllNotMapped
        this.$store.state.mohTotalAllRecords = scores.data.mohTotalAllRecords
        for (let scoreResult of this.$store.state.scoreResults) {
          if (scoreResult.moh.hasOwnProperty('tag') && scoreResult.moh.tag === 'flagged') {
            this.$store.state.flagged.push({
              mohName: scoreResult.moh.name,
              mohId: scoreResult.moh.id,
              mohParents: scoreResult.moh.parents,
              datimName: scoreResult.exactMatch.name,
              datimId: scoreResult.exactMatch.id,
              datimParents: scoreResult.exactMatch.parents
            })
          } else if (scoreResult.moh.hasOwnProperty('tag') && scoreResult.moh.tag === 'noMatch') {
            let parents = scoreResult.moh.parents
            this.$store.state.noMatchContent.push({
              mohName: scoreResult.moh.name,
              mohId: scoreResult.moh.id,
              parents: parents
            })
          } else if (Object.keys(scoreResult.exactMatch).length > 0) {
            this.$store.state.matchedContent.push({
              mohName: scoreResult.moh.name,
              mohId: scoreResult.moh.id,
              mohParents: scoreResult.moh.parents,
              datimName: scoreResult.exactMatch.name,
              datimId: scoreResult.exactMatch.id,
              datimParents: scoreResult.exactMatch.parents
            })
          } else {
            let addTree = topTree
            for (let i = scoreResult.moh.parents.length - 1; i >= 0; i--) {
              if (!addTree[scoreResult.moh.parents[i]]) {
                addTree[scoreResult.moh.parents[i]] = {}
              }
              addTree = addTree[scoreResult.moh.parents[i]]
            }
            this.$store.state.mohUnMatched.push({
              name: scoreResult.moh.name,
              id: scoreResult.moh.id,
              parents: scoreResult.moh.parents
            })
          }
        }
        this.$store.state.mohParents = topTree
      })
      this.scoreProgressTimer = setInterval(this.checkScoreProgress, 1000)
    },
    getDatimUnmached () {
      let orgid = this.$store.state.orgUnit.OrgId
      let recoLevel = this.$store.state.recoLevel
      axios.get(backendServer + '/getUnmatched/' + orgid + '/datim/' + recoLevel).then((unmatched) => {
        this.$store.state.datimUnMatched = unmatched.data
      })
    }
  },
  created () {
    this.scoreProgressTitle = this.$store.state.scoresProgressData.scoreProgressTitle
    this.scoreProgressPercent = this.$store.state.scoresProgressData.scoreProgressPercent
    if (this.$store.state.scoresProgressData.scoreDialog) {
      this.scoreDialog = this.$store.state.scoresProgressData.scoreDialog
    } else {
      this.scoreDialog = false
    }
    this.progressType = this.$store.state.scoresProgressData.progressType
    this.scoreProgressTimer = this.$store.state.scoresProgressData.scoreProgressTimer
    if (this.scoreDialog) {
      this.scoreProgressTimer = setInterval(this.checkScoreProgress, 1000)
    }
  },
  destroyed () {
    this.$store.state.scoresProgressData.scoreProgressTitle = this.scoreProgressTitle
    this.$store.state.scoresProgressData.scoreProgressPercent = this.scoreProgressPercent
    this.$store.state.scoresProgressData.scoreDialog = this.scoreDialog
    this.$store.state.scoresProgressData.progressType = this.progressType
    this.$store.state.scoresProgressData.scoreProgressTimer = this.scoreProgressTimer
    clearInterval(this.scoreProgressTimer)
  }
}
