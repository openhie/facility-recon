<template>
  <v-container fluid>
    <v-dialog
      v-model="deleteConfirm"
      width="630px"
    >
      <v-card>
        <v-toolbar
          color="error"
          dark
        >
          <v-toolbar-title>
            This will delete the datasource {{server.name}} from the database
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon
            dark
            @click.native="deleteConfirm = false"
          >
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <label v-if='loadingPairs || pairs.length > 0'>
            Below data source pairs (mapping) will also be deleted
            <v-data-table
              :headers="pairsHeaders"
              :items="pairs"
              hide-actions
              :loading="loadingPairs"
            >
              <template
                slot="items"
                slot-scope="props"
              >
                <td>{{ props.item.source1Name }} - {{props.item.source2Name }}</td>
                <td>{{ props.item.owner }}</td>
              </template>
            </v-data-table>
          </label>
          <label v-else>
            There is no any data source pair (mapping) associated with this data source<br>
          </label>
          <br>
          <b>Do you want to proceed and delete?</b>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="error"
            @click="deleteConfirm = false"
          >Cancel</v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="success"
            @click="deleteDataSource"
          >Yes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      persistent
      v-model="editDialog"
      width="530px"
    >
      <v-card width='530px'>
        <v-toolbar
          color="primary"
          dark
        >
          <v-toolbar-title>
            Editing {{server.host}}
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon
            dark
            @click.native="editDialog = false"
          >
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <v-layout column>
            <v-flex xs1>
              <v-text-field
                v-model="server.name"
                label="Name"
                disabled
              ></v-text-field>
            </v-flex>
            <v-flex xs1>
              <v-text-field
                v-model="server.host"
                label="Host"
              ></v-text-field>
            </v-flex>
            <v-flex xs1>
              <v-select
                :items="$store.state.remoteDataSources"
                v-model="server.sourceType"
                label="Source Type"
              ></v-select>
            </v-flex>
            <v-flex xs1>
              <v-text-field
                v-model="server.username"
                label="User Name"
              ></v-text-field>
            </v-flex>
            <v-flex xs1>
              <v-text-field
                v-model="server.password"
                label="Password"
                type="password"
              ></v-text-field>
            </v-flex>
          </v-layout>
        </v-card-text>
        <v-card-actions style='float: center'>
          <v-btn
            color="error"
            @click.native="editDialog = false"
            style="color: white"
          >
            <v-icon
              dark
              left
            >cancel</v-icon>Cancel
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            dark
            @click.native="saveEdit('match')"
          >
            <v-icon left>save</v-icon>Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      persistent
      v-model="shareDialog"
      width="530px"
    >
      <v-card width='530px'>
        <v-toolbar
          color="primary"
          dark
        >
          <v-toolbar-title>
            Sharing {{shareSource.name}}
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon
            dark
            @click.native="shareDialog = false"
          >
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <template v-if="loadingLocationTree">
            <v-progress-linear :indeterminate="true"></v-progress-linear>
          </template>
          <template v-else>
            <v-card-text>
              <p>
                <liquor-tree
                  @node:selected="locationSelected"
                  :data="locationTree"
                  :options="{}"
                  ref="locationTree"
                />
              </p>
            </v-card-text>
          </template>
          <v-icon small>lock</v-icon> Limiting Sharing to: <b>{{limitLocationName}}</b>
          <v-text-field
            v-model="searchUsers"
            append-icon="search"
            label="Search"
            single-line
            hide-details
          ></v-text-field>
          <v-data-table
            :headers="usersHeader"
            :items="users"
            :search="searchUsers"
            class="elevation-1"
            item-key="firstName"
          >
            <template v-slot:items="props">
              <tr v-if="props.item.userName !== $store.state.auth.username">
                <td>
                  <v-checkbox
                    :value="props.item._id"
                    v-model="sharedUsers"
                  >
                  </v-checkbox>
                </td>
                <td>{{props.item.userName}}</td>
                <td>{{props.item.firstName}}</td>
                <td>{{props.item.surname}}</td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions style='float: center'>
          <v-btn
            color="error"
            :disabled='loadingLocationTree'
            @click.native="shareDialog = false"
            style="color: white"
          >
            <v-icon
              dark
              left
            >cancel</v-icon>Cancel
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            :disabled='loadingLocationTree'
            @click.native="share('', 'saveShare')"
          >
            <v-icon left>share</v-icon>Share
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="helpDialog"
      scrollable
      persistent
      :overlay="false"
      max-width="700px"
      transition="dialog-transition"
    >
      <v-card>
        <v-toolbar
          color="primary"
          dark
        >
          <v-toolbar-title>
            <v-icon>info</v-icon> About this page
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon
            dark
            @click.native="helpDialog = false"
          >
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          This page let you visualize various data sets you have added into the app as well as synchronize remote servers with the app
          <v-list>1. Use Force Full Sync to fetch all data from the remote server and update the app</v-list>
          <v-list>2. Use Sync (Update) to pull updated records from the remote server and update the app</v-list>
          <v-list>3. You may proceed to the 'Data Source Pair' page after you have added atleast two data sources</v-list>
          <v-list>4. You may come back to this page and add more sources at any time</v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-layout
      row
      wrap
    >
      <v-spacer></v-spacer>
      <v-flex
        xs1
        text-xs-right
      >
        <v-tooltip top>
          <v-btn
            flat
            icon
            color="primary"
            @click="helpDialog = true"
            slot="activator"
          >
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
    </v-layout>
    <v-layout
      row
      wrap
    >
      <v-spacer></v-spacer>
      <v-flex>
        <v-card color="cyan lighten-5">
          <v-card-title primary-title>
            <v-toolbar
              color="white"
              style="font-weight: bold; font-size: 18px;"
            >
              Remote Sources
            </v-toolbar>
            <v-spacer></v-spacer>
          </v-card-title>
          <v-card-actions>
            <v-btn
              color="primary"
              @click="sync('full')"
              round
              v-if="remoteServers.length > 0"
            >
              <v-icon left>sync</v-icon>Force Full Sync
            </v-btn>
            <v-btn
              color="primary"
              @click="sync('full')"
              round
              disabled
              v-else
            >
              <v-icon left>sync</v-icon>Force Full Sync
            </v-btn>
            <v-btn
              color="primary lighten-1"
              @click="sync('update')"
              round
              v-if="remoteServers.length > 0"
            >
              <v-icon left>sync</v-icon>Sync (Update)
            </v-btn>
            <v-btn
              color="primary lighten-1"
              @click="sync('update')"
              round
              disabled
              v-else
            >
              <v-icon left>sync</v-icon>Sync (Update)
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="success"
              @click="editDataSource"
              round
              v-if="remoteServers.length > 0"
            >
              <v-icon left>edit</v-icon>Edit
            </v-btn>
            <v-btn
              color="success"
              @click="editDataSource"
              round
              disabled
              v-else
            >
              <v-icon left>edit</v-icon>Edit
            </v-btn>
            <v-btn
              color="error"
              @click="validateDelete"
              round
              v-if="remoteServers.length > 0"
            >
              <v-icon left>delete</v-icon>Delete
            </v-btn>
            <v-btn
              color="error"
              @click="validateDelete"
              round
              disabled
              v-else
            >
              <v-icon left>delete</v-icon>Delete
            </v-btn>
          </v-card-actions>
          <v-card-text>
            <v-data-table
              :headers="syncServersHeader"
              :items="remoteServers"
              dark
              class="elevation-1"
              :loading='$store.state.loadingServers'
            >
              <v-progress-linear
                slot="progress"
                color="blue"
                indeterminate
              ></v-progress-linear>
              <template
                slot="items"
                slot-scope="props"
              >
                <v-radio-group
                  v-model='server'
                  style="height: 5px"
                >
                  <td>
                    <v-radio
                      :value="props.item"
                      color="blue"
                    ></v-radio>
                  </td>
                </v-radio-group>
                <td>{{props.item.name}}</td>
                <td>{{props.item.host}}</td>
                <td>{{props.item.sourceType}}</td>
                <td>{{props.item.username}}</td>
                <td v-if="props.item.username">*****</td>
                <td v-else></td>
                <td>{{props.item.lastUpdate}}</td>
                <td>{{props.item.userID.userName}}</td>
                <td>
                  {{props.item.shared.users | mergeUsers}}
                </td>
                <td>
                  {{props.item.createdTime}}
                </td>
                <td v-if='props.item.userID._id === $store.state.auth.userID'>
                  <v-btn
                    color="success"
                    flat
                    @click="share(props.item, 'showDialog')"
                  >
                    <v-icon>share</v-icon> Share
                  </v-btn>
                </td>
              </template>
            </v-data-table>
          </v-card-text>
          <v-card-title primary-title>
            <v-toolbar
              color="white"
              style="font-weight: bold; font-size: 18px;"
            >
              Uploaded Sources
            </v-toolbar>
          </v-card-title>
          <v-card-actions>
            <v-tooltip top>
              <v-btn
                color="success"
                @click="exportCSV"
                round
                v-if="uploadedSources.length > 0"
                slot="activator"
              >
                <v-icon left>file_copy</v-icon>Export
              </v-btn>
              <v-btn
                color="success"
                @click="exportCSV"
                round
                disabled
                v-else
                slot="activator"
              >
                <v-icon left>file_copy</v-icon>Export
              </v-btn>
              <span>Export Original CSV</span>
            </v-tooltip>
            <v-spacer></v-spacer>
            <v-btn
              color="error"
              @click="validateDelete"
              round
              v-if="uploadedSources.length > 0"
            >
              <v-icon left>delete</v-icon>Delete
            </v-btn>
            <v-btn
              color="error"
              @click="validateDelete"
              round
              disabled
              v-else
            >
              <v-icon left>delete</v-icon>Delete
            </v-btn>
          </v-card-actions>
          <v-card-text>
            <v-data-table
              :headers="uploadSourcesHeader"
              :items="uploadedSources"
              dark
              class="elevation-1"
              :loading='$store.state.loadingServers'
            >
              <v-progress-linear
                slot="progress"
                color="blue"
                indeterminate
              ></v-progress-linear>
              <template
                slot="items"
                slot-scope="props"
              >
                <v-radio-group
                  v-model='server'
                  style="height: 5px"
                >
                  <td>
                    <v-radio
                      :value="props.item"
                      color="blue"
                    ></v-radio>
                  </td>
                </v-radio-group>
                <td>{{props.item.name}}</td>
                <td>{{props.item.userID.userName}}</td>
                <td>
                  {{props.item.shared.users | mergeUsers}}
                </td>
                <td>
                  {{props.item.createdTime}}
                </td>
                <td v-if='props.item.userID._id === $store.state.auth.userID'>
                  <v-btn
                    color="success"
                    flat
                    @click="share(props.item, 'showDialog')"
                  >
                    <v-icon>share</v-icon> Share
                  </v-btn>
                </td>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-flex>
      <v-spacer></v-spacer>
    </v-layout>
    <appRemoteSync
      v-if='server.name'
      :syncType="syncType"
      :serverName="server.name"
      :userID="$store.state.auth.userID"
      :sourceOwner="server.userID._id"
      :mode="mode"
    >
    </appRemoteSync>
  </v-container>
