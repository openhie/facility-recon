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
          <v-btn color="error" @click="deleteConfirm = false">Cancel</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="success" @click="deleteDataSource">Yes</v-btn>
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
          <v-btn color="error" @click.native="editDialog = false" style="color: white">
            <v-icon dark left>cancel</v-icon>Cancel
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" dark @click.native="saveEdit('match')">
            <v-icon left>save</v-icon>Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
          This page let you load data from various sources into the app for reconciliation
          <v-list>1. Select to add remote source if you have a DHIS2 or FHIR server that you want to use its data on this app</v-list>
          <v-list>2. Select Upload CSV if you have a CSV file and want to upload its data on the app</v-list>
          <v-list>3. The system requires CSV data to have atleast 2 levels above facility</v-list>
          <v-list>4. Level 1 is the highest level on the hierarchy i.e Country</v-list>
          <v-list>
            5. Base URL under remote sources section refer to the URL i.e http://localhost:3447/fhir and not http://localhost:3447/fhir/Location.
            Same applies to DHIS2 base URL
          </v-list>
          <v-list>6. Use Force Full Sync to fetch all data from the remote server and update the app</v-list>
          <v-list>8. Use Sync (Update) to pull updated records from the remote server and update the app</v-list>
          <v-list>9. You may proceed to the 'Data Source Pair' page after you have added atleast two data sources</v-list>
          <v-list>10. You may come back to this page and add more sources at any time</v-list>
        </v-card-text>
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
              Remote Sources
            </v-toolbar>
            <v-spacer></v-spacer>
          </v-card-title>
          <v-card-actions>
            <v-btn color="primary" @click="sync('full')" round v-if="remoteServers.length > 0">
              <v-icon left>sync</v-icon>Force Full Sync
            </v-btn>
            <v-btn color="primary" @click="sync('full')" round disabled v-else>
              <v-icon left>sync</v-icon>Force Full Sync
            </v-btn>
            <v-btn color="primary lighten-1" @click="sync('update')" round v-if="remoteServers.length > 0">
              <v-icon left>sync</v-icon>Sync (Update)
            </v-btn>
            <v-btn color="primary lighten-1" @click="sync('update')" round disabled v-else>
              <v-icon left>sync</v-icon>Sync (Update)
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn color="success" @click="editDataSource" round v-if="remoteServers.length > 0">
              <v-icon left>edit</v-icon>Edit
            </v-btn>
            <v-btn color="success" @click="editDataSource" round disabled v-else>
              <v-icon left>edit</v-icon>Edit
            </v-btn>
            <v-btn color="error" @click="validateDelete" round v-if="remoteServers.length > 0">
              <v-icon left>delete</v-icon>Delete
            </v-btn>
            <v-btn color="error" @click="validateDelete" round disabled v-else>
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
                <td v-if="props.item.username">*****</td>
                <td v-else></td>
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
            <v-btn color="error" @click="validateDelete" round v-if="uploadedSources.length > 0">
              <v-icon left>delete</v-icon>Delete
            </v-btn>
            <v-btn color="error" @click="validateDelete" round disabled v-else>
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
const backendServer = process.env.BACKEND_SERVER
export default {
  data () {
    return {
      helpDialog: false,
      deleteConfirm: false,
      editDialog: false,
      server: {},
      syncServersHeader: [
        { sortable: false },
        { text: 'Source Name', value: 'name' },
        { text: 'Base URL', value: 'host' },
        { text: 'Source Type', value: 'sourceType' },
        { text: 'User Name', value: 'username' },
        { text: 'Password', value: 'password' },
        { text: 'Last Sync', value: 'lastsync' }
      ],
      uploadSourcesHeader: [
        { sortable: false },
        { text: 'Source Name',
          align: 'left',
          value: 'name'
        }
      ],
      selectedComponent: '',
      dataSources: [
        { text: 'Upload CSV', value: 'upload' },
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
      formData.append('source', this.server.source)
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
      let userID = this.$store.state.auth.userID
      axios.get(backendServer + '/deleteDataSource/' + this.server._id + '/' + this.server.name + '/' + userID).then((resp) => {
        this.server = {}
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
      formData.append('userID', this.$store.state.auth.userID)
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