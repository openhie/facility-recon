import {
  eventBus
} from '@/main'
import axios from 'axios'
const backendServer = process.env.BACKEND_SERVER
export const dataSourcePairMixin = {
  methods: {
    createDatasourcePair (source1, source2) {
      if (Object.keys(source1).length === 0 || Object.keys(source2).length === 0) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'Please select data source'
        return
      }
      if (source1.name === source2.name && source1.source === source2.source) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        this.$store.state.errorDescription = 'Data source pair of the same data source is not allowed, change one of the source'
        return
      }

      this.$store.state.dynamicProgress = true
      this.$store.state.progressTitle = 'Creating Data Source Pair'
      let activePairID = null
      if (this.$store.state.activePair.hasOwnProperty('shared') &&
        this.$store.state.activePair.shared.hasOwnProperty('activeUsers') &&
        this.$store.state.activePair.shared.activeUsers.indexOf(this.$store.state.auth.userID) !== -1
      ) {
        activePairID = this.$store.state.activePair._id
      }
      let singlePair = false
      if (this.$store.state.dhis.user.orgId && this.$store.state.config.generalConfig.reconciliation.singlePair) {
        singlePair = true
      }
      if (!activePairID) {
        activePairID = false
      }
      let formData = new FormData()
      formData.append('source1', JSON.stringify(source1))
      formData.append('source2', JSON.stringify(source2))
      formData.append('userID', this.$store.state.auth.userID)
      formData.append('orgId', this.$store.state.dhis.user.orgId)
      formData.append('singlePair', singlePair)
      formData.append('activePairID', activePairID)
      axios.post(backendServer + '/addDataSourcePair', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        this.$store.state.levelMapping.source1 = JSON.parse(response.data).levelMapping1
        this.$store.state.levelMapping.source2 = JSON.parse(response.data).levelMapping2
        eventBus.$emit('getDataSourcePair')
        // this.alertSuccess = true
        // this.alertMsg = 'Data Source Pair Saved Successfully'
        this.$store.state.dynamicProgress = false
      }).catch((error) => {
        this.alertError = true
        this.$store.state.dialogError = true
        if (error.response.data.error) {
          this.$store.state.errorDescription = error.response.data.error
          this.$store.state.errorTitle = 'Pair was not created'
          this.alertMsg = error.response.data.error
        } else {
          this.alertMsg = 'Something went wrong while saving data source pairs.'
        }
        this.$store.state.dynamicProgress = false
        console.log(error)
      })
    },
    activateSharedPair (pairID) {
      this.$store.state.dynamicProgress = true
      this.$store.state.progressTitle = 'Activating Shared Data Source Pair'
      let formData = new FormData()
      formData.append('pairID', pairID)
      formData.append('userID', this.$store.state.auth.userID)
      axios.post(backendServer + '/activateSharedPair', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        eventBus.$emit('getDataSourcePair')
        // this.alertSuccess = true
        // this.alertMsg = 'Data Source Pair Activated Successfully'
        this.$store.state.dynamicProgress = false
      }).catch((error) => {
        this.alertError = true
        this.alertMsg = 'Something went wrong while activating data source pair'
        this.$store.state.dynamicProgress = false
        console.log(error.response.data)
      })
    },
    activatePair () {
      if (this.activeDataSourcePair.userID._id !== this.$store.state.auth.userID) {
        this.activateSharedPair(this.activeDataSourcePair._id)
      } else {
        this.source1 = this.$store.state.dataSources.find((dataSource) => {
          return dataSource._id === this.activeDataSourcePair.source1._id
        })
        this.source2 = this.$store.state.dataSources.find((dataSource) => {
          return dataSource._id === this.activeDataSourcePair.source2._id
        })
        this.createDatasourcePair(this.source1, this.source2)
      }
    }
  }
}
