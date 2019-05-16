import axios from 'axios'
const backendServer = process.env.BACKEND_SERVER
export const generalMixin = {
  data () {
    return {
      roles: []
    }
  },
  methods: {
    toTitleCase (str) {
      return str.toLowerCase().split(' ').map(word => word.replace(word[0], word[0].toUpperCase())).join('')
    },
    translateDataHeader (source, level) {
      if (!this.$store.state.config.userConfig.reconciliation.useCSVHeader) {
        return 'Level ' + level
      }
      if (Object.keys(this.$store.state.levelMapping[source]).length > 0) {
        // get level adjustment for shared sources with limited org unites
        let levelMapping = this.$store.state.levelMapping[source]
        let countLevelMapping = 1
        for (let level in levelMapping) {
          if (level.indexOf('level') === 0) {
            countLevelMapping++
          }
        }
        let totalLevels
        if (source === 'source1') {
          totalLevels = this.$store.state.totalSource1Levels
        }
        if (source === 'source2') {
          totalLevels = this.$store.state.totalSource2Levels
        }
        totalLevels--
        let levelAdjustment = countLevelMapping - totalLevels
        level = level + levelAdjustment
        // end of getting level adjustments

        let levelValue = this.$store.state.levelMapping[source]['level' + level]
        if (levelValue && levelValue !== 'null' && levelValue !== 'undefined' && levelValue !== 'false') {
          return levelValue
        } else {
          return this.$store.state.levelMapping[source]['facility']
        }
      } else {
        return 'Level ' + level
      }
    },
    getActiveDataSourcePair () {
      let shared
      let activeDataSourcePair = {}
      this.$store.state.dataSourcePairs.forEach(pair => {
        if (pair.userID._id === this.$store.state.auth.userID && pair.status === 'active') {
          activeDataSourcePair = pair
        }
        if (Object.keys(activeDataSourcePair).length > 0) {
          shared = undefined
          return
        }
        if (pair.userID._id !== this.$store.state.auth.userID && pair.shared.activeUsers.indexOf(this.$store.state.auth.userID) !== -1) {
          shared = pair
        }
      })
      if (shared) {
        activeDataSourcePair = shared
      }
      return activeDataSourcePair
    },
    getDatasourceOwner () {
      let sourceOwner = {
        source1Owner: '',
        source2Owner: ''
      }
      if (this.$store.state.activePair.source1.hasOwnProperty('userID')) {
        sourceOwner.source1Owner = this.$store.state.activePair.source1.userID
      }
      if (this.$store.state.activePair.source2.hasOwnProperty('userID')) {
        sourceOwner.source2Owner = this.$store.state.activePair.source2.userID
      }
      return sourceOwner
    },
    getLimitOrgIdOnActivePair () {
      let sourceLimitOrgId = {
        source1LimitOrgId: '',
        source2LimitOrgId: ''
      }
      let dtSrc1 = this.$store.state.dataSources.find((dtSrc) => {
        return dtSrc._id === this.$store.state.activePair.source1.id
      })
      let dtSrc2 = this.$store.state.dataSources.find((dtSrc) => {
        return dtSrc._id === this.$store.state.activePair.source2.id
      })

      if (dtSrc1 && dtSrc1.hasOwnProperty('userID') && dtSrc1.userID._id !== this.$store.state.auth.userID) {
        let limit = dtSrc1.sharedLocation.find((sharedLocation) => {
          return sharedLocation.user === this.$store.state.auth.userID
        })
        if (limit) {
          sourceLimitOrgId.source1LimitOrgId = limit.location
        }
      }

      if (dtSrc2 && dtSrc2.hasOwnProperty('userID') && dtSrc2.userID._id !== this.$store.state.auth.userID) {
        let limit = dtSrc2.sharedLocation.find((sharedLocation) => {
          return sharedLocation.user === this.$store.state.auth.userID
        })
        if (limit) {
          sourceLimitOrgId.source2LimitOrgId = limit.location
        }
      }

      return sourceLimitOrgId
    },
    getLimitOrgIdOnDataSource (dataSource) {
      let limitOrgId

      if (dataSource && dataSource.hasOwnProperty('userID') && dataSource.userID._id !== this.$store.state.auth.userID) {
        let limit = dataSource.sharedLocation.find((sharedLocation) => {
          return sharedLocation.user === this.$store.state.auth.userID
        })
        if (limit) {
          limitOrgId = limit.location
        }
      }

      return limitOrgId
    },
    getRoles () {
      axios.get(backendServer + '/getRoles').then((roles) => {
        for (let role of roles.data) {
          this.roles.push({text: role.name, value: role._id})
        }
      }).catch((err) => {
        console.log(err.response)
      })
    }
  }
}
