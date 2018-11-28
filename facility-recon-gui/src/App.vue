<template>
  <v-app>
    <v-toolbar color="primary" dark app>
      <v-toolbar-title v-text="title"></v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-items v-if="$store.state.auth.token">
        <v-tooltip bottom>
          <v-btn to="dataSync" flat v-if='!$store.state.denyAccess' slot="activator">
            <v-icon>sync</v-icon>Data Sync And Upload
          </v-btn>
          <span>Upload CSV data or synhronize remote server data</span>
        </v-tooltip>
        <v-tooltip bottom>
          <v-btn flat to="dataSourcePair" v-if='!$store.state.denyAccess' slot="activator">
            <v-icon>compare_arrows</v-icon> Data Source Pair
          </v-btn>
          <span>Select data sources to start mathing</span>
        </v-tooltip>
        <v-tooltip bottom>
          <v-btn to="view" flat v-if='!$store.state.denyAccess' slot="activator">
            <v-icon>list</v-icon>View
          </v-btn>
          <span>Explore data sources contents</span>
        </v-tooltip>
        <v-tooltip bottom>
          <v-btn flat to="scores" v-if='!$store.state.denyAccess' slot="activator">
            <v-icon>find_in_page</v-icon> Reconcile
          </v-btn>
          <span>Perform location matching of your selected data sources</span>
        </v-tooltip>
        <v-tooltip bottom>
          <v-btn flat to="recoStatus" v-if='!$store.state.denyAccess' slot="activator">
            <v-icon>dashboard</v-icon> Reconciliation Status
          </v-btn>
          <span>Matching Status</span>
        </v-tooltip>
        <v-btn flat to="dbAdmin" v-if='!$store.state.denyAccess'>
          <v-icon>archive</v-icon> Archived Uploads
        </v-btn>
        <v-btn flat to="addUser" v-if='!$store.state.denyAccess'>
          <v-icon>perm_identity</v-icon> Add User
        </v-btn>
        <v-btn flat to="logout" v-if='!$store.state.denyAccess'>
          <v-icon>logout</v-icon> Logout
        </v-btn>
      </v-toolbar-items>
      <v-spacer></v-spacer>
      <v-toolbar-items>

      </v-toolbar-items>
    </v-toolbar>
    <v-content>
      <v-dialog v-model="$store.state.dynamicProgress" persistent width="300">
        <v-card color="primary" dark>
          <v-card-text>
            {{$store.state.progressTitle}}
            <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog persistent v-model="$store.state.dialogError" max-width="500px">
        <v-card>
          <v-toolbar color="primary" dark>
            <v-toolbar-title>
              {{$store.state.errorTitle}}
            </v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            {{$store.state.errorDescription}}
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click.native="$store.state.dialogError = false">Ok</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="$store.state.initializingApp" persistent width="300">
        <v-card color="primary" dark>
          <v-card-text>
            Initializing App
            <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-dialog>
      <template v-if="Object.keys($store.state.dataSourcePair.source1).length > 0 && $store.state.auth.token">
        Source 1: <b>{{$store.state.dataSourcePair.source1.name}}</b>, &nbsp; &nbsp; Source 2: <b>{{$store.state.dataSourcePair.source2.name}}</b>
      </template>
      <router-view/>
    </v-content>
    <v-footer dark color="primary" :fixed="fixed" app>
      
    </v-footer>
  </v-app>
</template>

<script>
import axios from 'axios'
import { scoresMixin } from './mixins/scoresMixin'
import { eventBus } from './main'
import { uuid } from 'vue-uuid'
import { generalMixin } from './mixins/generalMixin'
import VueCookies from 'vue-cookies'
const backendServer = process.env.BACKEND_SERVER

