<template>
  <v-container fluid>
    <template v-if="!datimTreeData">
      <v-progress-linear :indeterminate="true"></v-progress-linear>
    </template>
    <template v-else>
      <v-slide-y-transition mode="out-in">
        <v-layout row>
          <v-flex xs3>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">PEPFAR Data Tree</h3>
              </v-card-title>
              <v-card-text>
                <p><liquor-tree
                  :data="datimTreeData"
                  :options="{}" /></p>
              </v-card-text>
            </v-card>
          </v-flex>
          <v-flex xs3>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">PEPFAR Data Grid</h3>
              </v-card-title>
              <v-card-text>
                <v-data-table
                  :headers="headers"
                  :items="datimGridData"
                  hide-actions
                  class="elevation-1"
                >
                  <template slot="items" slot-scope="props">
                    <td>{{props.item.country}}</td>
                    <td>{{props.item.region}}</td>
                    <td>{{props.item.district}}</td>
                    <td>{{props.item.facility}}</td>
                    <td class="text-xs-right">{{props.item.longitude}}</td>
                    <td class="text-xs-right">{{props.item.latitude}}</td>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-flex>
           <v-flex xs3>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">MoH Data Tree</h3>
              </v-card-title>
              <v-card-text>
                <p><liquor-tree
                  :data="mohTreeData"
                  :options="{}" /></p>
              </v-card-text>
            </v-card>
          </v-flex>
           <v-flex xs3>
            <v-card>
              <v-card-title primary-title>
                <h3 class="headline mb-0">MoH Data Grid</h3>
              </v-card-title>
              <v-card-text>
                <v-data-table
                  :headers="headers"
                  :items="mohGridData"
                  hide-actions
                  class="elevation-1"
                >
                  <template slot="items" slot-scope="props">
                    <td>{{props.item.country}}</td>
                    <td>{{props.item.region}}</td>
                    <td>{{props.item.district}}</td>
                    <td>{{props.item.facility}}</td>
                    <td class="text-xs-right">{{props.item.longitude}}</td>
                    <td class="text-xs-right">{{props.item.latitude}}</td>
                  </template>
                </v-data-table>
              </v-card-text>
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
        { text: 'Country', value: 'country' },
        { text: 'Region', value: 'region' },
        { text: 'District', value: 'district' },
        { text: 'Facility', value: 'facility' },
        { text: 'Latitude', value: 'latitude' },
        { text: 'Longitude', value: 'longitude' }
      ]
    }
  },
  computed: {
    datimGridData () {
      var results = [ { country: 'Text', region: 'Test', district: 'Test', facility: 'Test', latitude: 1.11, longitude: 1.11 } ]
      for (var i in this.datimTreeData) {
        for (var j in this.datimTreeData[i].children) {
          for (var k in this.datimTreeData[i].children[j].children) {
            for (var l in this.datimTreeData[i].children[j].children[k].children) {
              for (var m in this.datimTreeData[i].children[j].children[k].children[l].children) {
                results.push({
                  country: this.datimTreeData[i].text,
                  region: this.datimTreeData[i].children[j].text,
                  district: this.datimTreeData[i].children[j].children[k].text,
                  county: this.datimTreeData[i].children[j].children[k].children[l].text,
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
      var results = [ { country: 'Text', region: 'Test', district: 'Test', facility: 'Test', latitude: 1.11, longitude: 1.11 } ]
      for (var i in this.mohTreeData) {
        for (var j in this.mohTreeData[i].children) {
          for (var k in this.mohTreeData[i].children[j].children) {
            for (var l in this.mohTreeData[i].children[j].children[k].children) {
              for (var m in this.mohTreeData[i].children[j].children[k].children[l].children) {
                results.push({
                  country: this.mohTreeData[i].text,
                  region: this.mohTreeData[i].children[j].text,
                  district: this.mohTreeData[i].children[j].children[k].text,
                  county: this.mohTreeData[i].children[j].children[k].children[l].text,
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
