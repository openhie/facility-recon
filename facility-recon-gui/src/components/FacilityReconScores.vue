<template>
  <v-container fluid>
    <template v-if='$store.state.uploadRunning'><br><br><br>
      <v-alert type="info" :value="true">
        <b>Wait for upload to finish ...</b>
        <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
      </v-alert>
    </template>
    <v-container fluid grid-list-lg v-if='!$store.state.denyAccess & !$store.state.uploadRunning'>
      <v-dialog v-model="scoreDialog" hide-overlay persistent width="350">
        <v-card color="white" dark>
          <v-card-text>
            <center>
              <font style="color:blue">{{scoreProgressTitle}}</font><br>
              <v-progress-circular :rotate="-90" :size="100" :width="15" :value="scoreProgressPercent" color="primary" v-if="progressType == 'percent'">
                <v-avatar color="indigo" size="50px">
                  <span class="white--text">
                    <b>{{ scoreProgressPercent }}%</b>
                  </span>
                </v-avatar>
              </v-progress-circular>
              <v-progress-linear indeterminate color="red" class="mb-0" v-if="progressType == 'indeterminate'"></v-progress-linear>
            </center>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog persistent v-model="alert" width="500px">
        <v-card>
          <v-card-title>
            {{alertTitle}}
          </v-card-title>
          <v-card-text>
            {{alertText}}
          </v-card-text>
          <v-card-actions>
            <v-btn color="success" @click='alert = false'>OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog persistent v-model="dialog" width="830px">
        <v-card width='830px'>
          <v-toolbar color="primary" dark>
            <v-toolbar-title>
              {{ selectedMohName }}
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-text-field v-model="searchPotential" append-icon="search" label="Search" single-line hide-details color="yellow" />
            <v-btn icon dark @click.native="back">
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-title>
            Parents:
            <b>{{selectedMohParents.join('->')}}</b>
            <v-spacer></v-spacer>
            <template v-if='$store.state.recoLevel == $store.state.totalLevels'>
              Latitude:
              <b>{{selectedMohLat}}</b>
              <v-spacer></v-spacer>
              Longitude:
              <b>{{selectedMohLong}}</b>
              <v-spacer></v-spacer>
            </template>
          </v-card-title>
          <v-card-text>
            <v-data-table :headers="potentialHeaders" :items="allPotentialMatches" :search="searchPotential" :pagination.sync="pagination" class="elevation-1">
              <template slot="headers" slot-scope="props">
                <tr>
                  <template v-for='header in potentialHeaders'>
                    <th :key='header.text' align='left' v-if="header.text == 'Score'" class="column sortable active" @click="changeSort(header.value)">
                      <v-icon small v-if="sort_arrow == 'up'">arrow_upward</v-icon>
                      <v-icon small v-else>arrow_downward</v-icon>
                      {{header.text}}
                      <v-tooltip top>
                        <v-btn slot="activator" icon>
                          <v-icon>help</v-icon>
                        </v-btn>
                        <span>The lower the score, the better the match</span>
                      </v-tooltip>
                    </th>
                    <th :key='header.text' align='left' v-else>
                      {{header.text}}
                    </th>
                  </template>
                </tr>
              </template>
              <template slot="items" slot-scope="props">
                <tr @click='changeMappingSelection(props.item.id,props.item.name)'>
                  <v-radio-group v-model='selectedDatimId' style="height: 5px">
                    <td>
                      <v-radio :value="props.item.id" color="red"></v-radio>
                    </td>
                  </v-radio-group>
                  <td>{{props.item.name}}</td>
                  <td>{{props.item.id}}</td>
                  <td v-if='$store.state.recoLevel == $store.state.totalLevels'>{{props.item.lat}}</td>
                  <td v-if='$store.state.recoLevel == $store.state.totalLevels'>{{props.item.long}}</td>
                  <td v-if='$store.state.recoLevel == $store.state.totalLevels'>{{props.item.geoDistance}}</td>
                  <td>{{props.item.score}}</td>
                </tr>
              </template>
            </v-data-table>
          </v-card-text>
          <v-card-actions style='float: center'>
            <v-btn color="error" @click.native="match('flag')">
              <v-icon dark left>notification_important</v-icon>Flag</v-btn>
            <v-btn color="green" dark @click.native="noMatch">
              <v-icon left>thumb_down</v-icon>No Match</v-btn>
            <v-btn color="primary" dark @click.native="match('match')">
              <v-icon left>thumb_up</v-icon>Save Match</v-btn>
            <v-btn color="orange darken-2" @click.native="back" style="color: white">
              <v-icon dark left>arrow_back</v-icon>Back</v-btn>
            <v-btn-toggle v-if='potentialAvailable' v-model="showAllPotential">
              <v-btn color="teal darken-2" style="color: white;" value="all">
                <template v-if="showAllPotential === 'all'">Show Scored Suggestions</template>
                <template v-else>Show All Suggestions</template>
              </v-btn>
            </v-btn-toggle>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-layout row wrap>
        <v-spacer></v-spacer>
        <v-flex xs1 sm2 md2 right>
          <v-select :items="$store.state.levelArray" v-model="$store.state.recoLevel" :item-value='$store.state.levelArray.value' :item-name='$store.state.levelArray.text' label="Level" class="input-group--focused" height='1' single-line @change="levelChanged">
          </v-select>
        </v-flex>
        <v-flex xs1 sm2 md2>
          <v-btn slot="activator" color="primary" dark @click="getScores" round>
            <v-icon>repeat_one</v-icon> Recalculate Scores</v-btn>
        </v-flex>
        <v-flex xs1 sm4 md2 v-if="nextLevel == 'yes'">
          <v-btn color="success" round @click='levelChanged(++$store.state.recoLevel)'>
            <v-icon>forward</v-icon>Proceed to Level {{$store.state.recoLevel}}</v-btn>
        </v-flex>
      </v-layout>
      <v-layout row wrap>
        <v-flex xs2 right>
          <div style="border-style: solid;border-color:green; text-align: center;">
            <b>MOH Reconciliation Status</b>
            <v-chip color="green" text-color='white' style='height:138px;width:128px'>
              <v-layout column>
                <v-flex>
                  <v-icon light>thumb_up</v-icon>
                  <b>Matched</b>
                </v-flex>
                <v-flex>
                  <center>
                    <v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentMatched" color="yellow">
                      <font color="white">
                        <b>{{ mohPercentMatched }}%</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
                <v-flex align-center>
                  <center>
                    <b>{{mohTotalMatched}}/{{mohTotalRecords}}</b>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
            <v-chip color="green" text-color='white' style='height:138px;width:128px'>
              <v-layout column>
                <v-flex align-center>
                  <v-icon light>lock_open</v-icon>
                  <b>Un Matched</b>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <b>{{mohTotalUnMatched}}/{{mohTotalRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1 align-center>
                  <center>
                    <v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentUnMatched" color="yellow">
                      <font color="white">
                        <b>{{mohPercentUnMatched}} %</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
            <br>
            <v-chip color="green" text-color='white' style='height:138px;width:128px'>
              <v-layout column>
                <v-flex align-center>
                  <v-icon light>thumb_down</v-icon>
                  <b>No Match</b>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <b>{{mohTotalNoMatch}}/{{mohTotalRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1 align-center>
                  <center>
                    <v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentNoMatch" color="yellow">
                      <font color="white">
                        <b>{{mohPercentNoMatch}} %</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
            <v-chip color="green" text-color='white' style='height:138px;width:128px'>
              <v-layout column>
                <v-flex align-center>
                  <v-icon light>notification_important</v-icon>
                  <b>Flagged</b>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <b>{{totalFlagged}}/{{mohTotalRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1 align-center>
                  <center>
                    <v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentFlagged" color="yellow">
                      <font color="white">
                        <b>{{mohPercentFlagged}} %</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
          </div>
        </v-flex>
        <v-flex xs4 child-flex>
          <v-card color="green lighten-2" dark>
            <v-card-title primary-title>
              MOH Unmatched
              <v-spacer></v-spacer>
              <v-text-field v-model="searchUnmatchedMoh" append-icon="search" label="Search" single-line hide-details></v-text-field>
            </v-card-title>
            <template v-if='$store.state.mohUnMatched !== null'>
              <liquor-tree :data="mohTree" ref="mohTree" :key="mohTreeUpdate" />
              <v-data-table :headers="mohGridHeaders" :items="mohGrid" :search="searchUnmatchedMoh" light class="elevation-1">
                <template slot="items" slot-scope="props">
                  <td v-if="$store.state.recoStatus.status === 'done'" :key='props.item.id'>{{props.item.name}}</td>
                  <td v-else @click="getPotentialMatch(props.item.id)" style="cursor: pointer" :key='props.item.id'>{{props.item.name}}</td>
                  <td v-for="(parent,index) in props.item.parents" v-if='index !=props.item.parents.length-1' :key='props.item.id+index'>
                    {{parent}}
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-else>
              <v-progress-linear :size="70" indeterminate color="amber"></v-progress-linear>
            </template>
          </v-card>
        </v-flex>
        <v-flex xs4>
          <v-card color="blue lighten-2" dark>
            <v-card-title primary-title>
              DATIM Unmatched
              <v-spacer></v-spacer>
              <v-text-field v-model="searchUnmatchedDatim" append-icon="search" label="Search" single-line hide-details></v-text-field>
            </v-card-title>
            <template v-if='$store.state.datimUnMatched !== null'>
              <v-data-table :headers="mohUnmatchedHeaders" :items="$store.state.datimUnMatched" :search="searchUnmatchedDatim" light class="elevation-1">
                <template slot="items" slot-scope="props">
                  <td>{{props.item.name}} <br>&ensp;&ensp;{{props.item.parents | removeCountry | joinParents}}</td>
                </template>
              </v-data-table>
            </template>
            <template v-else>
              <v-progress-linear :size="70" indeterminate color="amber"></v-progress-linear>
            </template>
          </v-card>
        </v-flex>

        <v-flex xs2 right>
          <div style='border-style: solid;border-color: green; text-align: center;'>
            <b>DATIM Reconciliation Status</b>
            <v-chip color="green" text-color='white' style='height:138px;width:128px'>
              <v-layout column>
                <v-flex align-center>
                  <v-icon light>thumb_up</v-icon>
                  <b>Matched</b>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <b>{{datimTotalMatched}}/{{datimTotalRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1 align-center>
                  <center>
                    <v-progress-circular :rotate="-90" :size="65" :width="8" :value="datimPercentMatched" color="yellow">
                      <font color="white">
                        <b>{{datimPercentMatched}} %</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
            <v-chip color="green" text-color='white' style='height:138px;width:128px'>
              <v-layout column>
                <v-flex xs1>
                  <v-icon light>lock_open</v-icon>
                  <b>Un Matched</b>
                </v-flex>
                <v-flex xs1 align-center>
                  <center>
                    <b>{{datimTotalUnmatched}}/{{datimTotalRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <v-progress-circular :rotate="-90" :size="65" :width="8" :value="datimPercentUnmatched" color="yellow">
                      <font color="white">
                        <b>{{ datimPercentUnmatched }}%</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
            <br>
            <v-chip color="green" text-color='white' style='height:138px;width:128px'>
              <v-layout column>
                <v-flex align-center>
                  <v-icon light>notification_important</v-icon>
                  <b>Flagged</b>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <b>{{totalFlagged}}/{{datimTotalRecords}}</b>
                  </center>
                </v-flex>
                <v-flex xs1 align-center>
                  <center>
                    <v-progress-circular :rotate="-90" :size="65" :width="8" :value="datimPercentFlagged" color="yellow">
                      <font color="white">
                        <b>{{datimPercentFlagged}} %</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
            <v-chip color="green" text-color='white' style='height:138px;width:128px'>
              <v-layout column>
                <v-flex align-center>
                  <v-icon light>notification_important</v-icon>
                  <b>Not in MOH</b>
                </v-flex>
                <v-flex xs1>
                  <center>
                    <b>{{datimNotInMoh}}</b>
                  </center>
                </v-flex>
                <v-flex xs1 align-center>
                  <center>
                    <v-progress-circular :rotate="-90" :size="65" :width="8" :value="datimPercentNotInMoh" color="yellow">
                      <font color="white">
                        <b>{{datimPercentNotInMoh}} %</b>
                      </font>
                    </v-progress-circular>
                  </center>
                </v-flex>
              </v-layout>
            </v-chip>
          </div>
        </v-flex>
      </v-layout>
      <v-layout column wrap>
        <v-tabs icons-and-text centered grow dark color="cyan">
          <v-tabs-slider color="red"></v-tabs-slider>
          <v-tab key="match">
            MATCHED ({{mohTotalMatched}})
            <v-icon color="white" right>thumb_up</v-icon>
          </v-tab>
          <v-tab key="nomatch">
            NO MATCH ({{mohTotalNoMatch}})
            <v-icon color="white" right>thumb_down</v-icon>
          </v-tab>
          <v-tab key="flagged">
            FLAGGED ({{totalFlagged}})
            <v-icon color="white" right>notification_important</v-icon>
          </v-tab>
          <v-tab-item key="match">
            <template v-if='$store.state.matchedContent != null'>
              <v-text-field v-model="searchMatched" append-icon="search" label="Search" single-line hide-details></v-text-field>
              <v-data-table :headers="matchedHeaders" :items="$store.state.matchedContent" :search="searchMatched" class="elevation-1">
                <template slot="items" slot-scope="props">
                  <td>{{props.item.mohName}}</td>
                  <td>{{props.item.mohId}}</td>
                  <td>{{props.item.datimName}}</td>
                  <td>{{props.item.datimId}}</td>
                  <td>
                    <v-btn v-if="$store.state.recoStatus.status == 'done'" disabled color="error" style='text-transform: none' small @click='breakMatch(props.item.datimId)'>
                      <v-icon>undo</v-icon>Break Match</v-btn>
                    <v-btn v-else color="error" style='text-transform: none' small @click='breakMatch(props.item.datimId)'>
                      <v-icon>undo</v-icon>Break Match</v-btn>
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-else>
              <v-progress-linear :size="70" indeterminate color="amber"></v-progress-linear>
            </template>
          </v-tab-item>
          <v-tab-item key="nomatch">
            <template v-if='$store.state.noMatchContent != null'>
              <v-text-field v-model="searchNotMatched" append-icon="search" label="Search" single-line hide-details></v-text-field>
              <v-data-table :headers="noMatchHeaders" :items="$store.state.noMatchContent" :search="searchNotMatched" class="elevation-1">
                <template slot="items" slot-scope="props">
                  <td>{{props.item.mohName}}</td>
                  <td>{{props.item.mohId}}</td>
                  <td>{{props.item.parents.join('->')}}</td>
                  <td>
                    <v-btn v-if="$store.state.recoStatus.status == 'done'" disabled color="error" style='text-transform: none' small @click='breakNoMatch(props.item.mohId)'>
                      <v-icon>cached</v-icon>Break No Match
                    </v-btn>
                    <v-btn v-else color="error" style='text-transform: none' small @click='breakNoMatch(props.item.mohId)'>
                      <v-icon>cached</v-icon>Break No Match
                    </v-btn>
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-else>
              <v-progress-linear :size="70" indeterminate color="amber"></v-progress-linear>
            </template>
          </v-tab-item>
          <v-tab-item key="flagged">
            <template v-if='$store.state.flagged != null'>
              <v-text-field v-model="searchFlagged" append-icon="search" label="Search" single-line hide-details></v-text-field>
              <v-data-table :headers="flaggedHeaders" :items="$store.state.flagged" :search="searchFlagged" class="elevation-1">
                <template slot="items" slot-scope="props">
                  <td>{{props.item.mohName}}</td>
                  <td>{{props.item.mohId}}</td>
                  <td>{{props.item.datimName}}</td>
                  <td>{{props.item.datimId}}</td>
                  <td>
                    <v-btn v-if="$store.state.recoStatus.status == 'done'" disabled color="primary" style='text-transform: none' small @click='acceptFlag(props.item.datimId)'>
                      <v-icon>thumb_up</v-icon>Confirm Match
                    </v-btn>
                    <v-btn v-else color="primary" style='text-transform: none' small @click='acceptFlag(props.item.datimId)'>
                      <v-icon>thumb_up</v-icon>Confirm Match
                    </v-btn>
                    <v-btn v-if="$store.state.recoStatus.status == 'done'" disabled color="error" style='text-transform: none' small @click='unFlag(props.item.datimId)'>
                      <v-icon>cached</v-icon>Release
                    </v-btn>
                    <v-btn v-else color="error" style='text-transform: none' small @click='unFlag(props.item.datimId)'>
                      <v-icon>cached</v-icon>Release
                    </v-btn>
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-else>
              <v-progress-linear :size="70" indeterminate color="amber" />
            </template>
          </v-tab-item>
        </v-tabs>
      </v-layout>
    </v-container>
  </v-container>
</template>

<script>
import axios from 'axios'
import LiquorTree from 'liquor-tree'
import { scoresMixin } from '../mixins/scoresMixin'

const config = require('../../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = isProduction ? config.build.backend : config.dev.backend

export default {
  mixins: [scoresMixin],
  data () {
    return {
      sort_arrow: 'up',
      pagination: { sortBy: 'score' },
      recoLevel: 0,
      searchUnmatchedDatim: '',
      searchUnmatchedMoh: '',
      searchPotential: '',
      searchMatched: '',
      searchNotMatched: '',
      searchFlagged: '',
      potentialMatches: [],
      showAllPotential: null,
      alertText: '',
      alertTitle: '',
      alert: false,
      mohParents: {},
      mohFilter: { text: '', level: '' },
      mohTreeUpdate: 0,
      selectedMohName: null,
      selectedMohId: null,
      selectedMohLat: null,
      selectedMohLong: null,
      selectedMohParents: [],
      selectedDatimId: null,
      selectedDatimName: null,
      dialog: false,
      mohUnmatchedHeaders: [{ text: 'Location', value: 'name' }],
      matchedHeaders: [
        { text: 'MOH Location', value: 'mohName' },
        { text: 'MOH ID', value: 'mohId' },
        { text: 'DATIM Location', value: 'datimName' },
        { text: 'DATIM ID', value: 'datimId' }
      ],
      noMatchHeaders: [
        { text: 'MOH Location', value: 'mohName' },
        { text: 'MOH ID', value: 'mohId' },
        { text: 'Parents', value: 'parents' }
      ],
      flaggedHeaders: [
        { text: 'MOH Location', value: 'mohName' },
        { text: 'MOH ID', value: 'mohId' },
        { text: 'DATIM Location', value: 'datimName' },
        { text: 'DATIM ID', value: 'datimId' }
      ]
    }
  },
  filters: {
    removeCountry (parents) {
      var parentsCopy = parents.slice(0)
      parentsCopy.splice(parentsCopy.length - 1, 1)
      return parentsCopy
    },
    joinParents (parents) {
      return parents.join('->')
    }
  },
  methods: {
    changeSort (column) {
      if (this.pagination.sortBy === column) {
        this.pagination.descending = !this.pagination.descending
      } else {
        this.pagination.sortBy = column
        this.pagination.descending = false
      }
      if (this.pagination.descending) {
        this.sort_arrow = 'down'
      }
      else {
        this.sort_arrow = 'up'
      }
    },
    addListener () {
      const setListener = () => {
        if (this.$refs && this.$refs.mohTree) {
          this.$refs.mohTree.$on('node:selected', node => {
            this.mohFilter.text = node.data.text
            let level = 1
            while (node.parent) {
              node = node.parent
              level++
            }
            this.mohFilter.level = level
          })
        } else {
          setTimeout(function () {
            setListener()
          }, 500)
        }
      }
      setListener()
    },
    levelChanged (level) {
      this.$store.state.recoLevel = level
      this.getScores()
    },
    getPotentialMatch (id) {
      this.potentialMatches = []
      this.showAllPotential = null
      for (let scoreResult of this.$store.state.scoreResults) {
        if (scoreResult.moh.id === id) {
          this.selectedMohName = scoreResult.moh.name
          this.selectedMohParents = scoreResult.moh.parents
          this.selectedMohLat = scoreResult.moh.lat
          this.selectedMohLong = scoreResult.moh.long
          this.selectedMohId = scoreResult.moh.id
          for (let score in scoreResult.potentialMatches) {
            for (let j in scoreResult.potentialMatches[score]) {
              let potentials = scoreResult.potentialMatches[score][j]
              var matched = this.$store.state.matchedContent.find(matched => {
                return matched.datimId === potentials.id
              })
              if (matched) {
                continue
              }
              this.potentialMatches.push({
                score: score,
                name: potentials.name,
                id: potentials.id,
                lat: potentials.lat,
                long: potentials.long,
                geoDistance: potentials.geoDistance,
                parents: potentials.parents
              })
            }
          }
        }
      }
      this.dialog = true
    },
    changeMappingSelection (id, name) {
      this.selectedDatimId = id
      this.selectedDatimName = name
    },
    match (type) {
      if (this.selectedDatimId === null) {
        this.alert = true
        this.alertTitle = 'Information'
        this.alertText = 'Select DATIM Location to match against MOH Location'
        return
      }
      let formData = new FormData()
      formData.append('mohId', this.selectedMohId)
      formData.append('datimId', this.selectedDatimId)
      formData.append('recoLevel', this.$store.state.recoLevel)
      formData.append('totalLevels', this.$store.state.totalLevels)
      var orgid = this.$store.state.orgUnit.OrgId
      // remove from DATIM Unmatched
      let datimParents = null
      for (let k in this.$store.state.datimUnMatched) {
        if (this.$store.state.datimUnMatched[k].id === this.selectedDatimId) {
          datimParents = this.$store.state.datimUnMatched[k].parents
          this.$store.state.datimUnMatched.splice(k, 1)
        }
      }

      // Add from a list of MOH Matched and remove from list of MOH unMatched
      for (let k in this.$store.state.mohUnMatched) {
        if (this.$store.state.mohUnMatched[k].id === this.selectedMohId) {
          if (type === 'match') {
            ++this.$store.state.totalAllMapped
            this.$store.state.matchedContent.push({
              mohName: this.selectedMohName,
              mohId: this.selectedMohId,
              mohParents: this.$store.state.mohUnMatched[k].parents,
              datimName: this.selectedDatimName,
              datimId: this.selectedDatimId,
              datimParents: datimParents
            })
          } else if (type === 'flag') {
            ++this.$store.state.totalAllFlagged
            this.$store.state.flagged.push({
              mohName: this.selectedMohName,
              mohId: this.selectedMohId,
              mohParents: this.$store.state.mohUnMatched[k].parents,
              datimName: this.selectedDatimName,
              datimId: this.selectedDatimId,
              datimParents: datimParents
            })
          }
          this.$store.state.mohUnMatched.splice(k, 1)
        }
      }
      this.selectedMohId = null
      this.selectedMohName = null
      this.selectedDatimId = null
      this.dialog = false
      axios
        .post(backendServer + '/match/' + type + '/' + orgid, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(() => { })
        .catch(err => {
          console.log(err)
        })
    },
    acceptFlag (datimId) {
      // Add from a list of MOH Matched and remove from list of Flagged
      for (let k in this.$store.state.flagged) {
        if (this.$store.state.flagged[k].datimId === datimId) {
          this.$store.state.matchedContent.push({
            mohName: this.$store.state.flagged[k].mohName,
            mohId: this.$store.state.flagged[k].mohId,
            mohParents: this.$store.state.flagged[k].mohParents,
            datimName: this.$store.state.flagged[k].datimName,
            datimId: this.$store.state.flagged[k].datimId,
            datimParents: this.$store.state.flagged[k].datimParents
          })
          this.$store.state.flagged.splice(k, 1)
          ++this.$store.state.totalAllMapped
          --this.$store.state.totalAllFlagged
        }
      }
      let formData = new FormData()
      formData.append('datimId', datimId)
      formData.append('recoLevel', this.$store.state.recoLevel)
      formData.append('totalLevels', this.$store.state.totalLevels)
      var orgid = this.$store.state.orgUnit.OrgId
      axios
        .post(backendServer + '/acceptFlag/' + orgid, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(() => { })
        .catch(err => {
          console.log(err)
        })
    },
    breakMatch (datimId) {
      this.alert = true
      this.alertTitle = 'Information'
      this.alertText =
        'Scores for this Location may no be available unless you recalculate scores'
      let orgid = this.$store.state.orgUnit.OrgId
      let formData = new FormData()
      formData.append('datimId', datimId)
      axios
        .post(backendServer + '/breakMatch/' + orgid, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .catch(err => {
          console.log(err)
        })

      for (let k in this.$store.state.matchedContent) {
        if (this.$store.state.matchedContent[k].datimId === datimId) {
          this.$store.state.mohUnMatched.push({
            name: this.$store.state.matchedContent[k].mohName,
            id: this.$store.state.matchedContent[k].mohId,
            parents: this.$store.state.matchedContent[k].mohParents
          })
          this.$store.state.datimUnMatched.push({
            name: this.$store.state.matchedContent[k].datimName,
            id: this.$store.state.matchedContent[k].datimId,
            parents: this.$store.state.matchedContent[k].datimParents
          })
          this.$store.state.matchedContent.splice(k, 1)
          --this.$store.state.totalAllMapped
        }
      }
    },
    unFlag (datimId) {
      this.alert = true
      this.alertTitle = 'Information'
      this.alertText =
        'Scores for this Location may no be available unless you recalculate scores'
      let orgid = this.$store.state.orgUnit.OrgId
      let formData = new FormData()
      formData.append('datimId', datimId)
      axios
        .post(backendServer + '/breakMatch/' + orgid, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .catch(err => {
          console.log(err)
        })

      for (let k in this.$store.state.flagged) {
        if (this.$store.state.flagged[k].datimId === datimId) {
          this.$store.state.mohUnMatched.push({
            name: this.$store.state.flagged[k].mohName,
            id: this.$store.state.flagged[k].mohId,
            parents: this.$store.state.flagged[k].mohParents
          })
          this.$store.state.datimUnMatched.push({
            name: this.$store.state.flagged[k].datimName,
            id: this.$store.state.flagged[k].datimId,
            parents: this.$store.state.flagged[k].datimParents
          })
          this.$store.state.flagged.splice(k, 1)
          --this.$store.state.totalAllFlagged
        }
      }
    },
    breakNoMatch (mohId) {
      this.alert = true
      this.alertTitle = 'Information'
      this.alertText =
        'Scores for this Location may no be available unless you recalculate scores'
      let orgid = this.$store.state.orgUnit.OrgId
      let formData = new FormData()
      formData.append('mohId', mohId)
      formData.append('recoLevel', this.$store.state.recoLevel)
      formData.append('totalLevels', this.$store.state.totalLevels)
      axios
        .post(backendServer + '/breakNoMatch/' + orgid, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .catch(err => {
          console.log(err)
        })
      for (var k in this.$store.state.noMatchContent) {
        if (this.$store.state.noMatchContent[k].mohId === mohId) {
          this.$store.state.mohUnMatched.push({
            name: this.$store.state.noMatchContent[k].mohName,
            id: this.$store.state.noMatchContent[k].mohId,
            parents: this.$store.state.noMatchContent[k].parents
          })
          this.$store.state.noMatchContent.splice(k, 1)
          --this.$store.state.totalAllNoMatch
        }
      }
    },
    noMatch () {
      if (this.selectedDatimId !== null) {
        this.alert = true
        this.alertTitle = 'Information'
        this.alertText = 'Dont select any location if you want to mark as no match'
        return
      }
      let formData = new FormData()
      formData.append('mohId', this.selectedMohId)
      formData.append('recoLevel', this.$store.state.recoLevel)
      formData.append('totalLevels', this.$store.state.totalLevels)
      let orgid = this.$store.state.orgUnit.OrgId

      // remove from MOH Unmatched
      for (let k in this.$store.state.mohUnMatched) {
        if (this.$store.state.mohUnMatched[k].id === this.selectedMohId) {
          this.$store.state.noMatchContent.push({
            mohName: this.selectedMohName,
            mohId: this.selectedMohId,
            parents: this.$store.state.mohUnMatched[k].parents
          })
          this.$store.state.mohUnMatched.splice(k, 1)
        }
      }
      this.dialog = false
      this.selectedMohId = null
      this.selectedMohName = null
      this.selectedDatimId = null
      axios
        .post(backendServer + '/noMatch/' + orgid, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(() => { })
        .catch(err => {
          console.log(err)
        })
    },
    back () {
      this.dialog = false
      this.selectedDatimId = null
    }
  },
  computed: {
    mohGridHeaders () {
      let header = [{ text: 'Location', value: 'name' }]
      if (this.$store.state.mohUnMatched.length > 0) {
        for (
          let i = this.$store.state.mohUnMatched[0].parents.length;
          i > 0;
          i--
        ) {
          header.push({ text: 'Level ' + i, value: 'level' + (i + 1) })
        }
      }
      header.splice(1, 1)
      return header
    },
    potentialHeaders () {
      var results = []
      results.push(
        { sortable: false },
        { text: 'DATIM Location', value: 'name', sortable: false },
        { text: 'ID', value: 'id', sortable: false }
      )
      if (this.$store.state.recoLevel === this.$store.state.totalLevels) {
        results.push(
          { text: 'Lat', value: 'lat', sortable: false },
          { text: 'Long', value: 'long', sortable: false },
          { text: 'Geo Dist (Miles)', value: 'geodist', sortable: false }
        )
      }
      results.push({ text: 'Score', value: 'score' })
      return results
    },
    potentialAvailable () {
      return (
        this.$store.state.datimUnMatched !== null &&
        this.$store.state.datimUnMatched.length > this.potentialMatches.length
      )
    },
    allPotentialMatches () {
      if (
        this.$store.state.datimUnMatched !== null &&
        this.$store.state.datimUnMatched.length >
        this.potentialMatches.length &&
        this.showAllPotential === 'all'
      ) {
        let results = []
        for (let addIt of this.$store.state.datimUnMatched) {
          let matched = this.potentialMatches.find(matched => {
            return matched.id === addIt.id
          })
          if (!matched) {
            addIt.score = 'N/A'
            results.push(addIt)
          }
        }
        return this.potentialMatches.concat(results)
      } else {
        return this.potentialMatches
      }
    },
    mohTree () {
      this.addListener()
      const createTree = (current, results) => {
        for (let name in current) {
          let add = { text: name }
          add.children = []
          createTree(current[name], add.children)
          if (add.children.length === 0) {
            delete add.children
          }
          results.push(add)
        }
      }
      let results = []
      createTree(this.$store.state.mohParents, results)
      // This is needed because the tree doesn't show up on the initial page load without it
      this.mohTreeUpdate++
      return results
    },
    mohGrid () {
      if (
        this.$store.state.mohUnMatched.length > 0 &&
        this.mohFilter.level !== ''
      ) {
        let parentIdx =
          this.$store.state.mohUnMatched[0].parents.length -
          this.mohFilter.level
        return this.$store.state.mohUnMatched.filter(
          location => location.parents[parentIdx] === this.mohFilter.text
        )
      }
      return this.$store.state.mohUnMatched
    },
    nextLevel () {
      if (
        this.$store.state.recoLevel < this.$store.state.totalLevels &&
        this.$store.state.mohUnMatched !== null &&
        this.$store.state.mohUnMatched.length === 0 &&
        this.$store.state.flagged !== null &&
        this.$store.state.flagged.length === 0
      ) {
        return 'yes'
      } else {
        return 'no'
      }
    },
    mohTotalRecords () {
      if (this.$store.state.scoreResults) {
        return this.$store.state.scoreResults.length
      } else {
        return 0
      }
    },
    mohTotalMatched () {
      if (this.$store.state.matchedContent) {
        return this.$store.state.matchedContent.length
      } else {
        return 0
      }
    },
    mohPercentMatched () {
      if (this.mohTotalRecords === 0) {
        return 0
      } else {
        return parseFloat(
          (this.mohTotalMatched * 100 / this.mohTotalRecords).toFixed(2)
        )
      }
    },
    mohTotalUnMatched () {
      return this.mohTotalRecords - this.mohTotalMatched
    },
    mohPercentUnMatched () {
      if (this.mohTotalRecords === 0) {
        return 0
      } else {
        return parseFloat(
          (this.mohTotalUnMatched * 100 / this.mohTotalRecords).toFixed(2)
        )
      }
    },
    totalFlagged () {
      if (this.$store.state.flagged) {
        return this.$store.state.flagged.length
      } else {
        return 0
      }
    },
    mohPercentFlagged () {
      if (this.$store.state.scoreResults.length === 0) {
        return 0
      } else if (this.$store.state.flagged) {
        return parseFloat(
          (
            this.$store.state.flagged.length *
            100 /
            this.$store.state.scoreResults.length
          ).toFixed(2)
        )
      } else {
        return 0
      }
    },
    mohTotalNoMatch () {
      if (this.$store.state.noMatchContent) {
        return this.$store.state.noMatchContent.length
      } else {
        return 0
      }
    },
    mohPercentNoMatch () {
      if (this.$store.state.scoreResults.length === 0) {
        return 0
      } else if (this.$store.state.noMatchContent) {
        return parseFloat(
          (
            this.$store.state.noMatchContent.length *
            100 /
            this.$store.state.scoreResults.length
          ).toFixed(2)
        )
      } else {
        return 0
      }
    },
    datimTotalRecords () {
      if (this.$store.state.datimTotalRecords) {
        return this.$store.state.datimTotalRecords
      } else {
        return 0
      }
    },
    datimTotalUnmatched () {
      if (this.datimTotalRecords > 0 && this.$store.state.matchedContent) {
        return (
          parseInt(this.datimTotalRecords) -
          parseInt(this.$store.state.matchedContent.length)
        )
      } else {
        return 0
      }
    },
    datimPercentUnmatched () {
      if (this.$store.state.datimTotalRecords === 0) {
        return 0
      } else {
        return parseFloat(
          (
            this.datimTotalUnmatched *
            100 /
            this.$store.state.datimTotalRecords
          ).toFixed(2)
        )
      }
    },
    datimPercentFlagged () {
      if (this.$store.state.datimTotalRecords === 0) {
        return 0
      } else if (this.$store.state.flagged) {
        return parseFloat(
          (
            this.$store.state.flagged.length *
            100 /
            this.$store.state.datimTotalRecords
          ).toFixed(2)
        )
      } else {
        return 0
      }
    },
    datimTotalMatched () {
      return this.mohTotalMatched
    },
    datimPercentMatched () {
      if (this.$store.state.datimTotalRecords === 0) {
        return 0
      } else {
        return parseFloat(
          (
            this.datimTotalMatched *
            100 /
            this.$store.state.datimTotalRecords
          ).toFixed(2)
        )
      }
    },
    datimNotInMoh () {
      var missing = this.datimTotalRecords - this.mohTotalRecords
      if (missing < 0) {
        return 0
      } else {
        return missing
      }
    },
    datimPercentNotInMoh () {
      var percent = parseFloat(
        (this.datimNotInMoh * 100 / this.datimTotalRecords).toFixed(2)
      )
      return parseFloat(percent)
    }
  },
  created () {
    this.addListener()
  },
  components: {
    'liquor-tree': LiquorTree
  }
}
</script>

<style>
</style>
