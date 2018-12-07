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
      <v-dialog persistent v-model="shareDialog" width="530px">
        <v-card width='530px'>
          <v-toolbar color="primary" dark>
            <v-toolbar-title>
              Sharing <template v-if="sharePair.hasOwnProperty('source1')">{{sharePair.source1.name}} - {{sharePair.source2.name}}</template>
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon dark @click.native="shareDialog = false">
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-text>
            <v-text-field v-model="searchUsers" append-icon="search" label="Search" single-line hide-details></v-text-field>
            <v-data-table :headers="usersHeader" :items="users" :search="searchUsers" class="elevation-1">
              <template slot="items" slot-scope="props">
                <tr v-if="props.item.userName !== $store.state.auth.username">
                  <td><v-checkbox v-model="sharedUsers" :value="props.item._id"></v-checkbox>
                  <td>{{props.item.userName}}</td>
                  <td>{{props.item.firstName}}</td>
                  <td>{{props.item.surname}}</td>
                </tr>
              </template>
            </v-data-table>
          </v-card-text>
          <v-card-actions style='float: center'>
            <v-btn color="error" @click.native="shareDialog = false" style="color: white">
              <v-icon dark left>cancel</v-icon>Cancel
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn color="primary" dark @click.native="share('', 'saveShare')">
              <v-icon left>share</v-icon>Share
            </v-btn>
          </v-card-actions>
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
      <v-layout column>
        <v-flex>
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
              <v-btn color="primary" round @click="createPair"><v-icon left>save</v-icon> Save</v-btn>
            </v-card-actions>
          </v-card>
        </v-flex>
        <v-flex>
          <v-card style="width: 1000px" color='cyan lighten-4'>
            <v-card-title primary-title>
              <v-toolbar color="white lighten-2" style="font-weight: bold; font-size: 18px;">
                Existing Data Source Pairs 
                <v-spacer></v-spacer><v-text-field v-model="searchPairs" append-icon="search" label="Search" single-line hide-details></v-text-field>
              </v-toolbar>
            </v-card-title>
            <v-card-text style="float: center">
              <v-data-table
                :headers="sourcePairHeaders"
                :items="$store.state.dataSourcePairs"
                :search="searchPairs"
                :loading="$store.state.loadingServers"
              >
                <v-progress-linear slot="progress" color="blue" indeterminate></v-progress-linear>
                <template slot="items" slot-scope="props">
                  <td>{{props.item.source1.name}} - {{props.item.source2.name}}</td>
                  <td>{{props.item.userID.userName}}</td>
                  <v-radio-group v-model='activeDataSourcePair' style="height: 5px">
                    <td>
                      <v-radio :value="props.item" color="blue"></v-radio>
                    </td>
                  </v-radio-group>
                  <td>
                    <template v-for="sharedUsers in props.item.shared.users">
                    {{sharedUsers.userName}}, 
                    </template>
                  </td>
                  <td v-if='props.item.userID._id === $store.state.auth.userID'>
                    <v-btn flat icon color="primary" @click="share(props.item, 'showDialog')">
                      <v-icon left>share</v-icon>Share
                    </v-btn>
                  </td>
                </template>
              </v-data-table>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="primary" round @click="activatePair"><v-icon left>save</v-icon>Activate Pair</v-btn>
            </v-card-actions>
          </v-card>
        </v-flex>
      </v-layout>
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
      shareDialog: false,
      sharePair: {},
      source1: {},
      source2: {},
      searchPairs: '',
      searchSources: '',
      searchUsers: '',
      users: [],
      sharedUsers: [],
      activeDataSourcePair: {},
      source1Headers: [
        { sortable: false },
        { text: 'Source 1', value: 'headerSource1', sortable: false }
      ],
      source2Headers: [
        { sortable: false },
        { text: 'Source 2', value: 'headerSource2', sortable: false }
      ],
      sourcePairHeaders: [
        { text: 'Pair', value: 'pair' },
        { text: 'Owner', value: 'owner', sortable: false },
        { text: 'Active', value: 'active' },
        { text: 'Share Status', value: 'shareStatus' }
      ],
      usersHeader: [
        { text: 'Username', value: 'username', sortable: true },
        { text: 'Firstname', value: 'fname', sortable: true },
        { text: 'Surname', value: 'sname', sortable: true }
      ]
    }
  },
  methods: {
    reset () {
      this.source1 = {}
      this.source2 = {}
      this.activeDataSourcePair = {}
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
    createPair () {
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
        this.alertSuccess = true
        this.alertMsg = 'Data Source Pair Activated Successfully'
        this.$store.state.dynamicProgress = false
      }).catch((error) => {
        this.alertError = true
        this.alertMsg = 'Something went wrong while activating data source pair'
        this.$store.state.dynamicProgress = false
        console.log(error)
      })
    },
    activatePair () {
      this.source1 = this.$store.state.dataSources.find((dataSource) => {
        return dataSource._id === this.activeDataSourcePair.source1._id
      })
      this.source2 = this.$store.state.dataSources.find((dataSource) => {
        return dataSource._id === this.activeDataSourcePair.source2._id
      })
      // in case this dataset is a shared dataset
      if (!this.source1 || !this.source2) {
        this.activateSharedPair(this.activeDataSourcePair._id)
      } else {
        this.createPair()
      }
    },
    share (pair, action) {
      if (action === 'showDialog') {
        this.sharedUsers = []
        this.sharePair = pair
        if (pair.hasOwnProperty('shared') && pair.shared.users.length > 0) {
          pair.shared.users.forEach((sharedUsers) => {
            this.sharedUsers.push(sharedUsers._id)
          })
        }
        this.shareDialog = true
      } else if (action === 'saveShare') {
        let formData = new FormData()
        formData.append('sharePair', this.sharePair._id)
        formData.append('users', JSON.stringify(this.sharedUsers))
        formData.append('userID', this.$store.state.auth.userID)
        this.$store.state.loadingServers = true
        this.shareDialog = false
        axios.post(backendServer + '/shareSourcePair', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }).then((response) => {
          this.$store.state.loadingServers = false
          this.$store.state.dataSourcePairs = response.data
        }).catch((err) => {
          console.log(err)
          this.$store.state.loadingServers = false
        })
      }
    },
    getUsers () {
      axios.get(backendServer + '/getUsers').then((response) => {
        this.users = response.data
      })
    },
    getActivePair () {
      let shared
      this.activeDataSourcePair = {}
      this.$store.state.dataSourcePairs.forEach((pair) => {
        if (pair.userID._id === this.$store.state.auth.userID && pair.status === 'active') {
          this.activeDataSourcePair = pair
        }
        if (Object.keys(this.activeDataSourcePair).length > 0) {
          shared = undefined
          return
        }
        if (pair.userID._id !== this.$store.state.auth.userID && pair.status === 'active') {
          shared = pair
        }
      })
      if (shared) {
        this.activeDataSourcePair = shared
      }
    }
  },
  created () {
    this.getUsers()
    this.source1 = this.$store.state.dataSources.find((dataSource) => {
      return dataSource._id === this.$store.state.activePair.source1.id
    })
    this.source2 = this.$store.state.dataSources.find((dataSource) => {
      return dataSource._id === this.$store.state.activePair.source2.id
    })
    this.getActivePair()
    if (!this.source1) {
      this.source1 = {}
    }
    if (!this.source2) {
      this.source2 = {}
    }
  }
}
</script>
