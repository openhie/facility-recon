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
import {scoresMixin} from './mixins/scoresMixin'
const config = require('../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)

export default {
  mixins: [scoresMixin],
  data () {
    return {
      fixed: false,
      title: 'Facility Reconciliation'
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
        this.getOrgHierarchy()
        this.getScores()
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
          })
        }
      })
    }
  },
  created () {
    this.getTotalLevels()
    this.$root.$on('reloadTree', () => {
    /* this.$store.state.mohHierarchy = ''
      this.$store.state.datimHierarchy = ''
      this.getOrgHierarchy() */
    })
    this.$root.$on('refreshApp', () => {
      this.getTotalLevels()
    })
  },
  name: 'App'
}
</script>
