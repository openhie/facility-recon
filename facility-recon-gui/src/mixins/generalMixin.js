import axios from 'axios'
import {
  eventBus
} from '@/main'
const backendServer = process.env.BACKEND_SERVER
export const generalMixin = {
  data () {
    return {
      roles: [],
      tasks: []
    }
  },
  computed: {
    canAddDataset () {
      if (
        !this.$store.state.config.generalConfig.reconciliation.singleDataSource
      ) {
        return true
      } else {
        let totalDtSrcs = 0
        for (let source of this.$store.state.dataSources) {
          if (
            source._id ===
            this.$store.state.config.generalConfig.reconciliation.fixSource2To
          ) {
            continue
          }
          let userID = this.$store.state.auth.userID
          let orgId = this.$store.state.dhis.user.orgId
          let sharedToMe = source.shared.users.find(user => {
            return user._id === userID
          })
          let itsMine = source.owner.id === userID
          let sharedToAll = source.shareToAll.activated === true
          let sameOrgId = false
          if (source.owner.orgId && source.owner.orgId === orgId) {
            sameOrgId = true
          }
          if (!itsMine && !sharedToMe && !sharedToAll && !sameOrgId) {
            continue
          }
          totalDtSrcs++
        }
        if (totalDtSrcs >= 1) {
          this.datasetLimitWarn = true
          return false
        } else {
          return true
        }
      }
    }
  },
  methods: {
    getCodeSystem (codeSystemType, callback) {
      axios
        .get('/FR/getCodeSystem', {
          params: {
            codeSystemType
          }
        })
        .then(response => {
          return callback(null, response.data)
        })
        .catch(err => {
          console.log(err)
          return callback(err, null)
        })
    },
    getTree (includeBuilding, callback) {
      axios.get(backendServer + '/FR/getTree', {
        params: {
          includeBuilding
        }
      }).then((hierarchy) => {
        if (hierarchy.data) {
          let err = false
          return callback(err, hierarchy.data)
        }
      }).catch((err) => {
        return callback(err, [])
      })
    },
    clearProgress (type) {
      axios.get(
        backendServer +
        '/clearProgress/' +
        type +
        '/' +
        this.$store.state.clientId
      )
    },
    getGeneralConfig (callback) {
      let defaultGenerConfig = JSON.stringify(
        this.$store.state.config.generalConfig
      )
      axios
        .get(backendServer + '/getGeneralConfig?defaultGenerConfig=' + defaultGenerConfig)
        .then(config => {
          if (config) {
            this.$store.state.config.generalConfig = config.data
          }
          return callback()
        })
        .catch(() => {
          return callback()
        })
    },
    toTitleCase (str) {
      return str
        .toLowerCase()
        .split(' ')
        .map(word => word.replace(word[0], word[0].toUpperCase()))
        .join('')
        .toLowerCase()
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
        if (
          levelValue &&
          levelValue !== 'null' &&
          levelValue !== 'undefined' &&
          levelValue !== 'false'
        ) {
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
        if (
          pair.userID._id === this.$store.state.auth.userID &&
          pair.status === 'active'
        ) {
          activeDataSourcePair = pair
        }
        if (Object.keys(activeDataSourcePair).length > 0) {
          shared = undefined
          return
        }
        if (
          pair.userID._id !== this.$store.state.auth.userID &&
          pair.shared.activeUsers.indexOf(this.$store.state.auth.userID) !== -1
        ) {
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
      let dtSrc1 = this.$store.state.dataSources.find(dtSrc => {
        return dtSrc._id === this.$store.state.activePair.source1.id
      })
      let dtSrc2 = this.$store.state.dataSources.find(dtSrc => {
        return dtSrc._id === this.$store.state.activePair.source2.id
      })

      if (dtSrc1 && dtSrc1.hasOwnProperty('userID') && dtSrc1.userID._id !== this.$store.state.auth.userID) {
        let limit = dtSrc1.sharedLocation.find(sharedLocation => {
          return sharedLocation.user === this.$store.state.auth.userID
        })
        if (limit) {
          sourceLimitOrgId.source1LimitOrgId = limit.location
        } else {
          if (
            dtSrc1.shareToAll.activated &&
            dtSrc1.shareToAll.limitByUserLocation
          ) {
            sourceLimitOrgId.source1LimitOrgId = this.$store.state.dhis.user.orgId
            if (!sourceLimitOrgId.source1LimitOrgId) {
              sourceLimitOrgId.source1LimitOrgId = 'undefined'
            }
          }
        }
      }

      if (dtSrc2 && dtSrc2.hasOwnProperty('userID') && dtSrc2.userID._id !== this.$store.state.auth.userID) {
        let limit = dtSrc2.sharedLocation.find(sharedLocation => {
          return sharedLocation.user === this.$store.state.auth.userID
        })
        if (limit) {
          sourceLimitOrgId.source2LimitOrgId = limit.location
        } else {
          if (
            dtSrc2.shareToAll.activated &&
            dtSrc2.shareToAll.limitByUserLocation
          ) {
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
        let limit = dataSource.sharedLocation.find(sharedLocation => {
          return sharedLocation.user === this.$store.state.auth.userID
        })
        if (limit) {
          limitOrgId = limit.location
        } else {
          if (
            dataSource.shareToAll.activated &&
            dataSource.shareToAll.limitByUserLocation
          ) {
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
      axios
        .get(backendServer + '/getRoles')
        .then(roles => {
          for (let role of roles.data) {
            this.roles.push({
              text: role.name,
              value: role._id,
              tasks: role.tasks
            })
          }
        })
        .catch(err => {
          console.log(err.response)
        })
    },
    getTasks () {
      axios
        .get(backendServer + '/getTasks')
        .then(tasks => {
          this.tasks = tasks.data
        })
        .catch(err => {
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
            this.$router.push({
              name: 'Logout'
            })
          }
        })
    },
    setDHIS2Credentials () {
      // tell the backend that auth is disabled
      this.$store.state.auth.token = ''
      if (process.env.NODE_ENV === 'production') {
        let href = location.href.split('api')
        if (href.length < 2) {
          return false
        }
        this.$store.state.dhis.host = location.href.split('api').shift()
        axios.defaults.params = {
          authDisabled: true
        }
        return true
      } else if (process.env.NODE_ENV === 'development') {
        this.$store.state.dhis.host = 'https://test.geoalign.datim.org/'
        this.$store.state.dhis.dev.auth.username = 'Alicia_MOH_DataImport'
        this.$store.state.dhis.dev.auth.password = 'P@$$w0rd@1'
        axios.defaults.params = {
          authDisabled: true
        }
        return true
      }
    }
  }
}
