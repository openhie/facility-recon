<template>
  <v-container fluid>
    <center>
      <v-dialog
        persistent
        v-model="confirmPairDeleteDialog"
        max-width="500px"
      >
        <v-card>
          <v-toolbar
            color="error"
            dark
          >
            <v-toolbar-title>
              Confirm deleting
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn
              icon
              dark
              @click.native="confirmPairDeleteDialog = false"
            >
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-text>
            Are you sure you want to delete this data source pair
          </v-card-text>
          <v-card-actions>
            <v-btn
              color="primary"
              @click.native="confirmPairDeleteDialog = false"
            >Cancel</v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="error"
              @click.native="deletePair"
            >Ok</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-alert
        style="width: 1000px"
        v-model="alertSuccess"
        type="success"
        dismissible
        transition="scale-transition"
      >
        {{alertMsg}}
      </v-alert>
      <v-alert
        style="width: 1000px"
        v-model="alertError"
        type="error"
        dismissible
        transition="scale-transition"
      >
        {{alertMsg}}
      </v-alert>
      <v-dialog
        v-model="pairLimitWarn"
        scrollable
        persistent
        :overlay="false"
        max-width="770px"
        transition="dialog-transition"
      >
        <v-card>
          <v-toolbar
            color="error"
            dark
          >
            <v-toolbar-title>
              <v-icon>info</v-icon> Pair creation limit
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn
              icon
              dark
              @click.native="pairLimitWarn = false"
            >
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-text>
            You cant create more pairs as this account is limited to one pair only at a time.
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              @click.native="pairLimitWarn = false"
            >Ok</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="mapSourcePairLevels"
        scrollable
        persistent
        :overlay="false"
        max-width="770px"
        transition="dialog-transition"
      >
        <v-card>
          <v-toolbar
            color="primary"
            dark
          >
            <v-toolbar-title>
              <v-icon>info</v-icon> Data sources has different level counts, please map Levels to proceed
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn
              icon
              dark
              @click.native="closeLevelMappingDialog"
            >
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-text>
            <v-data-table
              :headers="pairLevelsMappingHeader"
              :items="source1Levels"
            >
              <template
                slot="items"
                slot-scope="props"
              >
                <tr>
                  <td>{{props.item.text}}</td>
                  <td>
                    <template v-if='pairLevelsMapping[props.item.value]'>
                      {{$store.state.levelMapping.source2[pairLevelsMapping[props.item.value]]}}
                      <v-icon
                        small
                        @click="clearMappingSelection(props.item.value)"
                      >close</v-icon>
                    </template>
                    <v-select
                      v-else
                      :items="source2Levels"
                      clearable
                      v-model="pairLevelsMapping[props.item.value]"
                      @change="mappingSelected(props.item.value)"
                    ></v-select>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </v-card-text>
          <v-card-actions>
            <v-btn
              color="error"
              round
              @click="closeLevelMappingDialog"
            >
              <v-icon left>cancel</v-icon> Cancel
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              round
            >
              <v-icon left>save</v-icon>Save Mapping
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
            This page let you choose a pair of data sources to use for reconciliation
            <v-list>1. Source 1 is the source while source 2 is the target</v-list>
          </v-card-text>
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
              Sharing <template v-if="sharePair.hasOwnProperty('source1')">{{sharePair.source1.name}} - {{sharePair.source2.name}}</template>
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
            >
              <template
                slot="items"
                slot-scope="props"
              >
                <tr v-if="props.item.userName !== $store.state.auth.username">
                  <td>
                    <v-checkbox
                      v-model="sharedUsers"
                      :value="props.item._id"
                    ></v-checkbox>
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
              dark
              @click.native="share('', 'saveShare')"
            >
              <v-icon left>share</v-icon>Share
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-layout row>
        <v-flex xs11>
          Create/Choose a pair of data sources to use for reconciliation. Source 1 is the source while source 2 is the target
        </v-flex>
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
        <v-flex>
          <v-card
            style="width: 1000px"
            color='cyan lighten-5'
          >
            <v-card-title primary-title>
              <v-toolbar
                color="white lighten-2"
                style="font-weight: bold; font-size: 18px;"
              >
                Choose Data Source Pair
              </v-toolbar>
            </v-card-title>
            <v-card-text style="float: center">
              <v-layout
                row
                wrap
                style="float: center"
              >
                <v-flex xs6>
                  <v-data-table
                    :headers="source1Headers"
                    :items="$store.state.dataSources"
                    :loading="$store.state.loadingServers"
                    dark
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
                        v-model='source1'
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
                    </template>
                  </v-data-table>
                </v-flex>
                <v-flex xs6>
                  <v-data-table
                    :headers="source2Headers"
                    :items="dataSources2"
                    item-key="id"
                    :loading="$store.state.loadingServers"
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
                        v-model='source2'
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
                    </template>
                  </v-data-table>
                </v-flex>
              </v-layout>
            </v-card-text>
            <v-card-actions>
              <v-btn
                color="error"
                round
                @click="reset"
              >
                <v-icon left>refresh</v-icon> Reset
              </v-btn>
              <v-spacer></v-spacer>
              <v-btn
                :disabled='!canCreatePair'
                color="primary"
                round
                @click="checkLevels"
              >
                <v-icon left>save</v-icon> Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-flex>
        <v-flex>
          <v-card
            style="width: 1000px"
            color='cyan lighten-4'
          >
            <v-card-title primary-title>
              <v-toolbar
                color="white lighten-2"
                style="font-weight: bold; font-size: 18px;"
              >
                Existing Data Source Pairs
                <v-spacer></v-spacer>
                <v-text-field
                  v-model="searchPairs"
                  append-icon="search"
                  label="Search"
                  single-line
                  hide-details
                ></v-text-field>
              </v-toolbar>
            </v-card-title>
            <v-card-text style="float: center">
              <v-data-table
                :headers="sourcePairHeaders"
                :items="$store.state.dataSourcePairs"
                :search="searchPairs"
                :loading="$store.state.loadingServers"
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
                  <td>{{props.item.source1.name}} - {{props.item.source2.name}}</td>
                  <td>{{props.item.userID.userName}}</td>
                  <v-radio-group
                    v-model='activeDataSourcePair'
                    style="height: 5px"
                  >
                    <td>
                      <v-radio
                        :value="props.item"
                        color="blue"
                      ></v-radio>
                    </td>
                  </v-radio-group>
                  <td>
                    {{props.item.shared.users | mergeUsers}}
                  </td>
                  <td v-if='props.item.userID._id === $store.state.auth.userID'>
                    <v-btn
                      flat
                      color="primary"
                      @click="share(props.item, 'showDialog')"
                    >
                      <v-icon>share</v-icon>Share
                    </v-btn>
                  </td>
                </template>
              </v-data-table>
            </v-card-text>
            <v-card-actions>
              <v-btn
                :disabled="!canDeletePair"
                color="error"
                round
                @click="confirmDeletePair"
              >
                <v-icon left>delete</v-icon>Delete Pair
              </v-btn>
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                round
                @click="activatePair"
              >
                <v-icon left>save</v-icon>Activate Pair
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-flex>
      </v-layout>
    </center>
  </v-container>
