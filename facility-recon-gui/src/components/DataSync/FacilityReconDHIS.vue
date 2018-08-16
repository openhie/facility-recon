<template>
  <v-container>
    <v-dialog v-model="syncProgrIndeter" persistent width="300">
      <v-card color="primary" dark>
        <v-card-text>
          {{syncStatus}}
          <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog v-model="syncProgrPercent" persistent width="270">
      <v-card color="white" dark>
        <v-card-text>
          <center>
            <font style="color:blue">{{syncStatus}}</font><br>
            <v-progress-circular :rotate="-90" :size="100" :width="15" :value="syncPercent" color="primary">
              <v-avatar color="indigo" size="50px">
                <span class="white--text">
                  <b>{{ syncPercent }}%</b>
                </span>
              </v-avatar>
            </v-progress-circular>
          </center>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-layout row wrap>
      <v-spacer></v-spacer>
      <v-flex xs6>
        <v-card class="mx-auto" style="max-width: 500px;">
          <v-system-bar color="deep-purple darken-4" dark>

          </v-system-bar>
          <v-toolbar color="deep-purple accent-4" cards dark flat>
            <v-card-title class="title font-weight-regular">DHIS2 Credentials</v-card-title>
          </v-toolbar>
          <v-form ref="form" class="pa-3 pt-4">
            <v-text-field v-model="name" box required color="deep-purple" label="Source Name"></v-text-field>
            <v-text-field v-model="host" box required color="deep-purple" label="Host"></v-text-field>
            <v-text-field required v-model="username" box color="deep-purple" label="Username"></v-text-field>
            <v-text-field v-model="password" box required color="deep-purple" label="Password" style="min-height: 96px" type="password"></v-text-field>
          </v-form>
          <v-divider></v-divider>
          <v-card-actions>
            <v-btn flat @click="$refs.form.reset()">
              Clear
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn @click="sync" :disabled="$v.$invalid" class="white--text" color="deep-purple accent-4" depressed>Sync</v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
      <v-spacer></v-spacer>
    </v-layout>
  </v-container>
</template>
<script>
import { required, url } from 'vuelidate/lib/validators'
import axios from 'axios'
const config = require('../../../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)
export default {
  data () {
    return {
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
    sync () {
      let formData = new FormData()
      const clientId = this.$store.state.clientId
      formData.append('host', this.host)
      formData.append('username', this.username)
      formData.append('password', this.password)
      formData.append('name', this.name)
      formData.append('clientId', clientId)
      this.syncProgrIndeter = true
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
          console.log('done')
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
    }
  },
  validations: {
    username: { required },
    password: { required },
    host: { required, url },
    name: { required }
  }
}
</script>
