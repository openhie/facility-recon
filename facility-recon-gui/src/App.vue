<template>
  <v-app>
    <v-toolbar color="primary" dark app>
      <v-toolbar-title v-text="title"></v-toolbar-title>
      <v-toolbar-items>
        <v-btn flat :href="dhisLink" v-if='dhisLink'>
          <img src="./assets/dhis2.png"/>
        </v-btn>
        <v-btn to="upload" flat v-if='!$store.state.denyAccess'>
          <v-icon>cloud_upload</v-icon>Upload
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
          <v-icon>bar_chart</v-icon> Reconciliation Status
        </v-btn>
      </v-toolbar-items>
      <v-spacer></v-spacer>
      <v-toolbar-items>
        {{$store.state.orgUnit.OrgName}}
      </v-toolbar-items>
    </v-toolbar>
    <v-content>
      <v-dialog persistent v-model="$store.state.dialogError" max-width="500px">
        <v-card>
          <v-card-title>
            {{$store.state.errorTitle}}
          </v-card-title>
          <v-card-text>
            {{$store.state.errorDescription}}
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click.native="$store.state.dialogError = false">Ok</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="initializingApp" hide-overlay persistent width="300">
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
import { uuid } from 'vue-uuid'
const config = require('../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)

export default {
  mixins: [scoresMixin],
  data () {
    return {
      initializingApp: false,
      fixed: false,
      title: 'Facility Reconciliation'
    }
  },
  computed: {
    dhisLink () {
      if (isProduction) {
        return window.location.protocol + '//' + window.location.hostname
      } else {
        return false
      }
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
    renderInitialPage () {
      var OrgId = this.$store.state.orgUnit.OrgId
      axios.get(backendServer + '/uploadAvailable/' + OrgId).then((results) => {
        this.getTotalLevels()
        if (results.data.dataUploaded) {
          this.$router.push({name: 'FacilityReconScores'})
        } else {
          this.$router.push({name: 'FacilityReconUpload'})
        }
      }).catch((err) => {
        console.log(err)
        this.$router.push({name: 'FacilityReconScores'})
      })
    },
    getTotalLevels () {
      this.getRecoStatus()
      var orgUnit = this.$store.state.orgUnit
      axios.get(backendServer + '/countLevels/' + orgUnit.OrgId).then((levels) => {
        this.initializingApp = false
        this.$store.state.totalLevels = levels.data.totalLevels
        this.getOrgHierarchy()
        this.getScores()
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
    getOrganisationUnit () {
      var href = location.href.split('api').shift()
      axios.get(href + 'api/me').then((userData) => {
        var orgUnitsIDs = userData.data.organisationUnits
        if (orgUnitsIDs.length > 0) {
          this.$store.state.orgUnit.OrgId = orgUnitsIDs.shift().id
          axios.get(href + 'api/organisationUnits/' + this.$store.state.orgUnit.OrgId).then((orgUnits) => {
            this.$store.state.orgUnit.OrgName = orgUnits.data.displayName
            if (this.$store.state.orgUnit.OrgName === 'Global') {
              this.$store.state.denyAccess = true
              this.initializingApp = false
            } else {
              this.renderInitialPage()
              this.$store.state.denyAccess = false
            }
          })
        }
      })
    }
  },
  created () {
    this.$store.state.clientId = uuid.v4()
    this.initializingApp = true
    if (isProduction) {
      this.getOrganisationUnit()
    } else {
      this.renderInitialPage()
      this.$store.state.denyAccess = false
    }
    this.$root.$on('reloadTree', () => {
      this.$store.state.mohHierarchy = ''
      this.$store.state.datimHierarchy = ''
      this.getOrgHierarchy()
    })
    this.$root.$on('refreshApp', () => {
      this.getTotalLevels()
    })
    this.$root.$on('recalculateScores', () => {
      this.getScores()
    })
  },
  name: 'App'
}
</script>
