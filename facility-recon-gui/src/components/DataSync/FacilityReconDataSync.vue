<template>
  <v-container fluid>
    <app-syncProgress :syncProgrIndeter='syncProgrIndeter' :syncStatus='syncStatus' :syncProgrPercent='syncProgrPercent' :syncPercent='syncPercent'>

    </app-syncProgress>
    <v-dialog v-model="deleteConfirm" width="530px">
      <v-card>
        <v-toolbar color="primary" dark>
          <v-toolbar-title>
            Info
          </v-toolbar-title>
        </v-toolbar>
        <v-card-text>
          Are you sure you want to delete {{server.name}} {{server.host}} <br> This will also delete the Database
        </v-card-text>
        <v-card-actions>
          <v-btn color="success" @click="deleteDataSource">Yes</v-btn>
          <v-btn color="error" @click="deleteConfirm = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog persistent v-model="editDialog" width="530px">
      <v-card width='530px'>
        <v-toolbar color="primary" dark>
          <v-toolbar-title>
            Editing {{server.host}}
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon dark @click.native="editDialog = false">
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <v-layout column>
            <v-flex xs1>
              <v-text-field v-model="server.name" label="Name" disabled></v-text-field>
            </v-flex>
            <v-flex xs1>
              <v-text-field v-model="server.host" label="Host"></v-text-field>
            </v-flex>
            <v-flex xs1>
              <v-select
                :items="$store.state.remoteDataSources"
                v-model="server.sourceType"
                label="Source Type"
              ></v-select>
            </v-flex>
            <v-flex xs1>
              <v-text-field v-model="server.username" label="User Name"></v-text-field>
            </v-flex>
            <v-flex xs1>
              <v-text-field v-model="server.password" label="Password" type="password"></v-text-field>
            </v-flex>
          </v-layout>
        </v-card-text>
        <v-card-actions style='float: center'>
          <v-btn color="primary" dark @click.native="saveEdit('match')">
            <v-icon left>save</v-icon>Save
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="error" @click.native="editDialog = false" style="color: white">
            <v-icon dark left>cancel</v-icon>Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-layout row wrap>
      <v-spacer></v-spacer>
      <v-flex xs2>
        <v-subheader>Add Source</v-subheader>
      </v-flex>
      <v-flex xs2>
        <v-select :items="dataSources" v-model="dataSource" item-text='text' item-value='value' @change="sourceSelected" />
      </v-flex>
      <v-spacer></v-spacer>
    </v-layout>
    <v-layout column>
      <v-flex xs6>
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
      </v-flex>
      <v-flex>
        <component :is="selectedComponent" v-if='addDataSource' />
      </v-flex>
    </v-layout>
    <v-layout row wrap>
      <v-spacer></v-spacer>
      <v-flex>
        <v-card color="cyan lighten-5">
          <v-card-title primary-title>
            <v-toolbar color="white" style="font-weight: bold; font-size: 18px;">
              Remote Servers
            </v-toolbar>
            <v-spacer></v-spacer>
          </v-card-title>
          <v-card-actions>
            <v-btn color="primary" @click="sync('full')" round>
              <v-icon left>sync</v-icon>Force Full Sync
            </v-btn>
            <v-btn color="primary lighten-1" @click="sync('update')" round>
              <v-icon left>sync</v-icon>Sync (Update)
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn color="success" @click="editDataSource" round>
              <v-icon left>edit</v-icon>Edit
            </v-btn>
            <v-btn color="error" @click="validateDelete" round>
              <v-icon left>delete</v-icon>Delete
            </v-btn>
          </v-card-actions>
          <v-card-text>
            <v-data-table :headers="syncServersHeader" :items="remoteServers" dark class="elevation-1" :loading='$store.state.loadingServers'>
              <v-progress-linear slot="progress" color="blue" indeterminate></v-progress-linear>
              <template slot="items" slot-scope="props">
                <v-radio-group v-model='server' style="height: 5px">
                  <td>
                    <v-radio :value="props.item" color="blue"></v-radio>
                  </td>
                </v-radio-group>
                <td>{{props.item.name}}</td>
                <td>{{props.item.host}}</td>
                <td>{{props.item.sourceType}}</td>
                <td>{{props.item.username}}</td>
                <td>*****</td>
                <td>{{props.item.lastUpdate}}</td>
              </template>
            </v-data-table>
          </v-card-text>
          <v-card-title primary-title>
            <v-toolbar color="white" style="font-weight: bold; font-size: 18px;">
              Uploaded Sources
            </v-toolbar>
          </v-card-title>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="error" @click="deleteConfirm = true" round>
              <v-icon left>delete</v-icon>Delete
            </v-btn>
          </v-card-actions>
          <v-card-text>
            <v-data-table :headers="uploadSourcesHeader" :items="uploadedSources" dark class="elevation-1" :loading='$store.state.loadingServers'>
              <v-progress-linear slot="progress" color="blue" indeterminate></v-progress-linear>
              <template slot="items" slot-scope="props">
                <v-radio-group v-model='server' style="height: 5px">
                  <td>
                    <v-radio :value="props.item" color="blue"></v-radio>
                  </td>
                </v-radio-group>
                <td>{{props.item.name}}</td>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-flex>
      <v-spacer></v-spacer>
    </v-layout>
  </v-container>
</template>

