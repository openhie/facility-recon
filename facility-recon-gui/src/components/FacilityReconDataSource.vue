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
          Are you sure you want to delete {{server.host}}
        </v-card-text>
        <v-card-actions>
          <v-btn color="success" @click="deleteServer">Yes</v-btn>
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
              <v-text-field v-model="server.name" label="Name"></v-text-field>
            </v-flex>
            <v-flex xs1>
              <v-text-field v-model="server.host" label="Host"></v-text-field>
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
            <v-icon left>thumb_up</v-icon>Save
          </v-btn>
          <v-btn color="orange darken-2" @click.native="editDialog = false" style="color: white">
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
        <v-select :items="dataSources" item-text='text' item-value='value' @change="sourceSelected" />
      </v-flex>
      <v-spacer></v-spacer>
    </v-layout>
    <v-layout>
      <v-flex>
        <component :is="selectedComponent" v-if='!syncRunning' />
      </v-flex>
    </v-layout>
    <v-layout row wrap v-if='$store.state.syncServers.length > 0'>
      <v-spacer></v-spacer>
      <v-flex xs6>
        <v-card color="white">
          <v-card-actions>
            <v-btn color="primary" @click="syncServer('update')">
              <v-icon>sync</v-icon>Sync (Update)
            </v-btn>
            <v-btn color="success" @click="syncServer('full')">
              <v-icon>sync</v-icon>Force Full Sync
            </v-btn>
            <v-btn color="success" @click="editServer">
              <v-icon>edit</v-icon>Edit
            </v-btn>
            <v-btn color="error" @click="deleteConfirm = true">
              <v-icon>delete</v-icon>Delete
            </v-btn>
          </v-card-actions>
          <v-card-title primary-title>
            Sync Servers
            <v-spacer></v-spacer>
          </v-card-title>
          <v-card-text>
            <v-data-table :headers="syncServersHeader" :items="$store.state.syncServers" dark class="elevation-1">
              <template slot="items" slot-scope="props">
                <v-radio-group v-model='server' style="height: 5px">
                  <td>
                    <v-radio :value="props.item" color="blue"></v-radio>
                  </td>
                </v-radio-group>
                <td>{{props.item.name}}</td>
                <td>{{props.item.host}}</td>
                <td>{{props.item.username}}</td>
                <td>*****</td>
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
import FacilityReconUpload from './DataSync/FacilityReconUpload'
import FacilityReconDHIS from './DataSync/FacilityReconDHIS'
import axios from 'axios'
import SyncProgress from './DataSync/SyncProgress'
import { syncMixin } from './DataSync/mixins/syncMixin'
const config = require('../../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)
export default {
  mixins: [syncMixin],
  data () {
    return {
      deleteConfirm: false,
      editDialog: false,
      server: {},
      syncServersHeader: [
        { sortable: false },
        { text: 'Server Name', value: 'name' },
        { text: 'Host', value: 'host' },
        { text: 'User Name', value: 'username' },
        { text: 'Password', value: 'password' }
      ],
      selectedComponent: '',
      dataSources: [
        { text: 'Upload', value: 'upload' },
        { text: 'DHIS2', value: 'dhis' },
        { text: 'FHIR Server', value: 'fhir' }
      ]
    }
  },
  methods: {
    sourceSelected (selection) {
      if (selection === 'upload') {
        this.selectedComponent = 'FacilityReconUpload'
      } else if (selection === 'dhis') {
        this.selectedComponent = 'FacilityReconDHIS'
      }
    },
    getServers () {
      axios.get(backendServer + '/getServers/').then((response) => {
        this.$store.state.syncServers = response.data.servers
      }).catch((err) => {
        console.log(err.response.error)
      })
    },
    editServer (server) {
      this.editDialog = true
    },
    saveEdit () {
      let formData = new FormData()
      const clientId = this.$store.state.clientId
      formData.append('host', this.server.host)
      formData.append('username', this.server.username)
      formData.append('password', this.server.password)
      formData.append('name', this.server.name)
      formData.append('id', this.server._id)
      formData.append('clientId', clientId)
      this.editDialog = false
      axios.post(backendServer + '/editServer', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    },
    syncServer (type) {
      this.name = this.server.name
      this.host = this.server.host
      this.username = this.server.username
      this.password = this.server.password
      this.sync(type)
    },
    deleteServer () {
      this.deleteConfirm = false
      axios.get(backendServer + '/deleteServer/' + this.server._id).then((resp) => {
        this.getServers()
      })
    }
  },
  components: {
    'FacilityReconUpload': FacilityReconUpload,
    'FacilityReconDHIS': FacilityReconDHIS,
    'appSyncProgress': SyncProgress
  },
  created () {
    this.getServers()
  }
}
</script>