</template>
<script>
import axios from 'axios'
import { eventBus } from '@/main'
import { generalMixin } from '@/mixins/generalMixin'
import { dataSourcePairMixin } from './dataSourcePairMixin'
const backendServer = process.env.BACKEND_SERVER
export default {
  mixins: [generalMixin, dataSourcePairMixin],
  data () {
    return {
      confirmPairDeleteDialog: false,
      helpDialog: false,
      alertSuccess: false,
      alertError: false,
      alertMsg: '',
      pairLimitWarn: false,
      shareDialog: false,
      mapSourcePairLevels: false,
      pairLevelsMapping: {},
      sharePair: {},
      source1: {},
      source2: {},
      searchPairs: '',
      searchSources: '',
      searchUsers: '',
      users: [],
      sharedUsers: [],
      activeDataSourcePair: {},
      pairLevelsMappingHeader: [
        { text: 'Source 1 Levels', value: 'headerSource1Levels', sortable: false },
        { text: 'Source 2 Levels', value: 'headerSource1Levels', sortable: false }
      ],
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
        { text: 'Shared To', value: 'shareStatus' }
      ],
      usersHeader: [
        { text: 'Username', value: 'username', sortable: true },
        { text: 'Firstname', value: 'fname', sortable: true },
        { text: 'Surname', value: 'sname', sortable: true }
      ],
      source1Levels: [],
      source2Levels: []
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
          userNames = ',' + user.userName
        }
      }
      return userNames
    }
  },
  methods: {
    confirmDeletePair () {
      this.confirmPairDeleteDialog = true
    },
    deletePair () {
      this.confirmPairDeleteDialog = false
      let query = `pairId=${this.activeDataSourcePair._id}&userID=${this.activeDataSourcePair.owner.id}&source1Name=${this.activeDataSourcePair.source1.name}&source2Name=${this.activeDataSourcePair.source2.name}`
      axios.delete(backendServer + '/deleteSourcePair?' + query).then((resp) => {
        this.$store.state.errorTitle = 'Pair Deletion'
        this.$store.state.errorDescription = 'Pair deleted successfully'
        this.$store.state.dialogError = true
        setTimeout(() => {
          eventBus.$emit('getDataSourcePair')
        }, 500)
      }).catch((err) => {
        this.$store.state.errorTitle = 'Pair Deletion'
        this.$store.state.errorDescription = 'An error occured while deleting pair, please retry'
        this.$store.state.errorColor = 'error'
        this.$store.state.dialogError = true
        console.log(JSON.stringify(err))
      })
    },
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
    checkLevels () {
      this.pairLevelsMapping = {}
      let source1 = this.source1.name
      let source2 = this.source2.name
      source1 = this.toTitleCase(source1)
      source2 = this.toTitleCase(source2)
      let sourcesLimitOrgId = JSON.stringify({
        source1LimitOrgId: this.getLimitOrgIdOnDataSource(this.source1),
        source2LimitOrgId: this.getLimitOrgIdOnDataSource(this.source2)
      })
      let sourcesOwner = JSON.stringify({
        source1Owner: this.source1.userID._id,
        source2Owner: this.source2.userID._id
      })
      axios
        .get(backendServer + '/countLevels/' + source1 + '/' + source2 + '/' + sourcesOwner + '/' + sourcesLimitOrgId)
        .then(levels => {
          if (levels.data.totalSource1Levels === 1) {
            this.$store.state.errorTitle = 'No data for you'
            this.$store.state.errorDescription = 'Cant create this pair, ' + this.source1.name + ' has no data for you'
            this.$store.state.dialogError = true
            return
          }
          if (levels.data.totalSource2Levels === 1) {
            this.$store.state.errorTitle = 'No data for you'
            this.$store.state.errorDescription = 'Cant create this pair, ' + this.source2.name + ' has no data for you'
            this.$store.state.dialogError = true
            return
          }
          if (levels.data.totalSource1Levels > levels.data.totalSource2Levels) {
            this.$store.state.errorTitle = 'Levels mismatch'
            this.$store.state.errorDescription = 'Make sure source1 has the same or less levels as source2'
            this.$store.state.dialogError = true
          } else {
            this.createDatasourcePair(this.source1, this.source2)
          }
        })
    },
    mappingSelected (selectedLevel) {
      this.source2Levels = this.source2Levels.filter((src2Lvl) => {
        return src2Lvl.value !== this.pairLevelsMapping[selectedLevel]
      })
    },
    clearMappingSelection (selectedLevel) {
      this.source2Levels.push({
        text: this.$store.state.levelMapping.source2[this.pairLevelsMapping[selectedLevel]],
        value: this.pairLevelsMapping[selectedLevel]
      })
      let keys = Object.keys(this.pairLevelsMapping)
      let newKeys = keys.filter((key) => {
        return key !== selectedLevel
      })
      let newObj = {}
      for (let key of newKeys) {
        newObj[key] = this.pairLevelsMapping[key]
      }
      this.pairLevelsMapping = newObj
    },
    closeLevelMappingDialog () {
      for (let key in this.pairLevelsMapping) {
        this.source2Levels.push({
          text: this.$store.state.levelMapping.source2[this.pairLevelsMapping[key]],
          value: this.pairLevelsMapping[key]
        })
      }
      this.mapSourcePairLevels = false
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
        if (this.sharedUsers.length === 0) {
          this.$store.state.dialogError = true
          this.$store.state.errorTitle = 'Info'
          this.$store.state.errorDescription = 'Please select atleast one user'
          return
        }
        let formData = new FormData()
        formData.append('sharePair', this.sharePair._id)
        formData.append('users', JSON.stringify(this.sharedUsers))
        formData.append('userID', this.$store.state.auth.userID)
        formData.append('orgId', this.$store.state.dhis.user.orgId)
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
    }
  },
  computed: {
    dataSources2 () {
      if (!this.$store.state.config.generalConfig.reconciliation.fixSource2) {
        return this.$store.state.dataSources
      } else {
        let dtSrc = ''
        for (let source of this.$store.state.dataSources) {
          if (
            source._id ===
            this.$store.state.config.generalConfig.reconciliation.fixSource2To
          ) {
            dtSrc = source
          }
        }
        return [dtSrc]
      }
    },
    canCreatePair () {
      if (this.$store.state.dhis.user.orgId && this.$store.state.config.generalConfig.reconciliation.singlePair) {
        if (this.$store.state.dataSourcePairs.length === 0) {
          return true
        } else {
          return false
        }
      } else {
        return true
      }
    },
    canDeletePair () {
      if (JSON.stringify(this.activeDataSourcePair) === '{}') {
        return false
      }
      if (this.activeDataSourcePair.owner.id === this.$store.state.auth.userID) {
        return true
      } else {
        return false
      }
    }
  },
  created () {
    if (!this.canCreatePair) {
      this.pairLimitWarn = true
    }
    this.getUsers()
    this.source1 = this.$store.state.dataSources.find((dataSource) => {
      return dataSource._id === this.$store.state.activePair.source1.id
    })
    this.source2 = this.$store.state.dataSources.find((dataSource) => {
      return dataSource._id === this.$store.state.activePair.source2.id
    })
    this.activeDataSourcePair = this.getActiveDataSourcePair()
    if (!this.source1) {
      this.source1 = {}
    }
    if (!this.source2) {
      this.source2 = {}
    }

    for (let level in this.$store.state.levelMapping.source2) {
      if (level !== 'code') {
        this.source2Levels.push({
          text: this.$store.state.levelMapping.source2[level],
          value: level
        })
      }
    }

    for (let level in this.$store.state.levelMapping.source1) {
      if (level !== 'code') {
        this.source1Levels.push({
          text: this.$store.state.levelMapping.source1[level],
          value: level
        })
      }
    }
  }
}
</script>
