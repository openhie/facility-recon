import axios from 'axios'
const config = require('../../../../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)
export const syncMixin = {
  data () {
    return {
      syncRunning: false,
      syncProgrIndeter: false,
      syncProgrPercent: false,
      syncStatus: 'Waiting for sync status',
      syncPercent: null,
      syncProgressTimer: '',
      name: '',
      host: '',
      username: '',
      password: ''
    }
  },
  methods: {
    sync (type) {
      if (!type) {
        type = 'full'
      }
      let formData = new FormData()
      const clientId = this.$store.state.clientId
      formData.append('host', this.host)
      formData.append('username', this.username)
      formData.append('password', this.password)
      formData.append('name', this.name)
      formData.append('clientId', clientId)
      formData.append('type', type)
      this.syncRunning = true
      this.syncProgrIndeter = true
      var serverExists = this.$store.state.syncServers.find((syncServer) => {
        return syncServer.host === this.host
      })
      if (serverExists) {
        serverExists.name = this.name
        serverExists.username = this.username
        serverExists.password = this.password
        if (serverExists.name !== this.name ||
          serverExists.username === this.username ||
          serverExists.password === this.password
        ) {
          this.addServer()
        }
      } else {
        this.$store.state.syncServers.push({
          name: this.name,
          host: this.host,
          username: this.username,
          password: this.password
        })
        this.addServer()
      }
      axios.post(backendServer + '/dhisSync/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((syncRes) => {
        this.syncProgressTimer = setInterval(this.checkSyncProgress, 1000)
      }).catch((err) => {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        this.$store.state.errorDescription = err.response.data.error + '. cross check host,user and password'
        clearInterval(this.syncProgressTimer)
        console.log(err.response.data.error)
      })
    },
    checkSyncProgress () {
      const clientId = this.$store.state.clientId
      axios.get(backendServer + '/progress/dhisSyncRequest/' + clientId).then((syncProgress) => {
        if (syncProgress.data === null || syncProgress.data === undefined || syncProgress.data === false) {
          this.$store.state.uploadRunning = false
          this.syncProgrIndeter = false
          this.syncProgrPercent = false
          clearInterval(this.syncProgressTimer)
          return
        } else if (syncProgress.data.error !== null) {
          this.$store.state.uploadRunning = false
          this.syncProgrIndeter = false
          this.syncProgrPercent = false
          this.$store.state.dialogError = true
          this.$store.state.errorTitle = 'Error'
          this.$store.state.errorDescription = syncProgress.data.error
          clearInterval(this.syncProgressTimer)
          console.log(syncProgress.data.error)
          return
        } else if (syncProgress.data.status === null) {
          this.$store.state.uploadRunning = false
          this.syncProgrIndeter = false
          this.syncProgrPercent = false
          clearInterval(this.syncProgressTimer)
          return
        }
        this.syncStatus = syncProgress.data.status
        if (syncProgress.data.percent) {
          if (!this.syncProgrPercent) {
            this.syncProgrIndeter = false
            this.syncProgrPercent = true
          }
          this.syncPercent = syncProgress.data.percent
        }
        if (syncProgress.data.status === 'Done') {
          clearInterval(this.syncProgressTimer)
          this.syncProgrPercent = false
          this.$store.state.uploadRunning = false
        }
      }).catch((err) => {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        console.log(err.response.data.error + '. cross check host,user and password')
        this.$store.state.errorDescription = err.response.data.error + '. cross check host,user and password'
        clearInterval(this.syncProgressTimer)
        console.log(err.response.data.error)
      })
    },
    addServer () {
      let formData = new FormData()
      const clientId = this.$store.state.clientId
      formData.append('host', this.host)
      formData.append('username', this.username)
      formData.append('password', this.password)
      formData.append('name', this.name)
      formData.append('clientId', clientId)
      axios.post(backendServer + '/addServer', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    }
  }
}
