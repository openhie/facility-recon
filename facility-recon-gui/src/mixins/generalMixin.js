import axios from 'axios'
import { eventBus } from '@/main'
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
      let useCSVHeader = this.$store.state.config.userConfig.reconciliation.useCSVHeader
      let levelMapping = this.$store.state.levelMapping
      /**
       * if the use of CSV Headers is not enabled or csv header enabled but level mapping were not available
       * and instead the app manually mapped i.e level1 to level1, level2 to level2 .... facility to level5
      */
      if (!useCSVHeader || (useCSVHeader && levelMapping[source]['level' + level] === 'level' + level)) {
        return 'Level ' + level
      }
      if (Object.keys(this.$store.state.levelMapping[source]).length > 0) {
        // get level adjustment for shared sources with limited org units
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
        } else {
          if (dtSrc1.shareToAll.activated && dtSrc1.shareToAll.limitByUserLocation) {
            sourceLimitOrgId.source1LimitOrgId = this.$store.state.dhis.user.orgId
            if (!sourceLimitOrgId.source1LimitOrgId) {
              sourceLimitOrgId.source1LimitOrgId = 'undefined'
            }
          }
        }
      }

      if (dtSrc2 && dtSrc2.hasOwnProperty('userID') && dtSrc2.userID._id !== this.$store.state.auth.userID) {
        let limit = dtSrc2.sharedLocation.find((sharedLocation) => {
          return sharedLocation.user === this.$store.state.auth.userID
        })
        if (limit) {
          sourceLimitOrgId.source2LimitOrgId = limit.location
        } else {
          if (dtSrc2.shareToAll.activated && dtSrc2.shareToAll.limitByUserLocation) {
            sourceLimitOrgId.source2LimitOrgId = this.$store.state.dhis.user.orgId
            if (!sourceLimitOrgId.source2LimitOrgId) {
              sourceLimitOrgId.source2LimitOrgId = 'undefined'
            }
          }
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
        } else {
          if (dataSource.shareToAll.activated && dataSource.shareToAll.limitByUserLocation) {
            limitOrgId = this.$store.state.dhis.user.orgId
            if (!limitOrgId) {
              limitOrgId = 'undefined'
            }
          }
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
    },
    saveConfiguration (configLevel, configName) {
      let userID = this.$store.state.auth.userID
      let formData = new FormData()
      formData.append('config', JSON.stringify(this.$store.state.config))
      formData.append('userID', userID)
      let endPoint
      if (configLevel === 'generalConfig') {
        endPoint = '/updateGeneralConfig'
      } else {
        endPoint = '/updateUserConfig'
      }
      axios
        .post(backendServer + endPoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(() => {
          if (configName === 'useCSVHeader') {
            eventBus.$emit('changeCSVHeaderNames')
          }
          if (configName === 'authDisabled') {
            this.$router.push({ name: 'Logout' })
          }
        })
    }
  }
}
