<template>
  <v-container fluid>
    <template v-if='$store.state.uploadRunning'><br><br><br>
      <v-alert
        type="info"
        :value="true"
      >
        <b>Wait for upload to finish ...</b>
        <v-progress-linear
          indeterminate
          color="white"
          class="mb-0"
        ></v-progress-linear>
      </v-alert>
    </template>
    <v-container
      fluid
      grid-list-lg
      v-if='!$store.state.denyAccess & !$store.state.uploadRunning'
    >
      <v-dialog
        v-model="scoreDialog"
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
              <font style="color:blue">{{scoreProgressTitle}}</font><br>
              <v-progress-circular
                :rotate="-90"
                :size="100"
                :width="15"
                :value="scoreProgressPercent"
                color="primary"
                v-if="progressType == 'percent'"
              >
                <v-avatar
                  color="indigo"
                  size="50px"
                >
                  <span class="white--text">
                    <b>{{ scoreProgressPercent }}%</b>
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
      <v-dialog
        persistent
        v-model="alert"
        width="500px"
      >
        <v-card>
          <v-toolbar
            color="primary"
            dark
          >
            <v-toolbar-title>
              {{alertTitle}}
            </v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            {{alertText}}
          </v-card-text>
          <v-card-actions>
            <v-btn
              color="success"
              @click='alert = false'
            >OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        persistent
        v-model="flagCommentDialog"
        width="500px"
      >
        <v-card>
          <v-toolbar
            color="primary"
            dark
          >
            <v-toolbar-title>
              Add comment for this flag if any
            </v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-textarea
              v-model="flagComment"
              auto-grow
              box
              color="deep-purple"
              label="Flag Comment"
              rows="1"
            ></v-textarea>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="success"
              @click='saveMatch'
            >Continue</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        persistent
        v-model="downloadDialog"
        width="620px"
      >
        <v-card>
          <v-toolbar
            color="primary"
            dark
          >
            <v-toolbar-title>
              Select file type to download
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-icon @click='closeDownloadDialog'>close</v-icon>
          </v-toolbar>
          <v-card-text>

          </v-card-text>
          <v-card-actions>
            <v-btn
              round
              color="info"
              @click='downloadMatched'
            >
              <v-icon left>file_copy</v-icon>
              Matched
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              round
              color="info"
              @click='downloadSource1Unmatched'
            >
              <v-icon left>file_copy</v-icon>
              Source1 Unmatched
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              round
              color="info"
              @click='downloadSource2Unmatched'
            >
              <v-icon left>file_copy</v-icon>
              Source2 Unmatched
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        persistent
        transition="scale-transition"
        v-model="dialog"
        :width="dialogWidth"
      >
        <v-card :width='dialogWidth'>
          <v-toolbar
            color="primary"
            dark
          >
            <v-toolbar-title>
              Matching {{ selectedSource1Name }}
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-text-field
              v-model="searchPotential"
              append-icon="search"
              label="Search"
              single-line
              hide-details
              color="yellow"
            />
            <v-btn
              icon
              dark
              @click.native="back"
            >
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-title>
            Parents:
            <b>{{selectedSource1Parents.join('->')}}</b>
            <v-spacer></v-spacer>
            <template v-if='$store.state.recoLevel == $store.state.totalSource1Levels'>
              Latitude:
              <b>{{selectedSource1Lat}}</b>
              <v-spacer></v-spacer>
              Longitude:
              <b>{{selectedSource1Long}}</b>
              <v-spacer></v-spacer>
            </template>
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="potentialHeaders"
              :items="allPotentialMatches"
              :search="searchPotential"
              :pagination.sync="pagination"
              class="elevation-1"
            >
              <template
                slot="headers"
                slot-scope="props"
              >
                <tr>
                  <template v-for='header in potentialHeaders'>
                    <th
                      :key='header.text'
                      align='left'
                      v-if="header.text == 'Score'"
                      class="column sortable active"
                      @click="changeSort(header.value)"
                    >
                      <v-icon
                        small
                        v-if="sort_arrow == 'up'"
                      >arrow_upward</v-icon>
                      <v-icon
                        small
                        v-else
                      >arrow_downward</v-icon>
                      {{header.text}}
                      <v-tooltip top>
                        <v-btn
                          slot="activator"
                          icon
                        >
                          <v-icon>help</v-icon>
                        </v-btn>
                        <span>The lower the score, the better the match</span>
                      </v-tooltip>
                    </th>
                    <th
                      :key='header.text'
                      align='left'
                      v-else
                    >
                      {{header.text}}
                    </th>
                  </template>
                </tr>
              </template>
              <template
                slot="items"
                slot-scope="props"
              >
                <tr>
                  <td>
                    <v-tooltip top>
                      <v-btn
                        color="error"
                        small
                        @click.native="match('flag', props.item.id, props.item.name)"
                        slot="activator"
                      >
                        <v-icon
                          dark
                          left
                        >notification_important</v-icon>Flag
                      </v-btn>
                      <span>Mark the selected item as a match to be reviewed</span>
                    </v-tooltip>
                    <v-tooltip top>
                      <v-btn
                        color="primary"
                        small
                        dark
                        @click.native="match('match', props.item.id, props.item.name)"
                        slot="activator"
                      >
                        <v-icon left>thumb_up</v-icon>Save Match
                      </v-btn>
                      <span>Save the selected item as a match</span>
                    </v-tooltip>
                  </td>
                  <td>{{props.item.name}}</td>
                  <td>{{props.item.id}}</td>
                  <td>{{props.item.parents.join('->')}}</td>
                  <td v-if='$store.state.recoLevel == $store.state.totalSource1Levels'>{{props.item.geoDistance}}</td>
                  <td>{{props.item.score}}</td>
                </tr>
              </template>
            </v-data-table>
          </v-card-text>
          <v-card-actions style='float: center'>
            <v-layout
              row
              wrap
            >
              <v-flex xs2>
                <v-tooltip top>
                  <v-btn
                    color="green"
                    dark
                    @click.native="noMatch('nomatch')"
                    slot="activator"
                  >
                    <v-icon left>thumb_down</v-icon>No Match
                  </v-btn>
                  <span>Save this Source 1 location as having no match</span>
                </v-tooltip>
              </v-flex>
              <v-flex xs2>
                <v-tooltip top>
                  <v-btn
                    color="error"
                    dark
                    @click.native="noMatch('ignore')"
                    slot="activator"
                  >
                    <v-icon left>thumb_down</v-icon>Ignore
                  </v-btn>
                  <span>Save this Source 1 location as having no match</span>
                </v-tooltip>
              </v-flex>
              <v-flex xs2>
                <v-tooltip top>
                  <v-btn-toggle
                    v-if='potentialAvailable'
                    v-model="showAllPotential"
                    slot="activator"
                  >
                    <v-btn
                      color="teal darken-2"
                      round
                      style="color: white;"
                      value="all"
                    >
                      <template v-if="showAllPotential === 'all'">Show Scored Suggestions</template>
                      <template v-else>Show All Suggestions</template>
                    </v-btn>
                  </v-btn-toggle>
                  <span v-if="showAllPotential === 'all'">Limit to only scored suggestions</span>
                  <span v-else>See all possible choices ignoring the score</span>
                </v-tooltip>
              </v-flex>
              <v-flex
                xs6
                text-sm-right
              >
                <v-tooltip top>
                  <v-btn
                    color="orange darken-2"
                    @click.native="back"
                    style="color: white"
                    slot="activator"
                  >
                    <v-icon
                      dark
                      left
                    >arrow_back</v-icon>Back
                  </v-btn>
                  <span>Return without saving</span>
                </v-tooltip>
              </v-flex>
            </v-layout>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-layout
        row
        wrap
      >
        <v-btn
          color="success"
          round
          @click='csvExport'
        >
          <v-icon left>file_copy</v-icon>
          <v-progress-circular
            v-if='loadingCSV'
            indeterminate
            color="red"
          ></v-progress-circular>
          CSV Export
        </v-btn>
        <v-btn
          color="success"
          round
          @click='fhirExport'
        >
          <v-icon left>file_copy</v-icon>
          <v-progress-circular
            v-if='loadingFHIR'
            indeterminate
            color="red"
          ></v-progress-circular>
          FHIR Export
        </v-btn>
        <v-spacer></v-spacer>
        <b>Reconciling {{currentLevelText}}</b>
        <v-spacer></v-spacer>
        <v-flex
          xs1
          sm2
          md2
          right
        >
          <v-select
            :items="$store.state.levelArray"
            v-model="$store.state.recoLevel"
            :item-value='$store.state.levelArray.value'
            :item-name='$store.state.levelArray.text'
            label="Level"
            single-line
            @change="levelChanged"
          >
          </v-select>
        </v-flex>
        <v-flex xs1>
          <v-btn
            slot="activator"
            color="primary"
            dark
            @click="getScores"
            round
          >
            <v-icon>repeat_one</v-icon> Recalculate Scores
          </v-btn>
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
            This page let you map source 1 data with those in source2
            <v-list>
              1. Source 1 refer to the data source name selected as source 1 under data source pair section
            </v-list>
            <v-list>
              2. Source 2 refer to the data source name selected as source 2 under data source pair section
            </v-list>
            <v-list>
              3. After breaking a match, you will need to recalculate scores for the app to load potential matches of the broken location
            </v-list>
            <v-list>
              4. FLAGGED Locations are the locations that will need to be reviewed before they are saved as matches
            </v-list>
            <v-list>
              5. NO MATCHES - these are locations that do not matches anything from source 2
            </v-list>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-layout
        row
        wrap
      >
        <v-flex
          xs2
          right
        >
          <div style="border-style: solid;border-color:green; text-align: center;">
            <b>Source 1 Reconciliation Status</b>

            <v-layout
              row
              wrap
            >
              <v-flex xs6>
                <v-layout column>
                  <v-flex>
                    <b>Matched</b>
                  </v-flex>
                  <v-flex align-center>
                    <center>
                      <b>{{source1TotalMatched}}/{{source1TotalRecords}}</b>
                    </center>
                  </v-flex>
                  <v-flex>
                    <center>
                      <v-progress-circular
                        :rotate="-90"
                        :size="65"
                        :width="8"
                        :value="source1PercentMatched"
                        color="green"
                      >
                        <font color="black">
                          <b>{{ source1PercentMatched }}%</b>
                        </font>
                      </v-progress-circular>
                    </center>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex xs6>
                <v-layout column>
                  <v-flex align-center>
                    <b>Unmatched</b>
                  </v-flex>
                  <v-flex xs1>
                    <center>
                      <b>{{source1TotalUnMatched}}/{{source1TotalRecords}}</b>
                    </center>
                  </v-flex>
                  <v-flex
                    xs1
                    align-center
                  >
                    <center>
                      <v-progress-circular
                        :rotate="-90"
                        :size="65"
                        :width="8"
                        :value="source1PercentUnMatched"
                        color="red"
                      >
                        <font color="black">
                          <b>{{source1PercentUnMatched}}%</b>
                        </font>
                      </v-progress-circular>
                    </center>
                  </v-flex>
                </v-layout>
              </v-flex>
            </v-layout>
            <v-layout
              row
              wrap
            >
              <v-flex xs6>
                <v-layout column>
                  <v-flex align-center>
                    <b>Flagged</b>
                  </v-flex>
                  <v-flex xs1>
                    <center>
                      <b>{{totalFlagged}}/{{source1TotalRecords}}</b>
                    </center>
                  </v-flex>
                  <v-flex
                    xs1
                    align-center
                  >
                    <center>
                      <v-progress-circular
                        :rotate="-90"
                        :size="65"
                        :width="8"
                        :value="source1PercentFlagged"
                        color="orange"
                      >
                        <font color="black">
                          <b>{{source1PercentFlagged}}%</b>
                        </font>
                      </v-progress-circular>
                    </center>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex xs6>
                <v-layout column>
                  <v-flex align-center>
                    <b>No Match</b>
                  </v-flex>
                  <v-flex xs1>
                    <center>
                      <b>{{source1TotalNoMatch}}/{{source1TotalRecords}}</b>
                    </center>
                  </v-flex>
                  <v-flex
                    xs1
                    align-center
                  >
                    <center>
                      <v-progress-circular
                        :rotate="-90"
                        :size="65"
                        :width="8"
                        :value="source1PercentNoMatch"
                        color="red"
                      >
                        <font color="black">
                          <b>{{source1PercentNoMatch}}%</b>
                        </font>
                      </v-progress-circular>
                    </center>
                  </v-flex>
                </v-layout>
              </v-flex>
            </v-layout>
          </div>
        </v-flex>
        <v-flex
          xs4
          child-flex
        >
          <v-card color="green lighten-2">
            <v-card-title primary-title>
              Source 1 Unmatched
              <v-spacer></v-spacer>
              <v-text-field
                v-model="searchUnmatchedSource1"
                append-icon="search"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
            </v-card-title>
            <template v-if='!loadingSource1Unmatched'>
              <liquor-tree
                :data="source1Tree"
                ref="source1Tree"
                :key="source1TreeUpdate"
              />
              <v-data-table
                :headers="source1GridHeaders"
                :items="source1Grid"
                :search="searchUnmatchedSource1"
                light
                class="elevation-1"
              >
                <template
                  slot="items"
                  slot-scope="props"
                >
                  <td
                    v-if="$store.state.recoStatus === 'Done'"
                    :key='props.item.id'
                  >{{props.item.name}}</td>
                  <td
                    v-else
                    @click="getPotentialMatch(props.item.id)"
                    style="cursor: pointer"
                    :key='props.item.id'
                  >{{props.item.name}}</td>
                  <td
                    v-for="(parent,index) in props.item.parents"
                    v-if='index !=props.item.parents.length-1'
                    :key='props.item.id+index'
                  >
                    {{parent}}
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-else>
              <v-progress-linear
                :size="70"
                indeterminate
                color="amber"
              ></v-progress-linear>
            </template>
          </v-card>
        </v-flex>
        <v-flex xs4>
          <v-card
            color="blue lighten-2"
            dark
          >
            <v-card-title primary-title>
              Source 2 Unmatched
              <v-spacer></v-spacer>
              <v-text-field
                v-model="searchUnmatchedSource2"
                append-icon="search"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
            </v-card-title>
            <template v-if='!loadingSource2Unmatched'>
              <v-data-table
                :headers="source1UnmatchedHeaders"
                :items="$store.state.source2UnMatched"
                :search="searchUnmatchedSource2"
                light
                class="elevation-1"
              >
                <template
                  slot="items"
                  slot-scope="props"
                >
                  <td>{{props.item.name}} <br>&ensp;&ensp;{{props.item.parents | removeCountry | joinParents}}</td>
                </template>
              </v-data-table>
            </template>
            <template v-else>
              <v-progress-linear
                :size="70"
                indeterminate
                color="amber"
              ></v-progress-linear>
            </template>
          </v-card>
        </v-flex>

        <v-flex
          xs2
          right
        >
          <div style='border-style: solid;border-color: green; text-align: center;'>
            <b>Source 2 Reconciliation Status</b>
            <v-layout
              row
              wrap
            >
              <v-flex xs6>
                <v-layout column>
                  <v-flex align-center>
                    <b>Matched</b>
                  </v-flex>
                  <v-flex xs1>
                    <center>
                      <b>{{source2TotalMatched}}/{{source2TotalRecords}}</b>
                    </center>
                  </v-flex>
                  <v-flex
                    xs1
                    align-center
                  >
                    <center>
                      <v-progress-circular
                        :rotate="-90"
                        :size="65"
                        :width="8"
                        :value="source2PercentMatched"
                        color="green"
                      >
                        <font color="black">
                          <b>{{source2PercentMatched}}%</b>
                        </font>
                      </v-progress-circular>
                    </center>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex xs6>
                <v-layout column>
                  <v-flex xs1>
                    <b>Unmatched</b>
                  </v-flex>
                  <v-flex
                    xs1
                    align-center
                  >
                    <center>
                      <b>{{source2TotalUnmatched}}/{{source2TotalRecords}}</b>
                    </center>
                  </v-flex>
                  <v-flex xs1>
                    <center>
                      <v-progress-circular
                        :rotate="-90"
                        :size="65"
                        :width="8"
                        :value="source2PercentUnmatched"
                        color="red"
                      >
                        <font color="black">
                          <b>{{ source2PercentUnmatched }}%</b>
                        </font>
                      </v-progress-circular>
                    </center>
                  </v-flex>
                </v-layout>
              </v-flex>
            </v-layout>
            <v-layout
              row
              wrap
            >
              <v-flex xs6>
                <v-layout column>
                  <v-flex align-center>
                    <b>Flagged</b>
                  </v-flex>
                  <v-flex xs1>
                    <center>
                      <b>{{totalFlagged}}/{{source2TotalRecords}}</b>
                    </center>
                  </v-flex>
                  <v-flex
                    xs1
                    align-center
                  >
                    <center>
                      <v-progress-circular
                        :rotate="-90"
                        :size="65"
                        :width="8"
                        :value="source2PercentFlagged"
                        color="orange"
                      >
                        <font color="black">
                          <b>{{source2PercentFlagged}}%</b>
                        </font>
                      </v-progress-circular>
                    </center>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex xs6>
                <v-layout column>
                  <v-flex align-center>
                    <b>Not in Source 1</b>
                  </v-flex>
                  <v-flex xs1>
                    <center>
                      <b>{{source2NotInSource1}}</b>
                    </center>
                  </v-flex>
                  <v-flex
                    xs1
                    align-center
                  >
                    <center>
                      <v-progress-circular
                        :rotate="-90"
                        :size="65"
                        :width="8"
                        :value="source2PercentNotInSource1"
                        color="red"
                      >
                        <font color="black">
                          <b>{{source2PercentNotInSource1}}%</b>
                        </font>
                      </v-progress-circular>
                    </center>
                  </v-flex>
                </v-layout>
              </v-flex>
            </v-layout>
          </div>
        </v-flex>
      </v-layout>
      <v-layout
        column
        wrap
      >
        <v-tabs
          icons-and-text
          centered
          grow
          dark
          color="cyan"
        >
          <v-tabs-slider color="red"></v-tabs-slider>
          <v-tab key="match">
            MATCHED ({{source1TotalMatched}})
            <v-icon
              color="white"
              right
            >thumb_up</v-icon>
          </v-tab>
          <v-tab key="nomatch">
            NO MATCH ({{source1TotalNoMatch}})
            <v-icon
              color="white"
              right
            >thumb_down</v-icon>
          </v-tab>
          <v-tab key="ignore">
            IGNORED ({{source1TotalIgnore}})
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
            <template v-if='$store.state.matchedContent != null'>
              <v-text-field
                v-model="searchMatched"
                append-icon="search"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
              <v-data-table
                :headers="matchedHeaders"
                :items="$store.state.matchedContent"
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
                  <td v-if='props.item.matchComments'>{{props.item.matchComments.join(', ')}}</td>
                  <td v-else></td>
                  <td>
                    <v-btn
                      v-if="$store.state.recoStatus == 'Done'"
                      disabled
                      color="error"
                      style='text-transform: none'
                      small
                      @click='breakMatch(props.item.source1Id)'
                    >
                      <v-icon>undo</v-icon>Break Match
                    </v-btn>
                    <v-btn
                      v-else
                      color="error"
                      style='text-transform: none'
                      small
                      @click='breakMatch(props.item.source1Id)'
                    >
                      <v-icon>undo</v-icon>Break Match
                    </v-btn>
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-else>
              <v-progress-linear
                :size="70"
                indeterminate
                color="amber"
              ></v-progress-linear>
            </template>
          </v-tab-item>
          <v-tab-item key="nomatch">
            <template v-if='$store.state.noMatchContent != null'>
              <v-text-field
                v-model="searchNotMatched"
                append-icon="search"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
              <v-data-table
                :headers="noMatchHeaders"
                :items="$store.state.noMatchContent"
                :search="searchNotMatched"
                class="elevation-1"
              >
                <template
                  slot="items"
                  slot-scope="props"
                >
                  <td>{{props.item.source1Name}}</td>
                  <td>{{props.item.source1Id}}</td>
                  <td>{{props.item.parents.join('->')}}</td>
                  <td>
                    <v-btn
                      v-if="$store.state.recoStatus == 'Done'"
                      disabled
                      color="error"
                      style='text-transform: none'
                      small
                      @click='breakNoMatch(props.item.source1Id, "nomatch")'
                    >
                      <v-icon>cached</v-icon>Break No Match
                    </v-btn>
                    <v-btn
                      v-else
                      color="error"
                      style='text-transform: none'
                      small
                      @click='breakNoMatch(props.item.source1Id, "nomatch")'
                    >
                      <v-icon>cached</v-icon>Break No Match
                    </v-btn>
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-else>
              <v-progress-linear
                :size="70"
                indeterminate
                color="amber"
              ></v-progress-linear>
            </template>
          </v-tab-item>
          <v-tab-item key="ignore">
            <template v-if='$store.state.ignoreContent != null'>
              <v-text-field
                v-model="searchIgnore"
                append-icon="search"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
              <v-data-table
                :headers="noMatchHeaders"
                :items="$store.state.ignoreContent"
                :search="searchIgnore"
                class="elevation-1"
              >
                <template
                  slot="items"
                  slot-scope="props"
                >
                  <td>{{props.item.source1Name}}</td>
                  <td>{{props.item.source1Id}}</td>
                  <td>{{props.item.parents.join('->')}}</td>
                  <td>
                    <v-btn
                      v-if="$store.state.recoStatus == 'Done'"
                      disabled
                      color="error"
                      style='text-transform: none'
                      small
                      @click='breakNoMatch(props.item.source1Id, "ignore")'
                    >
                      <v-icon>cached</v-icon>Break Ignore
                    </v-btn>
                    <v-btn
                      v-else
                      color="error"
                      style='text-transform: none'
                      small
                      @click='breakNoMatch(props.item.source1Id, "ignore")'
                    >
                      <v-icon>cached</v-icon>Break Ignore
                    </v-btn>
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-else>
              <v-progress-linear
                :size="70"
                indeterminate
                color="amber"
              ></v-progress-linear>
            </template>
          </v-tab-item>
          <v-tab-item key="flagged">
            <template v-if='$store.state.flagged != null'>
              <v-text-field
                v-model="searchFlagged"
                append-icon="search"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
              <v-data-table
                :headers="flaggedHeaders"
                :items="$store.state.flagged"
                :search="searchFlagged"
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
                  <td>{{props.item.flagComment}}</td>
                  <td>
                    <v-btn
                      v-if="$store.state.recoStatus == 'Done'"
                      disabled
                      color="primary"
                      style='text-transform: none'
                      small
                      @click='acceptFlag(props.item.source1Id)'
                    >
                      <v-icon>thumb_up</v-icon>Confirm Match
                    </v-btn>
                    <v-btn
                      v-else
                      color="primary"
                      style='text-transform: none'
                      small
                      @click='acceptFlag(props.item.source1Id)'
                    >
                      <v-icon>thumb_up</v-icon>Confirm Match
                    </v-btn>
                    <v-btn
                      v-if="$store.state.recoStatus == 'Done'"
                      disabled
                      color="error"
                      style='text-transform: none'
                      small
                      @click='unFlag(props.item.source1Id)'
                    >
                      <v-icon>cached</v-icon>Release
                    </v-btn>
                    <v-btn
                      v-else
                      color="error"
                      style='text-transform: none'
                      small
                      @click='unFlag(props.item.source1Id)'
                    >
                      <v-icon>cached</v-icon>Release
                    </v-btn>
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-else>
              <v-progress-linear
                :size="70"
                indeterminate
                color="amber"
              />
            </template>
          </v-tab-item>
        </v-tabs>
      </v-layout>
      <v-layout>
        <v-flex
          xs1
          sm4
          md2
          v-if="goNextLevel == 'yes'"
        >
          <v-btn
            color="primary"
            round
            @click='levelChanged($store.state.recoLevel+1)'
          >
            <v-icon>forward</v-icon>Proceed to {{nextLevelText}}
          </v-btn>
        </v-flex>
        <v-flex
          xs1
          sm4
          md2
          v-if="lastLevelDone == 'yes'"
        >
          <v-btn
            color="primary"
            round
            @click='$router.push({name:"FacilityRecoStatus"})'
          >
            <v-icon>dashboard</v-icon>Reconciliation Status
          </v-btn>
        </v-flex>
      </v-layout>
    </v-container>
  </v-container>
