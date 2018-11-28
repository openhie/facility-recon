<template>
  <v-container fluid>
    <center>
      <v-alert
        style="width: 500px"
        v-model="alertSuccess"
        type="success"
        dismissible
        transition="scale-transition"
      >
        {{alertMsg}}
      </v-alert>
      <v-alert
        style="width: 500px"
        v-model="alertError"
        type="error"
        dismissible
        transition="scale-transition"
      >
        {{alertMsg}}
      </v-alert>
      <v-dialog
        v-model="helpDialog"
        scrollable 
        persistent :overlay="false"
        max-width="700px"
        transition="dialog-transition"
      >
        <v-card>
          <v-toolbar color="primary" dark>
            <v-toolbar-title>
              <v-icon>info</v-icon> About this page
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon dark @click.native="helpDialog = false">
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-text>
            This page let you choose a pair of data sources to use for reconciliation
            <v-list>1. Source 1 is the source while source 2 is the target</v-list>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-layout column>
        <v-flex xs1 text-xs-right>
          <v-tooltip top>
            <v-btn flat icon color="primary" @click="helpDialog = true" slot="activator">
              <v-icon>help</v-icon>
            </v-btn>
            <span>Help</span>
          </v-tooltip>
        </v-flex>
      </v-layout>
      <v-card style="width: 1000px" color='cyan lighten-5'>
        <v-card-title primary-title>
          <v-toolbar color="white lighten-2" style="font-weight: bold; font-size: 18px;">
            Choose Data Source Pair
          </v-toolbar>
        </v-card-title>
        <v-card-text style="float: center">
          <v-layout row wrap style="float: center">
            <v-flex xs6>
              <v-data-table
                :headers="source1Headers"
                :items="$store.state.dataSources"
                :loading="$store.state.loadingServers"
                dark
              >
                <v-progress-linear slot="progress" color="blue" indeterminate></v-progress-linear>
                <template slot="items" slot-scope="props">
                  <v-radio-group v-model='source1' style="height: 5px">
                    <td>
                      <v-radio :value="props.item" color="blue"></v-radio>
                    </td>
                  </v-radio-group>
                  <td>{{props.item.name}}</td>
                </template>
              </v-data-table>
            </v-flex>
            <v-flex xs6>
              <v-data-table
                :headers="source2Headers"
                :items="$store.state.dataSources"
                item-key="id"
                :loading="$store.state.loadingServers"
              >
                <v-progress-linear slot="progress" color="blue" indeterminate></v-progress-linear>
                <template slot="items" slot-scope="props">
                  <v-radio-group v-model='source2' style="height: 5px">
                    <td>
                      <v-radio :value="props.item" color="blue"></v-radio>
                    </td>
                  </v-radio-group>
                  <td>{{props.item.name}}</td>
                </template>
              </v-data-table>
            </v-flex>
          </v-layout>
        </v-card-text>
        <v-card-actions>
          <v-btn color="error" round @click="reset"><v-icon left>refresh</v-icon> Reset</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" round @click="save"><v-icon left>save</v-icon> Save</v-btn>
        </v-card-actions>
      </v-card>
    </center>
  </v-container>
</template>
<script>
import axios from 'axios'
import { eventBus } from '../../main'
const backendServer = process.env.BACKEND_SERVER
export default {
  data () {
    return {
      helpDialog: false,
      alertSuccess: false,
      alertError: false,
      alertMsg: '',
      source1: {},
      source2: {},
      source1Headers: [
        { sortable: false },
        { text: 'Source 1', value: 'headerSource1', sortable: false }
      ],
      source2Headers: [
        { sortable: false },
        { text: 'Source 2', value: 'headerSource2', sortable: false }
      ]
    }
  },
  methods: {
    reset () {
      this.source1 = {}
      this.source2 = {}
      this.$store.state.dynamicProgress = true
      this.$store.state.progressTitle = 'Reseting Data Source Pairs'
      let userID = this.$store.state.auth.userID
      axios.get(backendServer + '/resetDataSourcePair/' + userID).then((response) => {
        eventBus.$emit('getDataSourcePair')
        this.$store.state.dynamicProgress = false
        this.alertSuccess = true
        this.alertMsg = 'Data Source Pair Reseted Successfully'
      }).catch((error) => {
        this.alertError = true
        this.alertMsg = 'Something went wrong while reseting data source pairs'
        console.log(error)
      })
    },
    save () {
      if (Object.keys(this.source1).length === 0 || Object.keys(this.source2).length === 0) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'Please select data source'
        return
      }
      if (this.source1.name === this.source2.name && this.source1.source === this.source2.source) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        this.$store.state.errorDescription = 'Data source pair of the same data source is not allowed, change one of the source'
        return
      }
      this.$store.state.dynamicProgress = true
      this.$store.state.progressTitle = 'Saving Data Sources'
      let formData = new FormData()
      formData.append('source1', JSON.stringify(this.source1))
      formData.append('source2', JSON.stringify(this.source2))
      formData.append('userID', this.$store.state.auth.userID)
      axios.post(backendServer + '/addDataSourcePair', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        eventBus.$emit('getDataSourcePair')
        this.alertSuccess = true
        this.alertMsg = 'Data Source Pair Saved Successfully'
        this.$store.state.dynamicProgress = false
      }).catch((error) => {
        this.alertError = true
        this.alertMsg = 'Something went wrong while saving data source pairs'
        this.$store.state.dynamicProgress = false
        console.log(error)
      })
    }
  },
  created () {
    this.source1 = this.$store.state.dataSources.find((dataSource) => {
      return dataSource._id === this.$store.state.dataSourcePair.source1.id
    })
    this.source2 = this.$store.state.dataSources.find((dataSource) => {
      return dataSource._id === this.$store.state.dataSourcePair.source2.id
    })
    if (!this.source1) {
      this.source1 = {}
    }
    if (!this.source2) {
      this.source2 = {}
    }
    if (this.$store.state.dataSources.length === 0) {
      eventBus.$emit('getDataSources')
    }
  }
}
</script>