<script>
import FacilityReconUpload from './FacilityReconUpload'
import FacilityReconRemoteSources from './FacilityReconRemoteSources'
import SyncProgress from './SyncProgress'
import { eventBus } from '../../main'
import axios from 'axios'
const config = require('../../../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)
export default {
  data () {
    return {
      deleteConfirm: false,
      editDialog: false,
      server: {},
      syncServersHeader: [
        { sortable: false },
        { text: 'Server Name', value: 'name' },
        { text: 'Host', value: 'host' },
        { text: 'Source Type', value: 'sourceType' },
        { text: 'User Name', value: 'username' },
        { text: 'Password', value: 'password' },
        { text: 'Last Sync', value: 'lastsync' }
      ],
      uploadSourcesHeader: [
        { sortable: false },
        { text: 'CSV Name', value: 'name' }
      ],
      selectedComponent: '',
      dataSources: [
        { text: 'Upload', value: 'upload' },
        { text: 'Remote Source', value: 'remote' }
      ],
      dataSource: '',
      addDataSource: true,
      syncProgrIndeter: false,
      syncProgrPercent: false,
      syncStatus: 'Waiting for sync status',
      syncPercent: null,
      syncProgressTimer: '',
      syncRunning: false,
      alertSuccess: false,
      alertError: false,
      alertMsg: ''
    }
  },
  methods: {
    sourceSelected (selection) {
      this.addDataSource = true
      if (selection === 'upload') {
        this.selectedComponent = 'FacilityReconUpload'
      } else if (selection === 'remote') {
        this.selectedComponent = 'FacilityReconRemoteSources'
      }
    },
    editDataSource (server) {
      if (Object.keys(this.server).length === 0) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'Please select data source'
        return
      }
      if (this.server.source === 'upload') {
        return
      }
      this.editDialog = true
    },
    saveEdit () {
      let formData = new FormData()
      const clientId = this.$store.state.clientId
      formData.append('host', this.server.host)
      formData.append('sourceType', this.server.sourceType)
      formData.append('username', this.server.username)
      formData.append('password', this.server.password)
      formData.append('name', this.server.name)
      formData.append('id', this.server._id)
      formData.append('clientId', clientId)
      this.editDialog = false
      axios.post(backendServer + '/editDataSource', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        this.server.password = response.data.password
      })
    },
    validateDelete () {
      if (Object.keys(this.server).length === 0) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'Please select data source'
        return
      }
      this.deleteConfirm = true
    },
    deleteDataSource () {
      this.deleteConfirm = false
      axios.get(backendServer + '/deleteDataSource/' + this.server._id + '/' + this.server.name).then((resp) => {
        eventBus.$emit('getDataSources')
      })
    },
    sync (mode) {
      if (Object.keys(this.server).length === 0) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'Please select data source'
        return
      }
      if (this.server.source === 'upload') {
        return
      }
      if (!mode) {
        mode = 'full'
      }
      let syncType
      if (this.server.sourceType === 'DHIS2') {
        syncType = 'dhisSync'
      } else if (this.server.sourceType === 'FHIR') {
        syncType = 'fhirSync'
      }
      let formData = new FormData()
      const clientId = this.$store.state.clientId
      formData.append('host', this.server.host)
      formData.append('username', this.server.username)
      formData.append('password', this.server.password)
      formData.append('name', this.server.name)
      formData.append('clientId', clientId)
      formData.append('mode', mode)
      this.syncRunning = true
      this.syncProgrIndeter = true
      axios.post(backendServer + '/' + syncType + '/', formData, {
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
      let syncProgressType
      if (this.server.sourceType === 'DHIS2') {
        syncProgressType = 'dhisSyncRequest'
      } else if (this.server.sourceType === 'FHIR') {
        syncProgressType = 'fhirSyncRequest'
      }
      axios.get(backendServer + '/progress/' + syncProgressType + '/' + clientId).then((syncProgress) => {
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
          this.syncStatus = 'Waiting for sync status'
          clearInterval(this.syncProgressTimer)
          this.syncProgrPercent = false
          this.$store.state.uploadRunning = false
          eventBus.$emit('getDataSources')
        }
      }).catch((err) => {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        console.log(err.response.data.error + '. cross check host,user and password')
        this.$store.state.errorDescription = err.response.data.error + '. cross check host,user and password'
        clearInterval(this.syncProgressTimer)
      })
    }
  },
  computed: {
    remoteServers () {
      let servers = []
      for (let sources of this.$store.state.dataSources) {
        if (sources.source === 'syncServer') {
          servers.push(sources)
        }
      }
      return servers
    },
    uploadedSources () {
      let upload = []
      for (let sources of this.$store.state.dataSources) {
        if (sources.source === 'upload') {
          upload.push(sources)
        }
      }
      return upload
    }
  },
  components: {
    'FacilityReconUpload': FacilityReconUpload,
    'FacilityReconRemoteSources': FacilityReconRemoteSources,
    'appSyncProgress': SyncProgress
  },
  created () {
    if (this.$store.state.dataSources.length === 0) {
      eventBus.$emit('getDataSources')
    }
    eventBus.$on('dataSourceSaved', () => {
      this.addDataSource = false
      this.dataSource = ''
    })
    eventBus.$on('dataSourceAddedSuccessfully', () => {
      this.alertSuccess = true
      this.alertMsg = 'Data Source Added Successfully'
      setTimeout(() => {
        this.alertSuccess = false
      }, 3000)
    })
    eventBus.$on('remoteServerFailedAdd', () => {
      this.alertError = true
      this.alertMsg = 'Data Source Failed To Be Added'
    })
  }
}
</script>