export default {
  mixins: [scoresMixin, generalMixin],
  data () {
    return {
      fixed: false,
      title: 'Facility Reconciliation'
    }
  },
  methods: {
    renderInitialPage () {
      let source1 = this.$store.state.dataSourcePair.source1.name
      let source2 = this.$store.state.dataSourcePair.source2.name
      if ((!source1 || !source2) && this.$store.state.dataSources.length > 1) {
        this.$router.push({ name: 'FacilityReconDataSourcePair' })
        return
      }
      if (!source1 || !source2) {
        this.$router.push({ name: 'FacilityReconDataSync' })
        return
      }
      source1 = this.toTitleCase(source1)
      source2 = this.toTitleCase(source2)
      let userID = this.$store.state.auth.userID
      axios.get(backendServer + '/uploadAvailable/' + source1 + '/' + source2 + '/' + userID).then((results) => {
        if (results.data.dataUploaded) {
          this.$router.push({ name: 'FacilityReconScores' })
        } else {
          this.$router.push({ name: 'FacilityReconDataSync' })
        }
      }).catch((err) => {
        console.log(err)
        this.$router.push({ name: 'FacilityReconDataSync' })
      })
    },
    getTotalLevels () {
      let source1 = this.$store.state.dataSourcePair.source1.name
      let source2 = this.$store.state.dataSourcePair.source2.name
      if (!source1 || !source2) {
        this.$store.state.totalSource1Levels = 5
        this.$store.state.totalSource2Levels = 5
        this.$store.state.initializingApp = false
        this.getScores()
        this.$store.state.recoLevel = 2
        this.getRecoStatus()
        return
      }
      source1 = this.toTitleCase(source1)
      source2 = this.toTitleCase(source2)
      let userID = this.$store.state.auth.userID
      axios.get(backendServer + '/countLevels/' + source1 + '/' + source2 + '/' + userID).then((levels) => {
        this.$store.state.initializingApp = false
        this.$store.state.totalSource1Levels = levels.data.totalSource1Levels
        this.$store.state.totalSource2Levels = levels.data.totalSource2Levels
        this.getScores()
        this.$store.state.recoLevel = 2
        this.getRecoStatus()
      })
    },
    getRecoStatus () {
      if (Object.keys(this.$store.state.dataSourcePair.source1).length === 0 || Object.keys(this.$store.state.dataSourcePair.source2).length === 0) {
        return
      }
      let source1 = this.toTitleCase(this.$store.state.dataSourcePair.source1.name)
      let source2 = this.toTitleCase(this.$store.state.dataSourcePair.source2.name)
      axios.get(backendServer + '/recoStatus/' + source1 + '/' + source2).then((status) => {
        if (status.data.status) {
          this.$store.state.recoStatus.status = status.data.status
        }
      }).catch((err) => {
        console.log(err.response.data.error)
      })
    },
    getDataSources () {
      this.$store.state.loadingServers = true
      this.$store.state.dataSources = []
      let userID = this.$store.state.auth.userID
      axios.get(backendServer + '/getDataSources/' + userID).then((response) => {
        this.$store.state.loadingServers = false
        this.$store.state.dataSources = response.data.servers
        this.getDataSourcePair()
      }).catch((err) => {
        this.$store.state.loadingServers = false
        console.log(JSON.stringify(err))
        console.log(err.response.error)
      })
    },
    getDataSourcePair () {
      let userID = this.$store.state.auth.userID
      axios.get(backendServer + '/getDataSourcePair/' + userID).then((response) => {
        if (response.data) {
          let source1 = this.$store.state.dataSources.find((dataSources) => {
            return dataSources._id === response.data.source1
          })
          let source2 = this.$store.state.dataSources.find((dataSources) => {
            return dataSources._id === response.data.source2
          })
          if (source1) {
            this.$store.state.dataSourcePair.source1.id = source1._id
            this.$store.state.dataSourcePair.source1.name = source1.name
          } else {
            this.$store.state.dataSourcePair.source1 = {}
          }
          if (source2) {
            this.$store.state.dataSourcePair.source2.id = source2._id
            this.$store.state.dataSourcePair.source2.name = source2.name
          } else {
            this.$store.state.dataSourcePair.source2 = {}
          }
        } else {
          this.$store.state.dataSourcePair.source1 = {}
          this.$store.state.dataSourcePair.source2 = {}
        }
        this.renderInitialPage()
        this.getTotalLevels()
      })
    }
  },
  created () {
    if (VueCookies.get('token') && VueCookies.get('userID')) {
      this.$store.state.auth.token = VueCookies.get('token')
      this.$store.state.auth.userID = VueCookies.get('userID')
      axios.get(backendServer + '/isTokenActive/').then((response) => {
        // will come here only if the token is active
        this.$store.state.clientId = uuid.v4()
        this.$store.state.initializingApp = true
        this.$store.state.denyAccess = false
        this.getDataSources()
      })
    }
    eventBus.$on('refreshApp', () => {
      this.getDataSources()
    })
    eventBus.$on('recalculateScores', () => {
      this.getScores()
    })
    eventBus.$on('getDataSources', () => {
      this.getDataSources()
    })
    eventBus.$on('getDataSourcePair', () => {
      this.getDataSourcePair()
    })
  },
  name: 'App'
}
</script>
