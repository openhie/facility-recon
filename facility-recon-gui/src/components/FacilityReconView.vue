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
    <template v-if='!$store.state.denyAccess & !$store.state.uploadRunning'>
      <v-layout column>
        <v-flex
          xs1
          text-xs-right
        >
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
                This page let you view dat you have uploaded or synchronized from a remote server
                <v-list>1. Use the tree to filter grid data</v-list>
              </v-card-text>
            </v-card>
          </v-dialog>
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
        persistent
        transition="scale-transition"
        v-model="confirmDelete"
        max-width="500px"
      >
        <v-card>
          <v-toolbar
            color="primary"
            dark
          >
            <v-toolbar-title>
              Warning
            </v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            Are you sure that you want to delete {{deleteLocationData.facility}}
          </v-card-text>
          <v-card-actions>
            <v-btn
              color="error"
              @click.native="confirmDelete = false"
            >Cancel</v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              dark
              @click.native="deleteLocation()"
            >Proceed</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        persistent
        v-model="editDialog"
        transition="scale-transition"
        max-width="500px"
      >
        <v-card height="500px">
          <v-toolbar
            color="primary"
            dark
          >
            <v-toolbar-title>
              Edit Location
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-icon
              @click="editDialog = false"
              style="cursor: pointer"
            >close</v-icon>
          </v-toolbar>
          <v-card-text>
            <v-layout column>
              <v-flex>
                <v-text-field
                  v-model="editLocationName"
                  @blur="$v.editLocationName.$touch()"
                  @change="$v.editLocationName.$touch()"
                  :error-messages="editLocationNameErrors"
                  required
                  label="Facility"
                >
                </v-text-field>
              </v-flex>
              <v-flex>
                <v-select
                  :items="editParents"
                  v-model="editLocationParent"
                  box
                  label="Parent"
                ></v-select>
              </v-flex>
            </v-layout>
          </v-card-text>
        </v-card>
        <v-layout column>
          <v-flex>
            <v-toolbar>
              <v-layout
                row
                wrap
              >
                <v-flex
                  xs6
                  text-sm-left
                >
                  <v-btn
                    color="error"
                    @click.native="editDialog = false"
                  >
                    <v-icon left>cancel</v-icon> Cancel
                  </v-btn>
                </v-flex>
                <v-flex
                  xs6
                  text-sm-right
                >
                  <v-btn
                    color="primary"
                    :disabled="$v.$invalid"
                    dark
                    @click="saveEdit()"
                  >
                    <v-icon left>save</v-icon>Save
                  </v-btn>
                </v-flex>
              </v-layout>
            </v-toolbar>
          </v-flex>
        </v-layout>
      </v-dialog>
      <v-layout
        row
        wrap
      >
        <v-flex xs6>
          <v-card>
            <v-card-title primary-title>
              <h3 class="headline mb-0">Source 1 Data Tree</h3>
            </v-card-title>
            <template v-if="loadingSource1Tree">
              <v-progress-linear :indeterminate="true"></v-progress-linear>
            </template>
            <template v-else>
              <v-card-text>
                <p>
                  <liquor-tree
                    @node:selected="source1NodeSelected"
                    :data="source1Tree"
                    :options="{}"
                    ref="source1Tree"
                  />
                </p>
              </v-card-text>
            </template>
          </v-card>
        </v-flex>
        <v-flex xs6>
          <v-card>
            <v-card-title primary-title>
              <h3 class="headline mb-0">Source 2 Data Tree</h3>
            </v-card-title>
            <template v-if="loadingSource2Tree">
              <v-progress-linear :indeterminate="true"></v-progress-linear>
            </template>
            <template v-else>
              <v-card-text>
                <p>
                  <liquor-tree
                    @node:selected="source2NodeSelected"
                    :data="source2Tree"
                    :options="{}"
                    ref="source2Tree"
                  />
                </p>
              </v-card-text>
            </template>
          </v-card>
        </v-flex>
        <v-flex xs6>
          <v-card>
            <v-card-title primary-title>
              <h3 class="headline mb-0">Source 1 Data Grid</h3>
            </v-card-title>
            <template v-if="loadingSource1Grid">
              <v-progress-linear :indeterminate="true"></v-progress-linear>
            </template>
            <template v-else>
              <!-- <v-card-title>
                <v-text-field
                  v-model="searchSource1"
                  append-icon="search"
                  label="Search"
                  single-line
                  hide-details
                ></v-text-field>
              </v-card-title> -->
              <v-card-text>
                <v-data-table
                  :headers="source1GridHeader"
                  :items="source1Grid"
                  :search="searchSource1"
                  :pagination.sync="source1Pagination"
                  :total-items="totalSource1Records"
                  :loading="loadingSource1"
                  hide-actions
                  class="elevation-1"
                >
                  <template
                    slot="items"
                    slot-scope="props"
                  >
                    <td
                      v-for='(header, key) in source1GridHeader'
                      style="white-space:nowrap;overflow: hidden;"
                      :key="header.value + 1"
                    >
                      <template v-if="key === 0 && isDataset1Owner">
                        <v-icon
                          @click="edit(props.item, 'source1')"
                          style="cursor: pointer"
                        >edit</v-icon> |
                        <v-icon
                          @click="deleteLocation(props.item, 'source1', 'requestConfirmation')"
                          style="cursor: pointer"
                        >delete</v-icon>
                      </template>
                      <template v-else>
                        {{props.item[header.value]}}
                      </template>
                    </td>
                  </template>
                </v-data-table>
              </v-card-text>
              <div class="text-xs-center pt-2">
                <v-pagination
                  v-model="source1Pagination.page"
                  :length="source1Pages"
                ></v-pagination>
              </div>
            </template>
          </v-card>
        </v-flex>
        <v-flex xs6>
          <v-card>
            <v-card-title primary-title>
              <h3 class="headline mb-0">Source 2 Data Grid</h3>
            </v-card-title>
            <template v-if="loadingSource2Grid">
              <v-progress-linear :indeterminate="true"></v-progress-linear>
            </template>
            <template v-else>
              <!-- <v-card-title>
                <v-text-field
                  v-model="searchSource2"
                  append-icon="search"
                  label="Search"
                  single-line
                  hide-details
                ></v-text-field>
              </v-card-title> -->
              <v-card-text>
                <v-data-table
                  :headers="source2GridHeader"
                  :items="source2Grid"
                  :search="searchSource2"
                  :pagination.sync="source2Pagination"
                  :total-items="totalSource2Records"
                  :loading="loadingSource2"
                  hide-actions
                  class="elevation-1"
                >
                  <template
                    slot="items"
                    slot-scope="props"
                  >
                    <td
                      v-for='(header, key) in source2GridHeader'
                      style="white-space:nowrap;overflow: hidden;"
                      :key="header.value + 2"
                    >
                      <template v-if="key === 0 && isDataset2Owner">
                        <v-icon
                          @click="edit(props.item, 'source2')"
                          style="cursor: pointer"
                        >edit</v-icon> |
                        <v-icon
                          @click="deleteLocation(props.item, 'source2', 'requestConfirmation')"
                          style="cursor: pointer"
                        >delete</v-icon>
                      </template>
                      <template v-else>
                        {{props.item[header.value]}}
                      </template>
                    </td>
                  </template>
                </v-data-table>
              </v-card-text>
              <div class="text-xs-center pt-2">
                <v-pagination
                  v-model="source2Pagination.page"
                  :length="source2Pages"
                ></v-pagination>
              </div>
            </template>
          </v-card>
        </v-flex>
      </v-layout>
      <br>
      <v-layout
        row
        wrap
      >
        <v-flex
          xs1
          xl10
        >
          <v-btn
            color="primary"
            dark
            @click='$router.push({name:"FacilityReconScores"})'
          >
            <v-icon>find_in_page</v-icon>
            Reconcile
          </v-btn>
        </v-flex>
      </v-layout>
    </template>
  </v-container>
