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
      <v-card style="width: 1000px" color='blue lighten-3'>
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
const config = require('../../../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)
export default {
  data () {
    return {
      alertSuccess: false,
      alertError: false,
      alertMsg: '',
      source1: {},
      source2: {},
      source1Headers: [
        { sortable: false },
        { text: 'Source 1', value: 'source1', sortable: false }
      ],
      source2Headers: [
        { sortable: false },
        { text: 'Source 2', value: 'source2', sortable: false }
      ]
    }
  },
  methods: {
    reset () {
      this.source1 = {}
      this.source2 = {}
      this.$store.state.dynamicProgress = true
      this.$store.state.progressTitle = 'Reseting Data Source Pairs'
      axios.get(backendServer + '/resetDataSourcePair').then((response) => {
        this.$store.state.dataSourcePair.source1 = {}
        this.$store.state.dataSourcePair.source2 = {}
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
      this.$store.state.dynamicProgress = true
      this.$store.state.progressTitle = 'Saving Data Sources'
      let formData = new FormData()
      formData.append('source1', JSON.stringify(this.source1))
      formData.append('source2', JSON.stringify(this.source2))
      axios.post(backendServer + '/addDataSource', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        this.$store.state.dataSourcePair.source1.name = this.source1.name
        this.$store.state.dataSourcePair.source1.id = this.source1._id
        this.$store.state.dataSourcePair.source2.name = this.source2.name
        this.$store.state.dataSourcePair.source2.id = this.source2._id
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
    if (this.$store.state.dataSources.length === 0) {
      eventBus.$emit('getDataSources')
    }
  }
}
</script>
