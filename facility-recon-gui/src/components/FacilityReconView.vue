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
                <h3 class="headline mb-0">MoH Data Tree</h3>
              </v-card-title>
              <template v-if="!$store.state.mohHierarchy.data">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-text>
                  <p>
                    <liquor-tree :data="$store.state.mohHierarchy.data" :options="{}" ref="mohTree" />
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
              <template v-if="!datimTreeData">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-text>
                  <p>
                    <liquor-tree :data="datimTreeData" :options="{}" ref="datimTree" />
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
              <template v-if="!mohTreeData">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-title>
                  <v-text-field v-model="searchMOH" append-icon="search" label="Search" single-line hide-details></v-text-field>
                </v-card-title>
                <v-card-text>
                  <v-data-table :headers="mohGridHeader" :items="mohGridData" :search="searchMOH" :pagination.sync="mohPagination" hide-actions class="elevation-1">
                    <template slot="items" slot-scope="props">
                      <td v-for='header in mohGridHeader'>{{props.item[header.value]}}</td>
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
              <template v-if="!datimTreeData">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-title>
                  <v-text-field v-model="searchDATIM" append-icon="search" label="Search" single-line hide-details></v-text-field>
                </v-card-title>
                <v-card-text>
                  <v-data-table :headers="datimGridHeader" :items="datimGridData" :search="searchDATIM" :pagination.sync="datimPagination" hide-actions class="elevation-1">
                    <template slot="items" slot-scope="props">
                      <td v-for='header in datimGridHeader'>{{props.item[header.value]}}</td>
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

const addChildren = (treeData, results, filter, ...rest) => {
  for (const node of treeData) {
    if (node.children && node.children.length > 0) {
      addChildren(node.children, results, filter, node.text, ...rest)
    } else {
      let row = {}
      for (let i = rest.length - 1, level = 1; i >= 0; i = i - 1, level++) {
        if (level === 1) {
          continue
        }
        row['level' + level] = rest[i]
      }
      row.facility = node.text
      row.latitude = node.lat
      row.longitude = node.long
      // Do nothing for level1 since that's the whole country
      if (filter.level === '' || filter.level === 'level1' ? true : row[filter.level] && row[filter.level] === filter.text) {
        results.push(row)
      }
    }
  }
}

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
      mohPagination: { rowsPerPage: 20 }
    }
  },
  computed: {
    datimGridData () {
      var results = []
      addChildren(this.datimTreeData, results, this.filterDATIM)
      return results
    },
    datimGridHeader () {
      let header = []
      let gridWithAllHeaders = []
      if (this.datimGridData && this.datimGridData.length > 0) {
        for (var grid in this.datimGridData) {
          if (gridWithAllHeaders.length > 0 && this.datimGridData[grid].length > gridWithAllHeaders[0].length) {
            gridWithAllHeaders = this.datimGridData[grid]
          } else {
            gridWithAllHeaders = this.datimGridData[grid]
          }
        }
      }

      for (const key in gridWithAllHeaders) {
        header.push({ text: this.headerText[key], value: key })
      }
      return header
    },
    mohGridData () {
      var results = []
      addChildren(this.mohTreeData, results, this.filterMOH)
      return results
    },
    mohGridHeader () {
      let header = []
      if (this.mohGridData && this.mohGridData.length > 0) {
        for (const key in this.mohGridData[0]) {
          header.push({ text: this.headerText[key], value: key })
        }
      }
      return header
    },
    datimPages () {
      if (this.datimPagination.rowsPerPage == null || this.datimPagination.totalItems == null) {
        return 0
      }
      return Math.ceil(this.datimPagination.totalItems / this.datimPagination.rowsPerPage)
    },
    mohPages () {
      if (this.mohPagination.rowsPerPage == null || this.mohPagination.totalItems == null) {
        return 0
      }
      return Math.ceil(this.mohPagination.totalItems / this.mohPagination.rowsPerPage)
    },
    datimTreeData () {
      return this.$store.state.datimHierarchy.data
    },
    mohTreeData () {
      return this.$store.state.mohHierarchy.data
    }
  },
  mounted () {
    const setListener = () => {
      if (this.$refs && this.$refs.datimTree && this.$refs.mohTree) {
        this.$refs.datimTree.$on('node:selected', (node) => {
          this.filterDATIM.text = node.data.text
          let level = 1
          while (node.parent) {
            node = node.parent
            level++
          }
          this.filterDATIM.level = 'level' + level
        })
        this.$refs.mohTree.$on('node:selected', (node) => {
          this.filterMOH.text = node.data.text
          let level = 1
          while (node.parent) {
            node = node.parent
            level++
          }
          this.filterMOH.level = 'level' + level
        })
      } else {
        setTimeout(function () { setListener() }, 500)
      }
    }
    setListener()
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