</template>

<script>
import FacilityReconUpload from './FacilityReconUpload'
import FacilityReconRemoteSources from './FacilityReconRemoteSources'
import RemoteSync from './RemoteSync'
import { generalMixin } from '../../mixins/generalMixin'
import { eventBus } from '../../main'
import axios from 'axios'
import LiquorTree from 'liquor-tree'
const backendServer = process.env.BACKEND_SERVER
export default {
  mixins: [generalMixin],
  data () {
    return {
      syncType: '',
      mode: '',
      loadingPairs: false,
      pairs: [],
      pairsHeaders: [
        { text: 'Pair Name', value: 'name' },
        { text: 'Owner', value: 'owner' }
      ],
      helpDialog: false,
      deleteConfirm: false,
      editDialog: false,
      server: {
        name: '',
        userID: {}
      },
      shareDialog: false,
      shareSource: {},
      users: [],
      sharedUsers: [],
      limitLocationId: '',
      limitLocationName: 'No limit',
      locationTree: [],
      loadingLocationTree: false,
      searchUsers: '',
      syncServersHeader: [
        { sortable: false },
        { text: 'Source Name', value: 'name' },
        { text: 'Base URL', value: 'host' },
        { text: 'Source Type', value: 'sourceType' },
        { text: 'User Name', value: 'username' },
        { text: 'Password', value: 'password' },
        { text: 'Last Sync', value: 'lastsync' },
        { text: 'Owner', value: 'owner', sortable: false },
        { text: 'Shared To', value: 'shareStatus' },
        { text: 'Created Time', value: 'createdTime' }
      ],
      uploadSourcesHeader: [
        { sortable: false },
        {
          text: 'Source Name',
          align: 'left',
          value: 'name'
        },
        { text: 'Owner', value: 'owner', sortable: false },
        { text: 'Shared To', value: 'shareStatus' },
        { text: 'Created Time', value: 'createdTime' }
      ],
      dataSources: [
        { text: 'Upload CSV', value: 'upload' },
        { text: 'Remote Source', value: 'remote' }
      ],
      usersHeader: [
        { sortable: false },
        { text: 'Username', value: 'userName', sortable: true },
        { text: 'Firstname', value: 'firstName', sortable: true },
        { text: 'Surname', value: 'surname', sortable: true }
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
  filters: {
    mergeUsers (users) {
      if (!users || users.length === 0) {
        return ''
      }
      let userNames = ''
      for (let user of users) {
        if (!userNames) {
          userNames = user.userName
        } else {
          userNames += ', ' + user.userName
        }
      }
      return userNames
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
      if (!this.server.name) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'Please select data source'
        return
      }
      if (this.server.userID._id !== this.$store.state.auth.userID) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'You are not the owner of this data source, ask the owner to edit any details'
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
      formData.append('userID', this.server.userID._id)
      formData.append('name', this.server.name)
      formData.append('id', this.server._id)
      formData.append('clientId', clientId)
      this.editDialog = false
      axios.post(backendServer + '/addDataSource', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        this.server.password = response.data.password
      })
    },
    validateDelete () {
      if (!this.server.name) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'Please select data source'
        return
      }
      if (this.server.userID._id !== this.$store.state.auth.userID && this.$store.state.auth.role !== 'Admin') {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'You are not the owner of this data source, ask the owner to remove you from the share'
        return
      }
      this.getPairsToDelete()
      this.deleteConfirm = true
    },
    deleteDataSource () {
      this.deleteConfirm = false
      let userID = this.$store.state.auth.userID
      let sourceOwner = this.server.userID._id
      axios.get(backendServer + `/deleteDataSource/${this.server._id}/${this.server.name}/${sourceOwner}/${userID}`).then((resp) => {
        this.server = {}
        eventBus.$emit('getDataSources')
      })
    },
    getPairsToDelete () {
      this.loadingPairs = true
      axios.get('/getPairForDatasource/' + this.server._id).then((response) => {
        this.loadingPairs = false
        this.pairs = response.data
      }).catch((error) => {
        if (error.response) {
          console.log(error.response.data)
          console.log(error.response.status)
          console.log(error.response.headers)
        } else if (error.request) {
          console.log(error.request)
        } else {
          console.log('Error', error.message)
        }
        console.log(error.config)
      })
    },
    share (source, action) {
      if (action === 'showDialog') {
        this.limitLocationId = ''
        this.limitLocationName = 'No limit'
        this.sharedUsers = []
        this.shareSource = source
        this.getLocationTree()
        if (source.hasOwnProperty('shared') && source.shared.users.length > 0) {
          source.shared.users.forEach((sharedUsers) => {
            this.sharedUsers.push(sharedUsers._id)
          })
        }
        this.shareDialog = true
      } else if (action === 'saveShare') {
        if (this.sharedUsers.length === 0) {
          this.$store.state.dialogError = true
          this.$store.state.errorTitle = 'Info'
          this.$store.state.errorDescription = 'Please select atleast one user'
          return
        }
        let formData = new FormData()
        formData.append('shareSource', this.shareSource._id)
        formData.append('users', JSON.stringify(this.sharedUsers))
        formData.append('userID', this.$store.state.auth.userID)
        formData.append('role', this.$store.state.auth.role)
        formData.append('orgId', this.$store.state.dhis.user.orgId)
        formData.append('limitLocationId', this.limitLocationId)
        this.$store.state.loadingServers = true
        this.shareDialog = false
        axios.post(backendServer + '/shareDataSource', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }).then((response) => {
          this.$store.state.loadingServers = false
          this.$store.state.dataSources = response.data
        }).catch((err) => {
          console.log(err)
          this.$store.state.loadingServers = false
        })
      }
    },
    locationSelected (node) {
      this.limitLocationId = node.id
      if (node.id !== 'parent') {
        this.limitLocationName = node.data.text
      } else {
        this.limitLocationName = 'No limit'
        this.limitLocationId = ''
      }
    },
    getLocationTree () {
      let userID = this.shareSource.userID._id
      this.loadingLocationTree = true
      let source = this.toTitleCase(this.shareSource.name)
      axios.get(backendServer + '/getTree/' + source + '/' + userID).then((hierarchy) => {
        if (hierarchy.data) {
          this.locationTree = [{
            text: 'Select location to limit sharing',
            id: 'parent',
            children: hierarchy.data
          }]
        }
        this.loadingLocationTree = false
      })
    },
    getUsers () {
      axios.get(backendServer + '/getUsers').then((response) => {
        this.users = response.data
      })
    },
    exportCSV () {
      if (!this.server.name) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'Please select data source'
        return
      }
      let sourceOwner = this.server.userID._id
      axios.get(backendServer + '/getUploadedCSV/' + sourceOwner + '/' + this.server.name).then((resp) => {
        let blob = new Blob([resp.data])
        if (window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveBlob(blob, `${this.server.name}.csv`)
        } else {
          let a = window.document.createElement('a')
          a.href = window.URL.createObjectURL(blob, { type: 'text/plain' })
          a.download = `${this.server.name}.csv`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }
      }).catch((err) => {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        this.$store.state.errorDescription = err.response.data
      })
    },
    sync (mode) {
      if (!this.server.name) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'Please select data source'
        return
      }
      if (this.server.userID._id !== this.$store.state.auth.userID) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'Only data source owner can run the sync'
        return
      }
      if (this.server.source === 'upload') {
        return
      }
      this.mode = mode
      if (this.server.sourceType === 'DHIS2') {
        this.syncType = 'dhisSync'
      } else if (this.server.sourceType === 'FHIR') {
        this.syncType = 'fhirSync'
      }
      setTimeout(() => {
        eventBus.$emit('runRemoteSync')
      }, 100)
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
    'appRemoteSync': RemoteSync,
    'liquor-tree': LiquorTree
  },
  created () {
    this.getUsers()
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