</template>
<script>
import axios from 'axios'
import LiquorTree from 'liquor-tree'
import { scoresMixin } from '../mixins/scoresMixin'
import { generalMixin } from '../mixins/generalMixin'
import { eventBus } from '../main'

const backendServer = process.env.BACKEND_SERVER

export default {
  mixins: [scoresMixin, generalMixin],
  data () {
    return {
      scoreDialog: false,
      flagCommentDialog: false,
      flagComment: '',
      matchedDownloadData: '',
      unmatchedSource1DownloadData: '',
      unmatchedSource2DownloadData: '',
      downloadType: '',
      downloadDialog: false,
      helpDialog: false,
      type: '',
      source2Id: '',
      source2Name: '',
      sort_arrow: 'up',
      pagination: { sortBy: 'score' },
      recoLevel: 0,
      searchUnmatchedSource2: '',
      searchUnmatchedSource1: '',
      searchPotential: '',
      searchMatched: '',
      searchNotMatched: '',
      searchIgnore: '',
      searchFlagged: '',
      potentialMatches: [],
      showAllPotential: null,
      alertText: '',
      alertTitle: '',
      alert: false,
      source1Parents: {},
      source1Filter: { text: '', level: '' },
      source1TreeUpdate: 0,
      selectedSource1Name: null,
      selectedSource1Id: null,
      selectedSource1Lat: null,
      selectedSource1Long: null,
      selectedSource1Parents: [],
      dialog: false,
      dialogWidth: '',
      source1UnmatchedHeaders: [{ text: 'Location', value: 'name' }],
      noMatchHeaders: [
        { text: 'Source 1 Location', value: 'source1Name' },
        { text: 'Source 1 ID', value: 'source1Id' },
        { text: 'Parents', value: 'parents' }
      ],
      flaggedHeaders: [
        { text: 'Source 1 Location', value: 'source1Name' },
        { text: 'Source 1 ID', value: 'source1Id' },
        { text: 'Source 2 Location', value: 'source2Name' },
        { text: 'Source 2 ID', value: 'source2Id' },
        { text: 'Comment', value: 'flagComment' }
      ],
      loadingCSV: false,
      loadingFHIR: false
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
      } else {
        this.sort_arrow = 'up'
      }
    },
    addListener () {
      const setListener = () => {
        if (this.$refs && this.$refs.source1Tree) {
          this.$refs.source1Tree.$on('node:selected', node => {
            this.source1Filter.text = node.data.text
            let level = 1
            while (node.parent) {
              node = node.parent
              level++
            }
            this.source1Filter.level = level
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
      if (this.$store.state.recoLevel === level) {
        return
      }
      this.$store.state.recoLevel = level
      this.getScores()
      if (
        this.$store.state.recoLevel === this.$store.state.totalSource1Levels
      ) {
        this.dialogWidth = '1440px'
      } else {
        this.dialogWidth = '1190px'
      }
    },
    getPotentialMatch (id) {
      this.potentialMatches = []
      this.showAllPotential = null
      for (let scoreResult of this.$store.state.scoreResults) {
        if (scoreResult.source1.id === id) {
          this.selectedSource1Name = scoreResult.source1.name
          this.selectedSource1Parents = scoreResult.source1.parents
          this.selectedSource1Lat = scoreResult.source1.lat
          this.selectedSource1Long = scoreResult.source1.long
          this.selectedSource1Id = scoreResult.source1.id
          for (let score in scoreResult.potentialMatches) {
            for (let j in scoreResult.potentialMatches[score]) {
              let potentials = scoreResult.potentialMatches[score][j]
              var matched = this.$store.state.matchedContent.find(matched => {
                return matched.source2Id === potentials.id
              })
              var flagged = this.$store.state.flagged.find(flagged => {
                return flagged.source2Id === potentials.id
              })
              if (matched) {
                continue
              }
              if (flagged) {
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
    match (type, source2Id, source2Name) {
      this.matchType = type
      this.source2Id = source2Id
      this.source2Name = source2Name
      if (source2Id === null) {
        this.alert = true
        this.alertTitle = 'Information'
        this.alertText = 'Select Source 2 Location to match against Source 1 Location'
        return
      }
      if (type === 'flag') {
        this.flagCommentDialog = true
      } else {
        this.saveMatch()
      }
    },
    saveMatch () {
      this.flagCommentDialog = false
      this.$store.state.progressTitle = 'Saving match'
      this.$store.state.dynamicProgress = true
      let sourcesOwner = this.getDatasourceOwner()
      let formData = new FormData()
      formData.append('source1Id', this.selectedSource1Id)
      formData.append('source2Id', this.source2Id)
      formData.append('source1Owner', sourcesOwner.source1Owner)
      formData.append('source2Owner', sourcesOwner.source2Owner)
      formData.append('flagComment', this.flagComment)
      formData.append('source1DB', this.getSource1())
      formData.append('source2DB', this.getSource2())
      formData.append('recoLevel', this.$store.state.recoLevel)
      formData.append('totalLevels', this.$store.state.totalSource1Levels)
      formData.append('userID', this.$store.state.activePair.userID._id)
      axios
        .post(backendServer + '/match/' + this.matchType, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(response => {
          this.$store.state.dynamicProgress = false
          // remove from Source 2 Unmatched
          let source2Parents = null
          for (let k in this.$store.state.source2UnMatched) {
            if (this.$store.state.source2UnMatched[k].id === this.source2Id) {
              source2Parents = this.$store.state.source2UnMatched[k].parents
              this.$store.state.source2UnMatched.splice(k, 1)
            }
          }

          // Add from a list of Source 1 Matched and remove from list of Source 1 unMatched
          for (let k in this.$store.state.source1UnMatched) {
            if (
              this.$store.state.source1UnMatched[k].id ===
              this.selectedSource1Id
            ) {
              if (this.matchType === 'match') {
                ++this.$store.state.totalAllMapped
                this.$store.state.matchedContent.push({
                  source1Name: this.selectedSource1Name,
                  source1Id: this.selectedSource1Id,
                  source1Parents: this.$store.state.source1UnMatched[k].parents,
                  source2Name: this.source2Name,
                  source2Id: this.source2Id,
                  source2Parents: source2Parents,
                  matchComments: response.data.matchComments
                })
              } else if (this.matchType === 'flag') {
                ++this.$store.state.totalAllFlagged
                this.$store.state.flagged.push({
                  source1Name: this.selectedSource1Name,
                  source1Id: this.selectedSource1Id,
                  source1Parents: this.$store.state.source1UnMatched[k].parents,
                  source2Name: this.source2Name,
                  source2Id: this.source2Id,
                  source2Parents: source2Parents,
                  flagComment: this.flagComment
                })
              }
              this.$store.state.source1UnMatched.splice(k, 1)
            }
          }
          this.flagComment = ''
          this.selectedSource1Id = null
          this.selectedSource1Name = null
          this.dialog = false
        })
        .catch(err => {
          this.flagComment = ''
          this.$store.state.dynamicProgress = false
          this.alert = true
          this.alertTitle = 'Error'
          this.alertText = err.response.data.error
          this.selectedSource1Id = null
          this.selectedSource1Name = null
          this.dialog = false
        })
    },
    acceptFlag (source1Id) {
      this.$store.state.progressTitle = 'Accepting flag'
      this.$store.state.dynamicProgress = true
      let formData = new FormData()
      formData.append('source1Id', source1Id)
      let userID = this.$store.state.activePair.userID._id
      axios
        .post(backendServer + '/acceptFlag/' + this.getSource1() + '/' + this.getSource2() + '/' + userID, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(() => {
          this.$store.state.dynamicProgress = false
          // Add from a list of Source 1 Matched and remove from list of Flagged
          for (let k in this.$store.state.flagged) {
            if (this.$store.state.flagged[k].source1Id === source1Id) {
              this.$store.state.matchedContent.push({
                source1Name: this.$store.state.flagged[k].source1Name,
                source1Id: this.$store.state.flagged[k].source1Id,
                source1Parents: this.$store.state.flagged[k].source1Parents,
                source2Name: this.$store.state.flagged[k].source2Name,
                source2Id: this.$store.state.flagged[k].source2Id,
                source2Parents: this.$store.state.flagged[k].source2Parents
              })
              this.$store.state.flagged.splice(k, 1)
              ++this.$store.state.totalAllMapped
              --this.$store.state.totalAllFlagged
            }
          }
        })
        .catch(err => {
          this.$store.state.dynamicProgress = false
          this.alert = true
          this.alertTitle = 'Error'
          this.alertText = err.response.data.error
          this.selectedSource1Id = null
          this.selectedSource1Name = null
          this.dialog = false
          console.log(err)
        })
    },
    breakMatch (source1Id) {
      this.$store.state.progressTitle = 'Breaking match'
      this.$store.state.dynamicProgress = true
      let formData = new FormData()
      let userID = this.$store.state.activePair.userID._id
      let sourcesOwner = this.getDatasourceOwner()
      formData.append('source1Id', source1Id)
      axios
        .post(
          backendServer +
          '/breakMatch/' +
          this.getSource1() +
          '/' +
          this.getSource2() +
          '/' +
          sourcesOwner.source1Owner +
          '/' +
          sourcesOwner.source2Owner +
          '/' +
          userID,
          formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        )
        .then(data => {
          this.$store.state.dynamicProgress = false
          this.alert = true
          this.alertTitle = 'Information'
          this.alertText =
            'Scores for this Location may not be available unless you recalculate scores'
          for (let k in this.$store.state.matchedContent) {
            if (this.$store.state.matchedContent[k].source1Id === source1Id) {
              this.$store.state.source1UnMatched.push({
                name: this.$store.state.matchedContent[k].source1Name,
                id: this.$store.state.matchedContent[k].source1Id,
                parents: this.$store.state.matchedContent[k].source1Parents
              })
              this.$store.state.source2UnMatched.push({
                name: this.$store.state.matchedContent[k].source2Name,
                id: this.$store.state.matchedContent[k].source2Id,
                parents: this.$store.state.matchedContent[k].source2Parents
              })
              this.$store.state.matchedContent.splice(k, 1)
              --this.$store.state.totalAllMapped
            }
          }
        })
        .catch(err => {
          this.$store.state.dynamicProgress = false
          this.alert = true
          this.alertTitle = 'Error'
          this.alertText = err.response.data.error
          this.selectedSource1Id = null
          this.selectedSource1Name = null
          this.dialog = false
          console.log(err)
        })
    },
    unFlag (source1Id) {
      this.$store.state.progressTitle = 'Unflagging match'
      this.$store.state.dynamicProgress = true
      let formData = new FormData()
      let userID = this.$store.state.activePair.userID._id
      let sourcesOwner = this.getDatasourceOwner()
      formData.append('source1Id', source1Id)
      axios
        .post(
          backendServer +
          '/breakMatch/' +
          this.getSource1() +
          '/' +
          this.getSource2() +
          '/' +
          sourcesOwner.source1Owner +
          '/' +
          sourcesOwner.source2Owner +
          '/' +
          userID,
          formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        )
        .then(data => {
          this.$store.state.dynamicProgress = false
          this.alert = true
          this.alertTitle = 'Information'
          this.alertText =
            'Scores for this Location may not be available unless you recalculate scores'
          for (let k in this.$store.state.flagged) {
            if (this.$store.state.flagged[k].source1Id === source1Id) {
              this.$store.state.source1UnMatched.push({
                name: this.$store.state.flagged[k].source1Name,
                id: this.$store.state.flagged[k].source1Id,
                parents: this.$store.state.flagged[k].source1Parents
              })
              this.$store.state.source2UnMatched.push({
                name: this.$store.state.flagged[k].source2Name,
                id: this.$store.state.flagged[k].source2Id,
                parents: this.$store.state.flagged[k].source2Parents
              })
              this.$store.state.flagged.splice(k, 1)
              --this.$store.state.totalAllFlagged
            }
          }
        })
        .catch(err => {
          this.$store.state.dynamicProgress = false
          this.alert = true
          this.alertTitle = 'Error'
          this.alertText = err.response.data.error
          this.selectedSource1Id = null
          this.selectedSource1Name = null
          this.dialog = false
          console.log(err)
        })
    },
    breakNoMatch (source1Id, type) {
      this.$store.state.progressTitle = 'Breaking no match'
      this.$store.state.dynamicProgress = true
      let formData = new FormData()
      formData.append('source1Id', source1Id)
      formData.append('recoLevel', this.$store.state.recoLevel)
      formData.append('totalLevels', this.$store.state.totalSource1Levels)
      let userID = this.$store.state.activePair.userID._id
      axios
        .post(
          backendServer +
          '/breakNoMatch/' +
          type +
          '/' +
          this.getSource1() +
          '/' +
          this.getSource2() +
          '/' +
          userID,
          formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        )
        .then(data => {
          this.$store.state.dynamicProgress = false
          this.alert = true
          this.alertTitle = 'Information'
          this.alertText =
            'Scores for this Location may not be available unless you recalculate scores'
          if (type === 'nomatch') {
            for (let k in this.$store.state.noMatchContent) {
              if (this.$store.state.noMatchContent[k].source1Id === source1Id) {
                this.$store.state.source1UnMatched.push({
                  name: this.$store.state.noMatchContent[k].source1Name,
                  id: this.$store.state.noMatchContent[k].source1Id,
                  parents: this.$store.state.noMatchContent[k].parents
                })
                this.$store.state.noMatchContent.splice(k, 1)
                --this.$store.state.totalAllNoMatch
              }
            }
          } else if (type === 'ignore') {
            for (let k in this.$store.state.ignoreContent) {
              if (this.$store.state.ignoreContent[k].source1Id === source1Id) {
                this.$store.state.source1UnMatched.push({
                  name: this.$store.state.ignoreContent[k].source1Name,
                  id: this.$store.state.ignoreContent[k].source1Id,
                  parents: this.$store.state.ignoreContent[k].parents
                })
                this.$store.state.ignoreContent.splice(k, 1)
                --this.$store.state.totalAllIgnore
              }
            }
          }
        })
        .catch(err => {
          this.$store.state.dynamicProgress = false
          this.alert = true
          this.alertTitle = 'Error'
          this.alertText = err.response.data.error
          this.selectedSource1Id = null
          this.selectedSource1Name = null
          this.dialog = false
          console.log(err)
        })
    },
    noMatch (type) {
      this.$store.state.progressTitle = 'Saving as no match'
      this.$store.state.dynamicProgress = true
      let userID = this.$store.state.activePair.userID._id
      let sourcesOwner = this.getDatasourceOwner()
      let source1Owner = sourcesOwner.source1Owner
      let source2Owner = sourcesOwner.source2Owner
      let formData = new FormData()
      formData.append('source1Id', this.selectedSource1Id)
      formData.append('recoLevel', this.$store.state.recoLevel)
      formData.append('totalLevels', this.$store.state.totalSource1Levels)

      axios
        .post(backendServer + `/noMatch/${type}/${this.getSource1()}/${this.getSource2()}/${source1Owner}/${source2Owner}/${userID}`,
          formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        )
        .then(() => {
          this.$store.state.dynamicProgress = false
          // remove from Source 1 Unmatched
          if (type === 'nomatch') {
            for (let k in this.$store.state.source1UnMatched) {
              if (
                this.$store.state.source1UnMatched[k].id ===
                this.selectedSource1Id
              ) {
                this.$store.state.noMatchContent.push({
                  source1Name: this.selectedSource1Name,
                  source1Id: this.selectedSource1Id,
                  parents: this.$store.state.source1UnMatched[k].parents
                })
                ++this.$store.state.totalAllNoMatch
                this.$store.state.source1UnMatched.splice(k, 1)
              }
            }
          } else if (type === 'ignore') {
            for (let k in this.$store.state.source1UnMatched) {
              if (
                this.$store.state.source1UnMatched[k].id ===
                this.selectedSource1Id
              ) {
                this.$store.state.ignoreContent.push({
                  source1Name: this.selectedSource1Name,
                  source1Id: this.selectedSource1Id,
                  parents: this.$store.state.source1UnMatched[k].parents
                })
                ++this.$store.state.totalAllIgnore
                this.$store.state.source1UnMatched.splice(k, 1)
              }
            }
          }
          this.dialog = false
          this.selectedSource1Id = null
          this.selectedSource1Name = null
        })
        .catch(err => {
          this.$store.state.dynamicProgress = false
          this.alert = true
          this.alertTitle = 'Error'
          this.alertText = err.response.data.error
          this.dialog = false
          this.selectedSource1Id = null
          this.selectedSource1Name = null
        })
    },
    back () {
      this.searchPotential = ''
      this.dialog = false
    },
    matchedLocations (type) {
      let userID = this.$store.state.activePair.userID._id
      let source1 = this.getSource1()
      let source2 = this.getSource2()
      let sourcesOwner = this.getDatasourceOwner()
      let source1Owner = sourcesOwner.source1Owner
      let source2Owner = sourcesOwner.source2Owner
      let levelMapping1 = JSON.stringify(this.$store.state.levelMapping.source1)
      let levelMapping2 = JSON.stringify(this.$store.state.levelMapping.source2)
      let source1LimitOrgId = this.getLimitOrgIdOnActivePair().source1LimitOrgId
      let source2LimitOrgId = this.getLimitOrgIdOnActivePair().source2LimitOrgId
      let params = {
        source1,
        source2,
        source1Owner,
        source2Owner,
        type,
        userID,
        source1LimitOrgId,
        source2LimitOrgId,
        levelMapping1,
        levelMapping2
      }
      return axios.get(backendServer + '/matchedLocations', { params })
    },
    unMatchedLocations (type) {
      let userID = this.$store.state.activePair.userID._id
      let sourcesOwner = this.getDatasourceOwner()
      let source1Owner = sourcesOwner.source1Owner
      let source2Owner = sourcesOwner.source2Owner
      let levelMapping1 = this.$store.state.levelMapping.source1
      let levelMapping2 = this.$store.state.levelMapping.source2
      let source1LimitOrgId = this.getLimitOrgIdOnActivePair().source1LimitOrgId
      let source2LimitOrgId = this.getLimitOrgIdOnActivePair().source2LimitOrgId
      let source1 = this.getSource1()
      let source2 = this.getSource2()
      let params = {
        source1,
        source2,
        source1Owner,
        source2Owner,
        type,
        userID,
        source1LimitOrgId,
        source2LimitOrgId,
        levelMapping1,
        levelMapping2
      }
      return axios.get(backendServer + '/unmatchedLocations', { params })
    },
    csvExport () {
      this.loadingCSV = true
      let me = this
      axios
        .all([this.matchedLocations('CSV'), this.unMatchedLocations('CSV')])
        .then(
          axios.spread(function (matchResponse, unmatchResponse) {
            me.loadingCSV = false
            me.downloadDialog = true
            me.downloadType = 'csv'
            // matched CSV
            me.matchedDownloadData = matchResponse.data
            me.unmatchedSource1DownloadData = unmatchResponse.data.unmatchedSource1CSV
            me.unmatchedSource2DownloadData = unmatchResponse.data.unmatchedSource2CSV
          })
        )
    },
    fhirExport () {
      this.loadingFHIR = true
      let me = this
      axios
        .all([this.matchedLocations('FHIR'), this.unMatchedLocations('FHIR')])
        .then(
          axios.spread(function (matchResponse, unmatchResponse) {
            me.loadingFHIR = false
            me.downloadDialog = true
            me.downloadType = 'fhir'
            // matched CSV
            me.matchedDownloadData = matchResponse.data
            me.unmatchedSource1DownloadData = unmatchResponse.data.unmatchedSource1mCSD
            me.unmatchedSource2DownloadData = unmatchResponse.data.unmatchedSource2mCSD
          })
        )
    },
    downloadMatched () {
      let extension, encoding
      if (this.downloadType === 'fhir') {
        extension = 'json'
        encoding = 'data:text/json;charset=utf-8,'
        this.matchedDownloadData = JSON.stringify(this.matchedDownloadData)
      } else {
        extension = 'csv'
        encoding = 'data:text/csv;charset=utf-8,'
      }
      const matchedData = encodeURI(
        encoding + this.matchedDownloadData
      )
      const link = document.createElement('a')
      link.setAttribute('href', matchedData)
      link.setAttribute(
        'download',
        `matched${this.getSource1()}${this.getSource2()}.${extension}`
      )
      link.click()
    },
    downloadSource1Unmatched () {
      let extension, encoding
      if (this.downloadType === 'fhir') {
        extension = 'json'
        encoding = 'data:text/json;charset=utf-8,'
        this.unmatchedSource1DownloadData = JSON.stringify(this.unmatchedSource1DownloadData)
      } else {
        extension = 'csv'
        encoding = 'data:text/csv;charset=utf-8,'
      }
      const unmatchedSource1Data = encodeURI(
        encoding + this.unmatchedSource1DownloadData
      )
      const link = document.createElement('a')
      link.setAttribute('href', unmatchedSource1Data)
      link.setAttribute('download', `unmatched${this.getSource1()}.${extension}`)
      link.click()
    },
    downloadSource2Unmatched () {
      let extension, encoding
      if (this.downloadType === 'fhir') {
        extension = 'json'
        encoding = 'data:text/json;charset=utf-8,'
        this.unmatchedSource2DownloadData = JSON.stringify(this.unmatchedSource2DownloadData)
      } else {
        extension = 'csv'
        encoding = 'data:text/csv;charset=utf-8,'
      }
      const unmatchedSource2Data = encodeURI(
        encoding + this.unmatchedSource2DownloadData
      )
      const link = document.createElement('a')
      link.setAttribute('href', unmatchedSource2Data)
      link.setAttribute('download', `unmatched${this.getSource2()}.${extension}`)
      link.click()
    },
    closeDownloadDialog () {
      this.downloadDialog = false
      this.matchedDownloadData = ''
      this.unmatchedSource1DownloadData = ''
      this.unmatchedSource2DownloadData = ''
    }
  },
  computed: {
    nextLevelText: {
      get: function () {
        return this.translateDataHeader('source1', this.$store.state.recoLevel)
      },
      set: function (newVal) { }
    },
    currentLevelText: {
      get: function () {
        return this.translateDataHeader(
          'source1',
          this.$store.state.recoLevel - 1
        )
      },
      set: function (newVal) { }
    },
    matchedHeaders () {
      let header = [
        { text: 'Source1 Location', value: 'source1Name' },
        { text: 'Source1 ID', value: 'source1Id' },
        { text: 'Source2 Location', value: 'source2Name' },
        { text: 'Source2 ID', value: 'source2Id' },
        { text: 'Match Comment', value: 'matchComments' }
      ]
      return header
    },
    source1GridHeaders () {
      let header = [{ text: 'Location', value: 'name' }]
      if (this.$store.state.source1UnMatched.length > 0) {
        for (
          let i = this.$store.state.source1UnMatched[0].parents.length;
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
        { text: 'Source 2 Location', value: 'name', sortable: false },
        { text: 'ID', value: 'id', sortable: false },
        { text: 'Parent', value: 'source2Parent', sortable: false }
      )
      if (
        this.$store.state.recoLevel === this.$store.state.totalSource1Levels
      ) {
        results.push({
          text: 'Geo Dist (Miles)',
          value: 'geodist',
          sortable: false
        })
      }
      results.push({ text: 'Score', value: 'score' })
      return results
    },
    potentialAvailable () {
      return (
        this.$store.state.source2UnMatched !== null &&
        this.$store.state.source2UnMatched.length > this.potentialMatches.length
      )
    },
    allPotentialMatches () {
      if (
        this.$store.state.source2UnMatched !== null &&
        this.$store.state.source2UnMatched.length >
        this.potentialMatches.length &&
        this.showAllPotential === 'all'
      ) {
        let results = []
        for (let addIt of this.$store.state.source2UnMatched) {
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
    source1Tree () {
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
      if (
        Object.keys(this.$store.state.source1Parents).length === 1 &&
        Object.keys(this.$store.state.source1Parents)[0] === 'null'
      ) {
        return results
      }
      createTree(this.$store.state.source1Parents, results)
      // This is needed because the tree doesn't show up on the initial page load without it
      this.source1TreeUpdate++
      return results
    },
    source1Grid () {
      if (
        this.$store.state.source1UnMatched.length > 0 &&
        this.source1Filter.level !== ''
      ) {
        let parentIdx =
          this.$store.state.source1UnMatched[0].parents.length -
          this.source1Filter.level
        return this.$store.state.source1UnMatched.filter(
          location => location.parents[parentIdx] === this.source1Filter.text
        )
      }
      return this.$store.state.source1UnMatched
    },
    goNextLevel () {
      if (
        this.$store.state.recoLevel < this.$store.state.totalSource1Levels &&
        this.$store.state.source1UnMatched !== null &&
        this.$store.state.source1UnMatched.length === 0 &&
        this.$store.state.flagged !== null &&
        this.$store.state.flagged.length === 0 &&
        this.$store.state.matchedContent !== null &&
        this.$store.state.matchedContent.length !== 0
      ) {
        return 'yes'
      } else {
        return 'no'
      }
    },
    lastLevelDone () {
      if (
        this.$store.state.recoLevel === this.$store.state.totalSource1Levels &&
        this.$store.state.source1UnMatched !== null &&
        this.$store.state.source1UnMatched.length === 0 &&
        this.$store.state.flagged !== null &&
        this.$store.state.flagged.length === 0
      ) {
        return 'yes'
      } else {
        return 'no'
      }
    },
    source1TotalRecords () {
      if (this.$store.state.scoreResults) {
        return this.$store.state.scoreResults.length
      } else {
        return 0
      }
    },
    source1TotalMatched () {
      if (this.$store.state.matchedContent) {
        return this.$store.state.matchedContent.length
      } else {
        return 0
      }
    },
    source1PercentMatched () {
      if (this.source1TotalRecords === 0) {
        return 0
      } else {
        return parseFloat(
          ((this.source1TotalMatched * 100) / this.source1TotalRecords).toFixed(
            1
          )
        )
      }
    },
    source1TotalUnMatched () {
      return this.source1TotalRecords - this.source1TotalMatched
    },
    source1PercentUnMatched () {
      if (this.source1TotalRecords === 0) {
        return 0
      } else {
        return parseFloat(
          (
            (this.source1TotalUnMatched * 100) /
            this.source1TotalRecords
          ).toFixed(1)
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
    source1PercentFlagged () {
      if (this.$store.state.scoreResults.length === 0) {
        return 0
      } else if (this.$store.state.flagged) {
        return parseFloat(
          (
            (this.$store.state.flagged.length * 100) /
            this.$store.state.scoreResults.length
          ).toFixed(1)
        )
      } else {
        return 0
      }
    },
    source1TotalNoMatch () {
      if (this.$store.state.noMatchContent) {
        return this.$store.state.noMatchContent.length
      } else {
        return 0
      }
    },
    source1TotalIgnore () {
      if (this.$store.state.ignoreContent) {
        return this.$store.state.ignoreContent.length
      } else {
        return 0
      }
    },
    source1PercentNoMatch () {
      if (this.$store.state.scoreResults.length === 0) {
        return 0
      } else if (this.$store.state.noMatchContent) {
        return parseFloat(
          (
            (this.$store.state.noMatchContent.length * 100) /
            this.$store.state.scoreResults.length
          ).toFixed(1)
        )
      } else {
        return 0
      }
    },
    source1PercentIgnore () {
      if (this.$store.state.scoreResults.length === 0) {
        return 0
      } else if (this.$store.state.ignoreContent) {
        return parseFloat(
          (
            (this.$store.state.ignoreContent.length * 100) /
            this.$store.state.scoreResults.length
          ).toFixed(1)
        )
      } else {
        return 0
      }
    },
    source2TotalRecords () {
      if (this.$store.state.source2TotalRecords) {
        return this.$store.state.source2TotalRecords
      } else {
        return 0
      }
    },
    source2TotalUnmatched () {
      if (this.source2TotalRecords > 0 && this.$store.state.matchedContent) {
        return (
          parseInt(this.source2TotalRecords) -
          parseInt(this.$store.state.matchedContent.length)
        )
      } else {
        return 0
      }
    },
    source2PercentUnmatched () {
      if (this.$store.state.source2TotalRecords === 0) {
        return 0
      } else {
        return parseFloat(
          (
            (this.source2TotalUnmatched * 100) /
            this.$store.state.source2TotalRecords
          ).toFixed(1)
        )
      }
    },
    source2PercentFlagged () {
      if (this.$store.state.source2TotalRecords === 0) {
        return 0
      } else if (this.$store.state.flagged) {
        return parseFloat(
          (
            (this.$store.state.flagged.length * 100) /
            this.$store.state.source2TotalRecords
          ).toFixed(1)
        )
      } else {
        return 0
      }
    },
    source2TotalMatched () {
      return this.source1TotalMatched
    },
    source2PercentMatched () {
      if (this.$store.state.source2TotalRecords === 0) {
        return 0
      } else {
        return parseFloat(
          (
            (this.source2TotalMatched * 100) /
            this.$store.state.source2TotalRecords
          ).toFixed(1)
        )
      }
    },
    source2NotInSource1 () {
      var missing = this.source2TotalRecords - this.source1TotalRecords
      if (missing < 0) {
        return 0
      } else {
        return missing
      }
    },
    source2PercentNotInSource1 () {
      if (this.source2NotInSource1 === 0) {
        return 0
      }
      var percent = parseFloat(
        ((this.source2NotInSource1 * 100) / this.source2TotalRecords).toFixed(1)
      )
      return parseFloat(percent)
    }
  },
  created () {
    if (this.$store.state.recalculateScores) {
      this.$store.state.recalculateScores = false
      this.getScores()
    }
    eventBus.$on('changeCSVHeaderNames', () => {
      let levelName = this.translateDataHeader(
        'source1',
        this.$store.state.recoLevel
      )
      this.nextLevelText = levelName
      this.currentLevelText = levelName
    })
    this.addListener()
    if (this.$store.state.recoLevel === this.$store.state.totalSource1Levels) {
      this.dialogWidth = 'auto'
    } else {
      this.dialogWidth = '1190px'
    }
  },
  components: {
    'liquor-tree': LiquorTree
  }
}
</script>
<style>
</style>
