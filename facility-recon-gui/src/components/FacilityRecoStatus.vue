<template>
  <v-container fluid>
    <v-dialog
      v-model="mappingStatusDialog"
      transition="scale-transition"
      hide-overlay
      persistent
      width="350"
    >
      <v-card
        color="white"
        dark
      >
        <v-card-text>
          <center>
            <font style="color:blue">{{mappingStatusProgressTitle}}</font><br>
            <v-progress-circular
              :rotate="-90"
              :size="100"
              :width="15"
              :value="mappingStatusProgressPercent"
              color="primary"
              v-if="progressType == 'percent'"
            >
              <v-avatar
                color="indigo"
                size="50px"
              >
                <span class="white--text">
                  <b>{{ mappingStatusProgressPercent }}%</b>
                </span>
              </v-avatar>
            </v-progress-circular>
            <v-progress-linear
              indeterminate
              color="red"
              class="mb-0"
              v-if="progressType == 'indeterminate'"
            ></v-progress-linear>
          </center>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-layout column>
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
            This page let you visualize the mapping status for various levels
            <v-list>
              1. Right boxes shows reconciliation status for a selected level
            </v-list>
            <v-list>
              2. Left boxes shows reconciliation status for a all levels
            </v-list>
            <v-list>
              3. The search box let you search locations for a selected level only
            </v-list>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-flex
        xs1
        text-xs-right
      >
        <v-layout
          row
          wrap
        >
          <v-flex xs3>
            <appRecoExport></appRecoExport>
          </v-flex>
          <v-flex xs9>
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
      </v-flex>
    </v-layout>
    <v-layout column>
      <v-flex xs1>
        <v-layout
          row
          wrap
        >
          <v-flex xs6>
            <b>All Levels</b>
          </v-flex>
          <v-spacer></v-spacer>
          <v-flex xs3>
            <b>{{currentLevelText}} Only</b>
          </v-flex>
        </v-layout>
      </v-flex>
      <v-flex xs1>
        <v-layout
          row
          wrap
        >
          <v-flex xs1>
            <v-chip
              color="green"
              text-color='white'
              style='height:138px;width:137px'
            >
              <v-layout column>
                <v-flex xs1>
                  <b>Source 1 Matched</b>
                </v-flex>
                <v-flex
                  xs1
                  align-center
                >
                  <center>
                    <b>{{$store.state.totalAllMapped}}/{{$store.state.source1TotalAllRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <v-progress-circular
                      :rotate="-90"
                      :size="65"
                      :width="8"
                      :value="source1PercentMapped"
                      color="yellow"
                    >
                      <font color="white">
                        <b>{{ source1PercentMapped }}%</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
          </v-flex>

          <v-flex xs1>
            <v-chip
              color="green"
              text-color='white'
              style='height:138px;width:137px'
            >
              <v-layout column>
                <v-flex xs1>
                  <b>Source 1 No Match</b>
                </v-flex>
                <v-flex
                  xs1
                  align-center
                >
                  <center>
                    <b>{{$store.state.totalAllNoMatch}}/{{$store.state.source1TotalAllRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <v-progress-circular
                      :rotate="-90"
                      :size="65"
                      :width="8"
                      :value="source1PercentNoMatch"
                      color="yellow"
                    >
                      <font color="white">
                        <b>{{ source1PercentNoMatch }}%</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
          </v-flex>
          <v-flex xs1>
            <v-chip
              color="green"
              text-color='white'
              style='height:138px;width:137px'
            >
              <v-layout column>
                <v-flex xs1>
                  <b>Source 1 Flagged</b>
                </v-flex>
                <v-flex
                  xs1
                  align-center
                >
                  <center>
                    <b>{{$store.state.totalAllFlagged}}/{{$store.state.source1TotalAllRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <v-progress-circular
                      :rotate="-90"
                      :size="65"
                      :width="8"
                      :value="source1PercentFlagged"
                      color="yellow"
                    >
                      <font color="white">
                        <b>{{ source1PercentFlagged }}%</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
          </v-flex>
          <v-flex xs1>
            <v-chip
              color="green"
              text-color='white'
              style='height:138px;width:137px'
            >
              <v-layout column>
                <v-flex xs1>
                  <b>Source 2 Matched</b>
                </v-flex>
                <v-flex
                  xs1
                  align-center
                >
                  <center>
                    <b>{{$store.state.totalAllMapped}}/{{$store.state.source2TotalAllRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <v-progress-circular
                      :rotate="-90"
                      :size="65"
                      :width="8"
                      :value="source2PercentMapped"
                      color="green"
                    >
                      <font color="white">
                        <b>{{ source2PercentMapped }}%</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
          </v-flex>
          <v-flex xs1>
            <v-chip
              color="green"
              text-color='white'
              style='height:138px;width:137px'
            >
              <v-layout column>
                <v-flex xs1>
                  <b>Source 2 Flagged</b>
                </v-flex>
                <v-flex
                  xs1
                  align-center
                >
                  <center>
                    <b>{{$store.state.totalAllFlagged}}/{{$store.state.source2TotalAllRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <v-progress-circular
                      :rotate="-90"
                      :size="65"
                      :width="8"
                      :value="source2PercentFlagged"
                      color="yellow"
                    >
                      <font color="white">
                        <b>{{ source2PercentFlagged }}%</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
          </v-flex>
          <v-spacer></v-spacer>
          <v-flex xs1>
            <v-chip
              color="cyan"
              text-color='black'
              style='height:138px;width:137px'
            >
              <v-layout column>
                <v-flex xs1>
                  <b>Source 1 Matched</b>
                </v-flex>
                <v-flex
                  xs1
                  align-center
                >
                  <center>
                    <b>{{totalMapped}}/{{totalRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <v-progress-circular
                      :rotate="-90"
                      :size="65"
                      :width="8"
                      :value="source1PercentMappedLevel"
                      color="yellow"
                    >
                      <font color="black">
                        <b>{{ source1PercentMappedLevel }}%</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
          </v-flex>
          <v-flex xs1>
            <v-chip
              color="cyan"
              text-color='black'
              style='height:138px;width:137px'
            >
              <v-layout column>
                <v-flex xs1>
                  <b>Source 1 No Match</b>
                </v-flex>
                <v-flex
                  xs1
                  align-center
                >
                  <center>
                    <b>{{totalNoMatch}}/{{totalRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <v-progress-circular
                      :rotate="-90"
                      :size="65"
                      :width="8"
                      :value="source1PercentNoMatchLevel"
                      color="yellow"
                    >
                      <font color="black">
                        <b>{{ source1PercentNoMatchLevel }}%</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
          </v-flex>
          <v-flex xs1>
            <v-chip
              color="cyan"
              text-color='black'
              style='height:138px;width:137px'
            >
              <v-layout column>
                <v-flex xs1>
                  <b>Source 1 Flagged</b>
                </v-flex>
                <v-flex
                  xs1
                  align-center
                >
                  <center>
                    <b>{{totalFlagged}}/{{totalRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <v-progress-circular
                      :rotate="-90"
                      :size="65"
                      :width="8"
                      :value="source1PercentFlagged"
                      color="yellow"
                    >
                      <font color="black">
                        <b>{{ source1PercentFlagged }}%</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
          </v-flex>
        </v-layout>
      </v-flex>
      <v-flex xs1>
        <v-layout
          row
          wrap
        >
          <v-flex xs3>
            <v-text-field
              v-model="searchMatched"
              append-icon="search"
              label="Search"
              single-line
              hide-details
            ></v-text-field>
          </v-flex>
          <v-spacer></v-spacer>
          <v-flex xs2>
            <template v-if="$store.state.activePair.userID._id === $store.state.auth.userID || $store.state.auth.role == 'Admin'">
              <v-btn
                color="success"
                round
                @click='markRecoDone'
                v-if="$store.state.recoStatus !== 'Done'"
              >
                <v-icon>lock</v-icon>Mark Reconciliation As Done
              </v-btn>
              <v-btn
                color="success"
                round
                @click='markRecoUnDone'
                v-if="$store.state.recoStatus === 'Done' && $store.state.auth.role == 'Admin'"
              >
                <v-icon>lock_open</v-icon>Mark Reconciliation As UnDone
              </v-btn>
            </template>
          </v-flex>
          <v-spacer></v-spacer>
          <v-flex
            xs1
            sm2
            md2
            right
          >
            <v-select
              :items="locationLevels"
              v-model="recoLevel"
              :item-value='locationLevels.value'
              :item-name='locationLevels.text'
              label="Level"
              class="input-group--focused"
              height='1'
              full-width
              @change="levelChanged"
              single-line
            >
            </v-select>
          </v-flex>
        </v-layout>
      </v-flex>
      <v-flex xs1>
        <v-tabs
          icons-and-text
          centered
          grow
          dark
          color="cyan"
        >
          <v-tabs-slider color="red"></v-tabs-slider>
          <v-tab key="match">
            MATCHED ({{totalMapped}})
            <v-icon
              color="white"
              right
            >thumb_up</v-icon>
          </v-tab>
          <v-tab key="notMapped">
            Source 1 Not Mapped ({{totalNotMapped}})
            <v-icon
              color="white"
              right
            >thumb_down</v-icon>
          </v-tab>
          <v-tab key="nomatch">
            Source 1 NO MATCH ({{totalNoMatch}})
            <v-icon
              color="white"
              right
            >thumb_down</v-icon>
          </v-tab>
          <v-tab key="ignore">
            Source 1 IGNORED ({{totalIgnore}})
            <v-icon
              color="white"
              right
            >thumb_down</v-icon>
          </v-tab>
          <v-tab key="flagged">
            FLAGGED ({{totalFlagged}})
            <v-icon
              color="white"
              right
            >notification_important</v-icon>
          </v-tab>
          <v-tab-item key="match">
            <v-data-table
              :headers="matchedHeaders"
              :items="mappingData.mapped"
              :search="searchMatched"
              class="elevation-1"
            >
              <template
                slot="items"
                slot-scope="props"
              >
                <td>{{props.item.source1Name}}</td>
                <td>{{props.item.source1Id}}</td>
                <td>{{props.item.source2Name}}</td>
                <td>{{props.item.source2Id}}</td>
              </template>
            </v-data-table>
          </v-tab-item>
          <v-tab-item key="notMapped">
            <v-data-table
              :headers="notMappedHeaders"
              :items="mappingData.notMapped"
              :search="searchMatched"
              class="elevation-1"
            >
              <template
                slot="items"
                slot-scope="props"
              >
                <td>{{props.item.source1Name}}</td>
                <td>{{props.item.source1Id}}</td>
              </template>
            </v-data-table>
          </v-tab-item>
          <v-tab-item key="nomatch">
            <v-data-table
              :headers="noMatchHeaders"
              :items="mappingData.noMatch"
              :search="searchMatched"
              class="elevation-1"
            >
              <template
                slot="items"
                slot-scope="props"
              >
                <td>{{props.item.source1Name}}</td>
                <td>{{props.item.source1Id}}</td>
              </template>
            </v-data-table>
          </v-tab-item>
          <v-tab-item key="ignore">
            <v-data-table
              :headers="noMatchHeaders"
              :items="mappingData.ignore"
              :search="searchMatched"
              class="elevation-1"
            >
              <template
                slot="items"
                slot-scope="props"
              >
                <td>{{props.item.source1Name}}</td>
                <td>{{props.item.source1Id}}</td>
              </template>
            </v-data-table>
          </v-tab-item>
          <v-tab-item key="flagged">
            <v-data-table
              :headers="flaggedHeaders"
              :items="mappingData.flagged"
              :search="searchMatched"
              class="elevation-1"
            >
              <template
                slot="items"
                slot-scope="props"
              >
                <td>{{props.item.source1Name}}</td>
                <td>{{props.item.source1Id}}</td>
                <td>{{props.item.source2Name}}</td>
                <td>{{props.item.source2Id}}</td>
              </template>
            </v-data-table>
          </v-tab-item>
        </v-tabs>
      </v-flex>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { scoresMixin } from '../mixins/scoresMixin'
import axios from 'axios'
import ReconciliationExport from './ReconciliationExport'
const backendServer = process.env.BACKEND_SERVER
export default {
  mixins: [scoresMixin],
  data () {
    return {
      helpDialog: false,
      matchedHeaders: [
        { text: 'Source 1 Location', value: 'source1Name' },
        { text: 'Source 1 ID', value: 'source1Id' },
        { text: 'Source 2 Location', value: 'source2Name' },
        { text: 'Source 2 ID', value: 'source2Id' }
      ],
      noMatchHeaders: [
        { text: 'Source 1 Location', value: 'source1Name' },
        { text: 'Source 1 ID', value: 'source1Id' }
      ],
      notMappedHeaders: [
        { text: 'Source 1 Location', value: 'source1Name' },
        { text: 'Source 1 ID', value: 'source1Id' }
      ],
      flaggedHeaders: [
        { text: 'Source 1 Location', value: 'source1Name' },
        { text: 'Source 1 ID', value: 'source1Id' },
        { text: 'Source 2 Location', value: 'source2Name' },
        { text: 'Source 2 ID', value: 'source2Id' }
      ],
      searchMatched: '',
      mappingData: {},
      recoLevel: 2,
      mappingStatusDialog: false,
      mappingStatusProgressTitle: 'Waiting for progress status',
      mappingStatusProgressPercent: 0,
      locationLevels: []
    }
  },
  methods: {
    checkMappingStatusProgress () {
      const clientId = this.$store.state.clientId
      axios.get(backendServer + '/progress/mappingStatus/' + clientId).then((mappingStatusProgress) => {
        if (mappingStatusProgress.data === null ||
          mappingStatusProgress.data === undefined ||
          mappingStatusProgress.data === false
        ) {
          this.mappingStatusDialog = false
          this.mappingStatusProgressTitle = 'Waiting for progress status'
          clearInterval(this.mappingStatusProgressTimer)
          return
        }
        if (mappingStatusProgress.data.status === null &&
          mappingStatusProgress.data.error === null &&
          mappingStatusProgress.data.percent === null
        ) {
          this.mappingStatusDialog = false
          clearInterval(this.mappingStatusProgressTimer)
          this.mappingStatusProgressTitle = 'Waiting for progress status'
          return
        }
        this.mappingStatusProgressTitle = mappingStatusProgress.data.status
        if (mappingStatusProgress.data.percent) {
          if (this.progressType !== 'percent') {
            this.progressType = 'percent'
          }
          this.mappingStatusProgressPercent = mappingStatusProgress.data.percent
        }
        if (mappingStatusProgress.data.status === 'Done') {
          this.clearProgress('mappingStatus')
          clearInterval(this.mappingStatusProgressTimer)
          this.mappingStatusDialog = false
          this.mappingStatusProgressTitle = 'Waiting for progress status'
        }
      }).catch((err) => {
        console.log(err)
      })
    },
    mappingStatus () {
      if (!this.source1 || !this.source2) {
        return
      }
      this.mappingData = {}
      const clientId = this.$store.state.clientId
      let totalSource2Levels = this.$store.state.totalSource2Levels
      let totalSource1Levels = this.$store.state.totalSource1Levels
      let userID = this.$store.state.activePair.userID._id
      let sourcesOwner = this.getDatasourceOwner()
      let source1Owner = sourcesOwner.source1Owner
      let source2Owner = sourcesOwner.source2Owner
      let source1LimitOrgId = this.getLimitOrgIdOnActivePair().source1LimitOrgId
      let source2LimitOrgId = this.getLimitOrgIdOnActivePair().source2LimitOrgId
      this.mappingStatusDialog = true
      this.progressType = 'indeterminate'
      let path = `/mappingStatus/${this.source1}/${this.source2}/${source1Owner}/${source2Owner}/${this.recoLevel}/${totalSource2Levels}/${totalSource1Levels}/${clientId}/${userID}?source1LimitOrgId=${source1LimitOrgId}&source2LimitOrgId=${source2LimitOrgId}`
      axios.get(backendServer + path).then((mappingStatus) => {
        this.mappingData = mappingStatus.data
      })
      this.mappingStatusProgressTimer = setInterval(this.checkMappingStatusProgress, 500)
    },
    levelChanged (level) {
      this.recoLevel = level
      this.mappingStatus()
    },
    markRecoDone () {
      this.$store.state.progressTitle = 'Marking reconciliation as Done'
      this.$store.state.dynamicProgress = true
      let userID = this.$store.state.activePair.userID._id
      axios.get(backendServer + '/markRecoDone/' + this.source1 + '/' + this.source2 + '/' + userID).then((status) => {
        this.$store.state.dynamicProgress = false
        if (status.data.status) {
          this.$store.state.recoStatus = status.data.status
        }
        this.$store.state.errorTitle = 'Reconciliation Done'
        this.$store.state.errorDescription = 'Reconciliation is complete, no more changes can be done'
        this.$store.state.errorColor = 'primary'
        this.$store.state.dialogError = true
      }).catch((err) => {
        this.$store.state.dynamicProgress = false
        console.log(err.response.data.error)
      })
    },
    markRecoUnDone () {
      let userID = this.$store.state.activePair.userID._id
      this.$store.state.progressTitle = 'Marking reconciliation as Un Done'
      this.$store.state.dynamicProgress = true
      axios.get(backendServer + '/markRecoUnDone/' + this.source1 + '/' + this.source2 + '/' + userID).then((status) => {
        this.$store.state.dynamicProgress = false
        if (status.data.status) {
          this.$store.state.recoStatus = status.data.status
        }
        this.$store.state.errorTitle = 'Reconciliation on progress'
        this.$store.state.errorDescription = 'You may continue doing reconciliation now'
        this.$store.state.errorColor = 'primary'
        this.$store.state.dialogError = true
      }).catch((err) => {
        this.$store.state.dynamicProgress = false
        console.log(err.response.data.error)
      })
    }
  },
  computed: {
    currentLevelText () {
      return this.translateDataHeader('source1', this.recoLevel - 1)
    },
    source1 () {
      let source = this.$store.state.activePair.source1.name
      if (source) {
        source = this.toTitleCase(source)
      }
      return source
    },
    source2 () {
      let source = this.$store.state.activePair.source2.name
      if (source) {
        source = this.toTitleCase(source)
      }
      return source
    },
    source1PercentMapped () {
      if (this.$store.state.source1TotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.totalAllMapped * 100 / this.$store.state.source1TotalAllRecords).toFixed(2))
      }
    },
    source1PercentMappedLevel () {
      if (this.totalRecords === 0) {
        return 0
      } else {
        return parseFloat((this.totalMapped * 100 / this.totalRecords).toFixed(2))
      }
    },
    source1PercentNoMatch () {
      if (this.$store.state.source1TotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.totalAllNoMatch * 100 / this.$store.state.source1TotalAllRecords).toFixed(2))
      }
    },
    source1PercentIgnore () {
      if (this.$store.state.source1TotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.totalAllIgnore * 100 / this.$store.state.source1TotalAllRecords).toFixed(2))
      }
    },
    source1PercentNoMatchLevel () {
      if (this.totalRecords === 0) {
        return 0
      } else {
        return parseFloat((this.totalNoMatch * 100 / this.totalRecords).toFixed(2))
      }
    },
    source1PercentIgnoreLevel () {
      if (this.totalRecords === 0) {
        return 0
      } else {
        return parseFloat((this.totalIgnore * 100 / this.totalRecords).toFixed(2))
      }
    },
    source1PercentFlagged () {
      if (this.$store.state.source1TotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.totalAllFlagged * 100 / this.$store.state.source1TotalAllRecords).toFixed(2))
      }
    },
    source1PercentFlaggedLevel () {
      if (this.totalRecords === 0) {
        return 0
      } else {
        return parseFloat((this.totalFlagged * 100 / this.totalRecords).toFixed(2))
      }
    },
    source1PercentNotMapped () {
      if (this.$store.state.source1TotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.source1TotalAllNotMapped * 100 / this.$store.state.source1TotalAllRecords).toFixed(2))
      }
    },
    source1PercentNotMappedLevel () {
      if (this.totalRecords === 0) {
        return 0
      } else {
        return parseFloat((this.totalNotMapped * 100 / this.totalRecords).toFixed(2))
      }
    },
    source2PercentFlagged () {
      if (this.$store.state.source2TotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.totalAllFlagged * 100 / this.$store.state.source2TotalAllRecords).toFixed(2))
      }
    },
    source2PercentMapped () {
      if (this.$store.state.source2TotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.totalAllMapped * 100 / this.$store.state.source2TotalAllRecords).toFixed(2))
      }
    },
    totalMapped () {
      if (this.mappingData && this.mappingData.hasOwnProperty('mapped')) {
        return this.mappingData.mapped.length
      } else {
        return 0
      }
    },
    totalNotMapped () {
      if (this.mappingData && this.mappingData.hasOwnProperty('notMapped')) {
        return this.mappingData.notMapped.length
      } else {
        return 0
      }
    },
    totalNoMatch () {
      if (this.mappingData && this.mappingData.hasOwnProperty('noMatch')) {
        return this.mappingData.noMatch.length
      } else {
        return 0
      }
    },
    totalIgnore () {
      if (this.mappingData && this.mappingData.hasOwnProperty('ignore')) {
        return this.mappingData.ignore.length
      } else {
        return 0
      }
    },
    totalFlagged () {
      if (this.mappingData && this.mappingData.hasOwnProperty('flagged')) {
        return this.mappingData.flagged.length
      } else {
        return 0
      }
    },
    totalRecords () {
      return this.totalMapped + this.totalNotMapped + this.totalNoMatch + this.totalIgnore + this.totalFlagged
    }
  },
  components: {
    'appRecoExport': ReconciliationExport
  },
  created () {
    this.mappingStatus()
    for (var k = 1; k < this.$store.state.totalSource1Levels; k++) {
      let text = this.translateDataHeader('source1', k)
      this.locationLevels.push({
        text: text,
        value: k + 1
      })
    }
  }
}
</script>
