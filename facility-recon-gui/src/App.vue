<template>
  <v-app>
    <v-toolbar color="primary" dark app>
      <v-toolbar-title v-text="title"></v-toolbar-title>
      <v-toolbar-items>
        <v-btn to="dataSync" flat v-if='!$store.state.denyAccess'>
          <v-icon>sync</v-icon>Data Sync And Upload
        </v-btn>
        <v-btn flat to="dataSourcePair" v-if='!$store.state.denyAccess'>
          <v-icon>compare_arrows</v-icon> Data Source Pair
        </v-btn>
        <v-btn flat to="dbAdmin" v-if='!$store.state.denyAccess'>
          <v-icon>archive</v-icon> Archived Uploads
        </v-btn>
        <v-btn to="view" flat v-if='!$store.state.denyAccess'>
          <v-icon>list</v-icon>View
        </v-btn>
        <v-btn flat to="scores" v-if='!$store.state.denyAccess'>
          <v-icon>find_in_page</v-icon> Reconcile
        </v-btn>
        <v-btn flat to="recoStatus" v-if='!$store.state.denyAccess'>
          <v-icon>dashboard</v-icon> Reconciliation Status
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
      <v-dialog v-model="initializingApp" persistent width="300">
        <v-card color="primary" dark>
          <v-card-text>
            Initializing App
            <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-dialog>
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
const backendServer = process.env.BACKEND_SERVER

console.log(backendServer)
export default {
  mixins: [scoresMixin, generalMixin],
  data () {
    return {
      initializingApp: false,
      fixed: false,
      title: 'Facility Reconciliation'
    }
  },
  methods: {
    renderInitialPage () {
      let source1 = this.$store.state.dataSourcePair.source1.name
      let source2 = this.$store.state.dataSourcePair.source2.name
      if (!source1 || !source2) {
        this.$router.push({ name: 'FacilityReconScores' })
        return
      }
      source1 = this.toTitleCase(source1)
      source2 = this.toTitleCase(source2)
      axios.get(backendServer + '/uploadAvailable/' + source1 + '/' + source2).then((results) => {
        if (results.data.dataUploaded) {
          this.$router.push({ name: 'FacilityReconScores' })
        } else {
          this.$router.push({ name: 'FacilityReconDataSync' })
        }
      }).catch((err) => {
        console.log(err)
        this.$router.push({ name: 'FacilityReconScores' })
      })
    },
    getTotalLevels () {
      let source1 = this.$store.state.dataSourcePair.source1.name
      let source2 = this.$store.state.dataSourcePair.source2.name
      if (!source1 || !source2) {
        this.$store.state.totalSource1Levels = 5
        this.$store.state.totalSource2Levels = 5
        this.initializingApp = false
        this.getScores()
        this.$store.state.recoLevel = 2
        this.getRecoStatus()
        return
      }
      source1 = this.toTitleCase(source1)
      source2 = this.toTitleCase(source2)
      axios.get(backendServer + '/countLevels/' + source1 + '/' + source2).then((levels) => {
        this.initializingApp = false
        this.$store.state.totalSource1Levels = levels.data.totalSource1Levels
        this.$store.state.totalSource2Levels = levels.data.totalSource2Levels
        this.getScores()
        this.$store.state.recoLevel = 2
        this.getRecoStatus()
      })
    },
    getRecoStatus () {
      var orgUnit = this.$store.state.orgUnit
      axios.get(backendServer + '/recoStatus/' + orgUnit.OrgId).then((status) => {
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
      axios.get(backendServer + '/getDataSources/').then((response) => {
        this.$store.state.loadingServers = false
        this.$store.state.dataSources = response.data.servers
        this.getDataSourcePair()
      }).catch((err) => {
        this.$store.state.loadingServers = false
        console.log(err.response.error)
      })
    },
    getDataSourcePair () {
      axios.get(backendServer + '/getDataSourcePair/').then((response) => {
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
          }
          if (source2) {
            this.$store.state.dataSourcePair.source2.id = source2._id
            this.$store.state.dataSourcePair.source2.name = source2.name
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
    this.$store.state.clientId = uuid.v4()
    this.initializingApp = true
    this.$store.state.denyAccess = false
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
    this.getDataSources()
  },
  name: 'App'
}
</script>
