<template>
  <v-app>
    <v-toolbar
      color="primary" dark
      app
    >
      <v-toolbar-title v-text="title"></v-toolbar-title>
      <v-toolbar-items>
        <v-btn to="/" flat>Home</v-btn>
        <v-btn to="upload" flat>Upload</v-btn>
        <v-btn to="view" flat>View</v-btn>
        <v-btn flat to="scores">Reconcile</v-btn>
      </v-toolbar-items>
      <v-spacer></v-spacer>
      <v-toolbar-items>
        {{$store.state.orgUnit.OrgName}}
      </v-toolbar-items>
    </v-toolbar>
    <v-content>
      <router-view/>
    </v-content>
    <v-footer dark color="primary" :fixed="fixed" app>
      <span>&copy; 2018</span>
    </v-footer>
  </v-app>
</template>

<script>
import axios from 'axios'
const config = require('../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)

export default {
  data () {
    return {
      fixed: false,
      title: 'Facility Reconciliation',
      recalculate: true
    }
  },
  methods: {
    getOrgHierarchy () {
      var orgUnit = this.$store.state.orgUnit
      axios.get(backendServer + '/hierarchy/datim', { params: orgUnit }).then((hierarchy) => {
        this.$store.state.datimHierarchy = hierarchy
      })

      axios.get(backendServer + '/hierarchy/moh/', { params: orgUnit }).then((hierarchy) => {
        this.$store.state.mohHierarchy = hierarchy
      })
    },
    getTotalLevels () {
      var orgUnit = this.$store.state.orgUnit
      axios.get(backendServer + '/countLevels/' + orgUnit.OrgId).then((levels) => {
        this.$store.state.totalLevels = levels.data.totalLevels
        this.$store.state.recoLevel = levels.data.recoLevel
        this.getOrgHierarchy()
        this.getScores()
      })
    },
    getScores () {
      let orgid = this.$store.state.orgUnit.OrgId
      let recoLevel = this.$store.state.recoLevel
      let totalLevels = this.$store.state.totalLevels
      this.$store.state.matchedContent = null
      this.$store.state.noMatchContent = null
      this.$store.state.datimUnMatched = null
      this.$store.state.mohUnMatched = null
      this.$store.state.flagged = null
      // generating levels
      this.$store.state.levelArray = []
      for (var k = 1; k <= this.$store.state.totalLevels; k++) {
        this.$store.state.levelArray.push({text: 'Level ' + k, value: k})
      }
      axios.get(backendServer + '/reconcile/' + orgid + '/' + totalLevels + '/' + recoLevel).then((scores) => {
        this.$store.state.mohUnMatched = []
        this.$store.state.matchedContent = []
        this.$store.state.noMatchContent = []
        this.$store.state.flagged = []
        this.getDatimUnmached()
        this.$store.state.scoreResults = scores.data.scoreResults
        for (let scoreResult of this.$store.state.scoreResults) {
          if (scoreResult.moh.hasOwnProperty('tag') && scoreResult.moh.tag === 'flagged') {
            this.$store.state.flagged.push({
              mohName: scoreResult.moh.name,
              mohId: scoreResult.moh.id,
              mohParents: scoreResult.moh.parents.join('->'),
              datimName: scoreResult.exactMatch.name,
              datimId: scoreResult.exactMatch.id,
              datimParents: scoreResult.exactMatch.parents.join('->')
            })
          } else if (scoreResult.moh.hasOwnProperty('tag') && scoreResult.moh.tag === 'noMatch') {
            let parents = scoreResult.moh.parents.join('->')
            this.$store.state.noMatchContent.push({
              mohName: scoreResult.moh.name,
              mohId: scoreResult.moh.id,
              parents: parents
            })
          } else if (Object.keys(scoreResult.exactMatch).length > 0) {
            this.$store.state.matchedContent.push({
              mohName: scoreResult.moh.name,
              mohId: scoreResult.moh.id,
              mohParents: scoreResult.moh.parents.join('->'),
              datimName: scoreResult.exactMatch.name,
              datimId: scoreResult.exactMatch.id,
              datimParents: scoreResult.exactMatch.parents.join('->')
            })
          } else {
            // let parents = scoreResult.moh.parents.join('->')
            let addTree = this.$store.state.mohParents
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
      })
    },
    getDatimUnmached () {
      let orgid = this.$store.state.orgUnit.OrgId
      let recoLevel = this.$store.state.recoLevel
      axios.get(backendServer + '/getUnmatched/' + orgid + '/datim/' + recoLevel).then((unmatched) => {
        this.$store.state.datimUnMatched = []
        this.$store.state.datimUnMatched = unmatched.data
      })
    }
  },
  created () {
    this.getTotalLevels()
    this.$root.$on('recalculateScores', () => {
      this.getScores()
    })
  },
  name: 'App'
}
</script>