</template>

<script scoped>
import LiquorTree from 'liquor-tree'
import axios from 'axios'
import { required } from 'vuelidate/lib/validators'
import { scoresMixin } from '../mixins/scoresMixin'
import { generalMixin } from '../mixins/generalMixin'
const backendServer = process.env.BACKEND_SERVER

export default {
  validations: {
    editLocationName: { required }
  },
  mixins: [scoresMixin, generalMixin],
  data () {
    return {
      confirmDelete: false,
      deleteLocationData: '',
      deleteSource: {
        name: '',
        value: ''
      },
      editDialog: false,
      editLocationName: '',
      editLocationId: '',
      editParents: [],
      editLocationParent: '',
      editSource: '',
      helpDialog: false,
      lastLevel: [],
      headerText: {
        level2: 'Level 1',
        level3: 'Level 2',
        level4: 'Level 3',
        level5: 'Level 4',
        level6: 'Level 5',
        level7: 'Level 6',
        level8: 'Level 7',
        level9: 'Level 8',
        level10: 'Level 9',
        facility: 'Facility',
        latitude: 'Latitude',
        longitude: 'Longitude'
      },
      headers: [
        { text: 'Level 1', value: 'level1' },
        { text: 'Level 2', value: 'level2' },
        { text: 'Level 3', value: 'level3' },
        { text: 'Level 4', value: 'level4' },
        { text: 'Facility', value: 'facility' },
        { text: 'Latitude', value: 'latitude' },
        { text: 'Longitude', value: 'longitude' }
      ],
      searchSource1: '',
      searchSource2: '',
      filterSource1: { text: '', level: '' },
      filterSource2: { text: '', level: '' },
      source2Pagination: { rowsPerPage: 20 },
      source1Pagination: { rowsPerPage: 20 },
      loadingSource1: false,
      loadingSource2: false,
      totalSource1Records: 0,
      totalSource2Records: 0,
      source2Grid: [],
      source1Grid: [],
      source1Tree: [],
      source2Tree: [],
      source1Start: 1,
      source2Start: 1,
      source1Count: 10,
      source2Count: 10,
      loadingSource1Tree: false,
      loadingSource2Tree: false,
      loadingSource1Grid: false,
      loadingSource2Grid: false,
      currentSource2Pagination: {},
      currentSource1Pagination: {},
      source1SelNodeId: false,
      source2SelNodeId: false,
      sourceOwner: ''
    }
  },
  methods: {
    edit (data, source) {
      let sourcesOwner = this.getDatasourceOwner()
      if (source === 'source1') {
        this.sourceOwner = sourcesOwner.source1Owner
        this.editSource = this.source1
      } else if (source === 'source2') {
        this.sourceOwner = sourcesOwner.source1Owner
        this.editSource = this.source2
      }
      this.editLocationName = data.facility
      this.editLocationId = data.id
      this.editDialog = true
      let length = Object.keys(this.source2GridHeader).length
      let levelNextFacility = this.source2GridHeader[length - 1].value
      this.editLocationParent = data[levelNextFacility + 'id']
      let level = levelNextFacility.replace('level', '')
      this.getLevelData(level)
    },
    saveEdit () {
      let formData = new FormData()
      formData.append('sourceOwner', this.sourceOwner)
      formData.append('source', this.editSource)
      formData.append('locationId', this.editLocationId)
      formData.append('locationName', this.editLocationName)
      formData.append('locationParent', this.editLocationParent)
      axios.post(backendServer + '/editLocation', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        this.editDialog = false
        this.getSource1Grid(false)
        this.getSource2Grid(false)
        this.getTree()
      }).catch((err) => {
        console.log(JSON.stringify(err))
      })
    },
    deleteLocation (location, source, stage) {
      if (stage === 'requestConfirmation') {
        let sourcesOwner = this.getDatasourceOwner()
        if (source === 'source1') {
          this.sourceOwner = sourcesOwner.source1Owner
          this.deleteSource = {
            name: 'source1',
            sourceId: this.$store.state.activePair.source1.id,
            sourceName: this.source1
          }
        } else if (source === 'source2') {
          this.sourceOwner = sourcesOwner.source2Owner
          this.deleteSource = {
            name: 'source2',
            sourceId: this.$store.state.activePair.source2.id,
            sourceName: this.source2
          }
        }
        this.deleteLocationData = location
        this.confirmDelete = true
      } else {
        this.confirmDelete = false
        let userID = this.$store.state.activePair.userID._id
        let query = `id=${this.deleteLocationData.id}&sourceId=${this.deleteSource.sourceId}&sourceName=${this.deleteSource.sourceName}&userID=${userID}&sourceOwner=${this.sourceOwner}`
        axios.delete(backendServer + `/deleteLocation?${query}`).then((resp) => {
          if (this.deleteSource.name === 'source1') {
            this.getSource1Grid(false)
          } else {
            this.getSource2Grid(false)
          }
        })
      }
    },
    getLevelData (level) {
      axios.get(backendServer + '/getLevelData/' + this.editSource + '/' + this.sourceOwner + '/' + level).then((data) => {
        this.editParents = data.data
      })
    },
    getSource1Grid (id) {
      if (!this.source1) {
        return
      }
      this.loadingSource1 = true
      if (!id) {
        id = ''
      }
      this.loadingSource1Grid = true
      let source1Owner = this.getDatasourceOwner().source1Owner
      let source1LimitOrgId = this.getLimitOrgIdOnActivePair().source1LimitOrgId
      let userID = this.$store.state.activePair.userID._id
      let path = `/hierarchy?source=${this.source1}&start=${this.source1Start}&count=${this.source1Count}&id=${id}&userID=${userID}&sourceOwner=${source1Owner}&sourceLimitOrgId=${source1LimitOrgId}`
      axios.get(backendServer + path).then((hierarchy) => {
        this.loadingSource1Grid = false
        if (hierarchy.data) {
          const { sortBy, descending } = this.source1Pagination
          if (this.source1Pagination.sortBy) {
            hierarchy.data.tree = hierarchy.data.grid.sort((a, b) => {
              const sortA = a[sortBy]
              const sortB = b[sortBy]

              if (descending) {
                if (sortA < sortB) return 1
                if (sortA > sortB) return -1
                return 0
              } else {
                if (sortA < sortB) return -1
                if (sortA > sortB) return 1
                return 0
              }
            })
          }
          this.source1Grid = hierarchy.data.grid
          this.totalSource1Records = hierarchy.data.total
          this.source1Pagination.totalItems = hierarchy.data.total
          // set these values to stop reloading data due to watcher see that the var source2Pagination has changed
          this.currentSource1Pagination = Object.assign({}, this.source1Pagination)
          if (!this.currentSource1Pagination.hasOwnProperty('descending')) {
            this.currentSource1Pagination.descending = false
          }
          if (!this.currentSource1Pagination.hasOwnProperty('page')) {
            this.currentSource1Pagination.page = 1
          }
          if (!this.currentSource1Pagination.hasOwnProperty('sortBy')) {
            this.currentSource1Pagination.sortBy = 'facility'
          }
          if (!this.currentSource1Pagination.hasOwnProperty('totalItems')) {
            this.currentSource1Pagination.totalItems = hierarchy.data.total
          }
        }
        this.loadingSource1 = false
      })
    },
    getSource2Grid (id) {
      if (!this.source2) {
        return
      }
      if (!id) {
        id = ''
      }
      this.loadingSource2 = true
      this.loadingSource2Grid = true
      let source2Owner = this.getDatasourceOwner().source2Owner
      let source2LimitOrgId = this.getLimitOrgIdOnActivePair().source2LimitOrgId
      let userID = this.$store.state.activePair.userID._id
      let path = `/hierarchy?source=${this.source2}&start=${this.source2Start}&count=${this.source2Count}&id=${id}&userID=${userID}&sourceOwner=${source2Owner}&sourceLimitOrgId=${source2LimitOrgId}`
      axios.get(backendServer + path).then((hierarchy) => {
        this.loadingSource2Grid = false
        if (hierarchy.data) {
          const { sortBy, descending } = this.source2Pagination
          if (this.source2Pagination.sortBy) {
            hierarchy.data.tree = hierarchy.data.grid.sort((a, b) => {
              const sortA = a[sortBy]
              const sortB = b[sortBy]

              if (descending) {
                if (sortA < sortB) return 1
                if (sortA > sortB) return -1
                return 0
              } else {
                if (sortA < sortB) return -1
                if (sortA > sortB) return 1
                return 0
              }
            })
          }
          this.source2Grid = hierarchy.data.grid
          this.totalSource2Records = hierarchy.data.total
          this.source2Pagination.totalItems = hierarchy.data.total

          // set these values to stop reloading data due to watcher see that the var source2Pagination has changed
          this.currentSource2Pagination = Object.assign({}, this.source2Pagination)
          if (!this.currentSource2Pagination.hasOwnProperty('descending')) {
            this.currentSource2Pagination.descending = false
          }
          if (!this.currentSource2Pagination.hasOwnProperty('page')) {
            this.currentSource2Pagination.page = 1
          }
          if (!this.currentSource2Pagination.hasOwnProperty('sortBy')) {
            this.currentSource2Pagination.sortBy = 'facility'
          }
          if (!this.currentSource2Pagination.hasOwnProperty('totalItems')) {
            this.currentSource2Pagination.totalItems = hierarchy.data.total
          }
        }
        this.loadingSource2 = false
      })
    },
    getTree () {
      if (!this.source1 || !this.source2) {
        return
      }
      let source2Owner = this.getDatasourceOwner().source2Owner
      let source2LimitOrgId = this.getLimitOrgIdOnActivePair().source2LimitOrgId
      this.loadingSource2Tree = true
      axios.get(backendServer + '/getTree/' + this.source2 + '/' + source2Owner + '/' + source2LimitOrgId).then((hierarchy) => {
        this.loadingSource2Tree = false
        if (hierarchy.data) {
          this.source2Tree = hierarchy.data
        }
      })
      let source1Owner = this.getDatasourceOwner().source1Owner
      let source1LimitOrgId = this.getLimitOrgIdOnActivePair().source1LimitOrgId
      this.loadingSource1Tree = true
      axios.get(backendServer + '/getTree/' + this.source1 + '/' + source1Owner + '/' + source1LimitOrgId).then((hierarchy) => {
        this.loadingSource1Tree = false
        if (hierarchy.data) {
          this.source1Tree = hierarchy.data
        }
      })
    },
    source1NodeSelected (node) {
      this.source1SelNodeId = node.id
      this.getSource1Grid(node.id)
    },
    source2NodeSelected (node) {
      this.source2SelNodeId = node.id
      this.getSource2Grid(node.id)
    }
  },
  computed: {
    isDataset1Owner () {
      let source1Owner = this.getDatasourceOwner().source1Owner
      let userID = this.$store.state.auth.userID
      if (source1Owner !== userID) {
        return false
      }
      return true
    },
    isDataset2Owner () {
      let source2Owner = this.getDatasourceOwner().source2Owner
      let userID = this.$store.state.auth.userID
      if (source2Owner !== userID) {
        return false
      }
      return true
    },
    source2GridHeader () {
      let header = []
      if (this.isDataset2Owner) {
        header.push({
          text: '',
          value: '',
          sortable: false
        })
      }
      let gridWithAllHeaders = {}
      if (this.source2Grid && this.source2Grid.length > 0) {
        for (var grid in this.source2Grid) {
          if (gridWithAllHeaders.length > 0 && this.source2Grid[grid].length > Object.keys(gridWithAllHeaders).length) {
            gridWithAllHeaders = this.source2Grid[grid]
          } else if (Object.keys(gridWithAllHeaders).length === 0) {
            gridWithAllHeaders = this.source2Grid[grid]
          }
        }
      }
      for (const key in gridWithAllHeaders) {
        if (this.headerText[key]) {
          header.push({ text: this.headerText[key], value: key })
        }
      }
      return header
    },
    source1GridHeader () {
      let header = []
      if (this.isDataset1Owner) {
        header.push({
          text: '',
          value: '',
          sortable: false
        })
      }
      let gridWithAllHeaders = {}
      if (this.source1Grid && this.source1Grid.length > 0) {
        for (var grid in this.source1Grid) {
          if (gridWithAllHeaders.length > 0 && this.source1Grid[grid].length > Object.keys(gridWithAllHeaders).length) {
            gridWithAllHeaders = this.source1Grid[grid]
          } else if (Object.keys(gridWithAllHeaders).length === 0) {
            gridWithAllHeaders = this.source1Grid[grid]
          }
        }
      }
      if (this.source1Grid && this.source1Grid.length > 0) {
        for (const key in this.source1Grid[0]) {
          if (this.headerText[key]) {
            header.push({ text: this.headerText[key], value: key })
          }
        }
      }
      return header
    },
    source2Pages () {
      if (this.source2Pagination.rowsPerPage == null || this.source2Pagination.totalItems == null) {
        return 0
      }
      return Math.ceil(this.source2Pagination.totalItems / this.source2Count)
    },
    source1Pages () {
      if (this.source1Pagination.rowsPerPage == null || this.source1Pagination.totalItems == null) {
        return 0
      }
      return Math.ceil(this.source1Pagination.totalItems / this.source1Count)
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
    editLocationNameErrors () {
      const errors = []
      if (!this.$v.editLocationName.$dirty) return errors
      !this.$v.editLocationName.required && errors.push('Facility Name is required')
      return errors
    }
  },
  watch: {
    source1Pagination: {
      handler () {
        // if nothing has changed then dont send server request
        if (this.currentSource1Pagination.sortBy === this.source1Pagination.sortBy &&
          this.currentSource1Pagination.descending === this.source1Pagination.descending &&
          this.currentSource1Pagination.page === this.source1Pagination.page
        ) {
          return
        }
        let page = this.source1Pagination.page - 1
        this.source1Start = page * this.source1Count + 1
        this.getSource1Grid(this.source1SelNodeId)
      },
      deep: true
    },
    source2Pagination: {
      handler () {
        // if nothing has changed then dont send server request
        if (this.currentSource2Pagination.sortBy === this.source2Pagination.sortBy &&
          this.currentSource2Pagination.descending === this.source2Pagination.descending &&
          this.currentSource2Pagination.page === this.source2Pagination.page
        ) {
          return
        }
        let page = this.source2Pagination.page - 1
        this.source2Start = page * this.source2Count + 1
        this.getSource2Grid(this.source2SelNodeId)
      },
      deep: true
    }
  },
  mounted () {
    this.getSource1Grid(false)
    this.getSource2Grid(false)
    this.getTree()
  },
  components: {
    'liquor-tree': LiquorTree
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1,
h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
