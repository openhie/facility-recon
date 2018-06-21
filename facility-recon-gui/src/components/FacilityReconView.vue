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
                    :headers="headers"
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
                    :headers="headers"
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
      datimPagination: {rowsPerPage:20},
      mohPagination: {rowsPerPage:20}
    }
  },
  computed: {
    datimGridData () {
      var results = [ ]
      for (var i in this.datimTreeData) {
        for (var j in this.datimTreeData[i].children) {
          for (var k in this.datimTreeData[i].children[j].children) {
            for (var l in this.datimTreeData[i].children[j].children[k].children) {
              for (var m in this.datimTreeData[i].children[j].children[k].children[l].children) {
                results.push({
                  level1: this.datimTreeData[i].text,
                  level2: this.datimTreeData[i].children[j].text,
                  level3: this.datimTreeData[i].children[j].children[k].text,
                  level4: this.datimTreeData[i].children[j].children[k].children[l].text,
                  facility: this.datimTreeData[i].children[j].children[k].children[l].children[m].text,
                  latitude: this.datimTreeData[i].children[j].children[k].children[l].children[m].lat,
                  longitude: this.datimTreeData[i].children[j].children[k].children[l].children[m].long
                })
              }
            }
          }
        }
      }
      return results
    },
    mohGridData () {
      var results = [  ]
      for (var i in this.mohTreeData) {
        for (var j in this.mohTreeData[i].children) {
          for (var k in this.mohTreeData[i].children[j].children) {
            for (var l in this.mohTreeData[i].children[j].children[k].children) {
              for (var m in this.mohTreeData[i].children[j].children[k].children[l].children) {
                results.push({
                  level1: this.mohTreeData[i].text,
                  level2: this.mohTreeData[i].children[j].text,
                  level3: this.mohTreeData[i].children[j].children[k].text,
                  level4: this.mohTreeData[i].children[j].children[k].children[l].text,
                  facility: this.mohTreeData[i].children[j].children[k].children[l].children[m].text,
                  latitude: this.mohTreeData[i].children[j].children[k].children[l].children[m].lat,
                  longitude: this.mohTreeData[i].children[j].children[k].children[l].children[m].long
                })
              }
            }
          }
        }
      }
      return results
    },
    datimPages () {
      if (this.datimPagination.rowsPerPage == null ||  this.datimPagination.totalItems == null ) 
        return 0
      return Math.ceil(this.datimPagination.totalItems / this.datimPagination.rowsPerPage)
    },
    mohPages () {
      if (this.mohPagination.rowsPerPage == null ||  this.mohPagination.totalItems == null ) 
        return 0
      return Math.ceil(this.mohPagination.totalItems / this.mohPagination.rowsPerPage)
    },
    datimTreeData(){
      return this.$store.state.datimHierarchy.data
    },
    mohTreeData(){
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
