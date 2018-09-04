<template>
  <v-container fluid>
    <template v-if='$store.state.uploadRunning'><br><br><br>
      <v-alert type="info" :value="true">
        <b>Wait for upload to finish ...</b>
        <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
      </v-alert>
    </template>
    <template v-if='!$store.state.denyAccess & !$store.state.uploadRunning'>
      <v-slide-y-transition mode="out-in">
        <v-layout row wrap>
          <v-flex xs6>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">MOH Data Tree</h3>
              </v-card-title>
              <template v-if="mohTree.length == 0">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-text>
                  <p>
                    <liquor-tree @node:selected="mohNodeSelected" :data="mohTree" :options="{}" ref="mohTree" />
                  </p>
                </v-card-text>
              </template>
            </v-card>
          </v-flex>
          <v-flex xs6>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">DATIM Data Tree</h3>
              </v-card-title>
              <template v-if="datimTree.length == 0">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-text>
                  <p>
                    <liquor-tree @node:selected="datimNodeSelected" :data="datimTree" :options="{}" ref="datimTree" />
                  </p>
                </v-card-text>
              </template>
            </v-card>
          </v-flex>
          <v-flex xs6>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">MoH Data Grid</h3>
              </v-card-title>
              <template v-if="!mohGrid">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-title>
                  <v-text-field v-model="searchMOH" append-icon="search" label="Search" single-line hide-details></v-text-field>
                </v-card-title>
                <v-card-text>
                  <v-data-table :headers="mohGridHeader" :items="mohGrid" :search="searchMOH" :pagination.sync="mohPagination" :total-items="totalMohRecords" :loading="loadingMoh" hide-actions class="elevation-1">
                    <template slot="items" slot-scope="props">
                      <td v-for='header in mohGridHeader' style="white-space:nowrap;overflow: hidden;">{{props.item[header.value]}}</td>
                    </template>
                  </v-data-table>
                </v-card-text>
                <div class="text-xs-center pt-2">
                  <v-pagination v-model="mohPagination.page" :length="mohPages"></v-pagination>
                </div>
              </template>
            </v-card>
          </v-flex>
          <v-flex xs6>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">DATIM Data Grid</h3>
              </v-card-title>
              <template v-if="!datimGrid">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-title>
                  <v-text-field v-model="searchDATIM" append-icon="search" label="Search" single-line hide-details></v-text-field>
                </v-card-title>
                <v-card-text>
                  <v-data-table :headers="datimGridHeader" :items="datimGrid" :search="searchDATIM" :pagination.sync="datimPagination" :total-items="totalDatimRecords" :loading="loadingDatim" hide-actions class="elevation-1">
                    <template slot="items" slot-scope="props">
                      <td v-for='header in datimGridHeader' style="white-space:nowrap;overflow: hidden;">{{props.item[header.value]}}</td>
                    </template>
                  </v-data-table>
                </v-card-text>
                <div class="text-xs-center pt-2">
                  <v-pagination v-model="datimPagination.page" :length="datimPages"></v-pagination>
                </div>
              </template>
            </v-card>
          </v-flex>
        </v-layout>
      </v-slide-y-transition>
      <br>
      <v-layout row wrap>
        <v-flex xs1 xl10>
          <v-btn color="primary" dark @click='$router.push({name:"FacilityReconScores"})'>
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
const config = require('../../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)

export default {
  data () {
    return {
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
      searchMOH: '',
      searchDATIM: '',
      filterMOH: { text: '', level: '' },
      filterDATIM: { text: '', level: '' },
      datimPagination: { rowsPerPage: 20 },
      mohPagination: { rowsPerPage: 20 },
      loadingMoh: false,
      loadingDatim: false,
      totalMohRecords: 0,
      totalDatimRecords: 0,
      datimGrid: '',
      mohGrid: '',
      mohTree: [],
      datimTree: [],
      mohStart: 1,
      datimStart: 1,
      mohCount: 10,
      datimCount: 10,
      currentDatimPagination: {},
      currentMohPagination: {},
      mohSelNodeId: false,
      datimSelNodeId: false
    }
  },
  methods: {
    getMohGrid (id) {
      this.loadingMoh = true
      var orgUnit = this.$store.state.orgUnit
      if (!id) {
        id = orgUnit.OrgId
      }
      axios.get(backendServer + '/hierarchy/moh/' + id + '/' + this.mohStart + '/' + this.mohCount, { params: orgUnit }).then((hierarchy) => {
        const { sortBy, descending } = this.mohPagination
        if (this.mohPagination.sortBy) {
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
        this.mohGrid = hierarchy.data.grid
        this.totalMohRecords = hierarchy.data.total

        // set these values to stop reloading data due to watcher see that the var datimPagination has changed
        this.currentMohPagination = Object.assign({}, this.mohPagination)
        if (!this.currentMohPagination.hasOwnProperty('descending')) {
          this.currentMohPagination.descending = false
        }
        if (!this.currentMohPagination.hasOwnProperty('page')) {
          this.currentMohPagination.page = 1
        }
        if (!this.currentMohPagination.hasOwnProperty('sortBy')) {
          this.currentMohPagination.sortBy = 'facility'
        }
        if (!this.currentMohPagination.hasOwnProperty('totalItems')) {
          this.currentMohPagination.totalItems = hierarchy.data.total
        }
        this.loadingMoh = false
      })
    },
    getDatimGrid (id) {
      this.loadingDatim = true
      let orgUnit = this.$store.state.orgUnit
      if (!id) {
        id = orgUnit.OrgId
      }
      axios.get(backendServer + '/hierarchy/datim/' + id + '/' + this.datimStart + '/' + this.datimCount, { params: orgUnit }).then((hierarchy) => {
        // const { sortBy, descending, page, rowsPerPage } = this.datimPagination
        const { sortBy, descending } = this.datimPagination
        if (this.datimPagination.sortBy) {
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
        this.datimGrid = hierarchy.data.grid
        this.totalDatimRecords = hierarchy.data.total
        this.datimPagination.totalItems = hierarchy.data.total

        // set these values to stop reloading data due to watcher see that the var datimPagination has changed
        this.currentDatimPagination = Object.assign({}, this.datimPagination)
        if (!this.currentDatimPagination.hasOwnProperty('descending')) {
          this.currentDatimPagination.descending = false
        }
        if (!this.currentDatimPagination.hasOwnProperty('page')) {
          this.currentDatimPagination.page = 1
        }
        if (!this.currentDatimPagination.hasOwnProperty('sortBy')) {
          this.currentDatimPagination.sortBy = 'facility'
        }
        if (!this.currentDatimPagination.hasOwnProperty('totalItems')) {
          this.currentDatimPagination.totalItems = hierarchy.data.total
        }
        this.loadingDatim = false
      })
    },
    getTree () {
      var orgUnit = this.$store.state.orgUnit
      axios.get(backendServer + '/getTree/datim', { params: orgUnit }).then((hierarchy) => {
        this.datimTree = hierarchy.data
      })

      axios.get(backendServer + '/getTree/moh/', { params: orgUnit }).then((hierarchy) => {
        this.mohTree = hierarchy.data
      })
    },
    mohNodeSelected (node) {
      this.mohSelNodeId = node.id
      this.getMohGrid(node.id)
    },
    datimNodeSelected (node) {
      this.datimSelNodeId = node.id
      this.getDatimGrid(node.id)
    }
  },
  computed: {
    datimGridHeader () {
      let header = []
      let gridWithAllHeaders = {}
      if (this.datimGrid && this.datimGrid.length > 0) {
        for (var grid in this.datimGrid) {
          if (gridWithAllHeaders.length > 0 && this.datimGrid[grid].length > Object.keys(gridWithAllHeaders).length) {
            gridWithAllHeaders = this.datimGrid[grid]
          } else if (Object.keys(gridWithAllHeaders).length === 0) {
            gridWithAllHeaders = this.datimGrid[grid]
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
    mohGridHeader () {
      let header = []
      let gridWithAllHeaders = {}
      if (this.mohGrid && this.mohGrid.length > 0) {
        for (var grid in this.mohGrid) {
          if (gridWithAllHeaders.length > 0 && this.mohGrid[grid].length > Object.keys(gridWithAllHeaders).length) {
            gridWithAllHeaders = this.mohGrid[grid]
          } else if (Object.keys(gridWithAllHeaders).length === 0) {
            gridWithAllHeaders = this.mohGrid[grid]
          }
        }
      }
      if (this.mohGrid && this.mohGrid.length > 0) {
        for (const key in this.mohGrid[0]) {
          if (this.headerText[key]) {
            header.push({ text: this.headerText[key], value: key })
          }
        }
      }
      return header
    },
    datimPages () {
      if (this.datimPagination.rowsPerPage == null || this.datimPagination.totalItems == null) {
        return 0
      }
      return Math.ceil(this.datimPagination.totalItems / this.datimCount)
    },
    mohPages () {
      if (this.mohPagination.rowsPerPage == null || this.mohPagination.totalItems == null) {
        return 0
      }
      return Math.ceil(this.mohPagination.totalItems / this.mohCount)
    }
  },
  watch: {
    mohPagination: {
      handler () {
        // if nothing has changed then dont send server request
        if (this.currentMohPagination.sortBy === this.mohPagination.sortBy &&
          this.currentMohPagination.descending === this.mohPagination.descending &&
          this.currentMohPagination.page === this.mohPagination.page
        ) {
          return
        }
        let page = this.mohPagination.page - 1
        this.mohStart = page * this.mohCount + 1
        this.getMohGrid(this.mohSelNodeId)
      },
      deep: true
    },
    datimPagination: {
      handler () {
        // if nothing has changed then dont send server request
        if (this.currentDatimPagination.sortBy === this.datimPagination.sortBy &&
          this.currentDatimPagination.descending === this.datimPagination.descending &&
          this.currentDatimPagination.page === this.datimPagination.page
        ) {
          return
        }
        let page = this.datimPagination.page - 1
        this.datimStart = page * this.datimCount + 1
        this.getDatimGrid(this.datimSelNodeId)
      },
      deep: true
    }
  },
  mounted () {
    this.getMohGrid()
    this.getDatimGrid()
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
