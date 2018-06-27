<template>
  <v-container fluid>
    <template>
      <v-slide-y-transition mode="out-in">
        <v-layout row>
          <v-flex xs3>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">PEPFAR Data Tree</h3>
              </v-card-title>
              <template v-if="!datimTreeData">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-text>
                  <p><liquor-tree
                    :data="datimTreeData"
                    :options="{}" /></p>
                </v-card-text>
              </template>
            </v-card>
          </v-flex>
          <v-flex xs3>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">PEPFAR Data Grid</h3>
              </v-card-title>
              <template v-if="!datimTreeData">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-title>
                  <v-text-field
                    v-model="searchDATIM"
                    append-icon="search"
                    label="Search"
                    single-line
                    hide-details
                  ></v-text-field>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="datimGridHeader"
                    :items="datimGridData"
                    :search="searchDATIM"
                    :pagination.sync="datimPagination"
                    hide-actions
                    class="elevation-1"
                  >
                    <template slot="items" slot-scope="props">
                      <td>{{props.item.level1}}</td>
                      <td>{{props.item.level2}}</td>
                      <td>{{props.item.level3}}</td>
                      <td>{{props.item.level4}}</td>
                      <td>{{props.item.facility}}</td>
                      <td class="text-xs-right">{{props.item.longitude}}</td>
                      <td class="text-xs-right">{{props.item.latitude}}</td>
                    </template>
                  </v-data-table>
                </v-card-text>
                <div class="text-xs-center pt-2">
                  <v-pagination v-model="datimPagination.page" :length="datimPages"></v-pagination>
                </div>
              </template>
            </v-card>
          </v-flex>
           <v-flex xs3>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">MoH Data Tree</h3>
              </v-card-title>
              <template v-if="!mohTreeData">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-text>
                  <p><liquor-tree
                    :data="mohTreeData"
                    :options="{}" /></p>
                </v-card-text>
              </template>
            </v-card>
          </v-flex>
           <v-flex xs3>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">MoH Data Grid</h3>
              </v-card-title>
              <template v-if="!mohTreeData">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </template>
              <template v-else>
                <v-card-title>
                  <v-text-field
                    v-model="searchMOH"
                    append-icon="search"
                    label="Search"
                    single-line
                    hide-details
                  ></v-text-field>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="mohGridHeader"
                    :items="mohGridData"
                    :search="searchMOH"
                    :pagination.sync="mohPagination"
                    hide-actions
                    class="elevation-1"
                  >
                    <template slot="items" slot-scope="props">
                      <td>{{props.item.level1}}</td>
                      <td>{{props.item.level2}}</td>
                      <td>{{props.item.level3}}</td>
                      <td>{{props.item.level4}}</td>
                      <td>{{props.item.facility}}</td>
                      <td class="text-xs-right">{{props.item.longitude}}</td>
                      <td class="text-xs-right">{{props.item.latitude}}</td>
                    </template>
                  </v-data-table>
                </v-card-text>
                <div class="text-xs-center pt-2">
                  <v-pagination v-model="mohPagination.page" :length="mohPages"></v-pagination>
                </div>
              </template>
            </v-card>
          </v-flex>
     
        </v-layout>
      </v-slide-y-transition>
    </template>
  </v-container>
</template>

<script scoped>
import LiquorTree from 'liquor-tree'

const addChildren = ( treeData, results, ...rest ) => {
  for( const node of treeData ) { 
    if ( node.children && node.children.length > 0 ) { 
      addChildren( node.children, results, node.text, ...rest )
    } else {
      let row = {} 
      for( let i = rest.length-1, level = 1; i >= 0; i--, level++) {
        row['level'+level] = rest[i]
      }
      row.facility = node.text
      row.lat = node.lat
      row.long = node.long
      results.push(row)
    }
  }   
}
const headerText = {
  level1: 'Level 1',
  level2: 'Level 2',
  level3: 'Level 3',
  level4: 'Level 4',
  level5: 'Level 5',
  level6: 'Level 6',
  level7: 'Level 7',
  level8: 'Level 8',
  level9: 'Level 9',
  facility: 'Facility',
  latitude: 'Latitude',
  longitude: 'Longitude'
}


export default {
  data () {
    return {
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
      datimPagination: { rowsPerPage: 20 },
      mohPagination: { rowsPerPage: 20 }
    }
  },
  computed: {
    datimGridData () {
      var results = [ ]
      addChildren( this.datimTreeData, results )
      return results
    },
    datimGridHeader () {
      header = {}
      if ( this.datimGridData && this.datimGridData.length > 0 ) {
        for( let key of this.datimGridData[0].keys() ) {
          header[key] = { text: headerText[key], value: key }
        }
      }
      return [ header ]
    },
    mohGridData () {
      var results = [ ]
      addChildren( this.mohTreeData, results )
      return results
    },
    mohGridHeader () {
      header = {}
      if ( this.mohGridData && this.mohGridData.length > 0 ) {
        for( let key of this.mohGridData[0].keys() ) {
          header[key] = { text: headerText[key], value: key }
        }
      }
      return [ header ]
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
  components: {
    'liquor-tree': LiquorTree
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
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
