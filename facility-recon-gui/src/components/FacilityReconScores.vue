<template>
	<v-container grid-list-lg >
		<v-dialog persistent v-model="dialog" width="800px">
      <v-card>
        <v-card-title>
        	MOH &nbsp;<b>{{ selectedMohName }}</b>
        </v-card-title>
        <v-card-text>
          <v-data-table
	            :headers="potentialHeaders"
	            :items="potentialMatches"
	            hide-actions
	            class="elevation-1"
	          >
	          <template slot="items" slot-scope="props">
	          	<tr @click='changeMappingSelection(props.item.id,props.item.name)'>
		          	<v-radio-group v-model='selectedDatimId' style="height: 5px">
		          		<td><v-radio :value="props.item.id" color="red"></v-radio></td>
		          	</v-radio-group>
		            <td>{{props.item.name}}</td>
		            <td>{{props.item.id}}</td>
		            <td>{{props.item.lat}}</td>
		            <td>{{props.item.long}}</td>
		            <td>{{props.item.score}}</td>
	          	</tr>
	          </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions style='float: center'>
          <v-btn color="error" @click.native="match('flag')"><v-icon dark left>notification_important</v-icon>Flag</v-btn>
          <v-btn color="green" dark @click.native="noMatch" ><v-icon left>block</v-icon>No Match</v-btn>
          <v-btn color="primary" dark @click.native="match('match')" ><v-icon left>save</v-icon>Save</v-btn>
          <v-btn color="orange darken-2" @click.native="dialog = !dialog" style='color: white'><v-icon dark left >arrow_back</v-icon>Back</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-layout row wrap>
    	<v-spacer></v-spacer>
    	<v-flex xs1 sm2 md2 right>
	      <v-select
	        :items="levelArray"
	        v-model="$store.state.recoLevel"
	        :item-value = 'levelArray.value'
	        :item-name = 'levelArray.text'
	        label="Level"
	        class="input-group--focused"
	        height = '1'
	        single-line
	        @change="levelChanged"
	      	>
	      </v-select>
    	</v-flex>
    	<v-flex xs1 sm2 md2>
        <v-menu offset-y>
		      <v-btn slot="activator" color="primary" dark><v-icon>more_vert</v-icon>Actions</v-btn>
		      <v-list>
		        <v-list-tile :key="1" @click="getScores">
		          <v-list-tile-title>Recalculate Scores</v-list-tile-title>
		        </v-list-tile>
		        <v-list-tile :key="2" @click="">
		        	<v-list-tile-title>Action 2</v-list-tile-title>
		      	</v-list-tile>
		      	<v-list-tile :key="3" @click="">
		        	<v-list-tile-title>Action 3</v-list-tile-title>
		      	</v-list-tile>
		      </v-list>
    		</v-menu>
      </v-flex>
    </v-layout>
    <v-layout row wrap>
      <v-flex xs12 sm6 md6 child-flex>
        <v-card color="green lighten-2" dark>
        	<v-card-title primary-title>
        	  MOH Unmatched
        	  <v-spacer></v-spacer>
        	  <v-text-field
              v-model="searchUnmatchedMoh"
              append-icon="search"
              label="Search"
              single-line
              hide-details
            ></v-text-field>
        	</v-card-title>
        	<template v-if='mohUnMatched.length > 0'>
              <liquor-tree :data="mohTree" ref="mohTree" />
	          <v-data-table
	            :headers="mohGridHeaders"
	            :items="mohGrid"
	            :search="searchUnmatchedMoh"
	            light
	            class="elevation-1"
	          >
		          <template slot="items" slot-scope="props">
			            <td @click="getPotentialMatch(props.item.id)" style="cursor: pointer">{{props.item.name}}</td>
                        <td v-for="parent in props.item.parents">
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
      <v-flex xs12 sm6 md6>
        <v-card color="blue lighten-2" dark>
        	<v-card-title primary-title>
        	  DATIM Unmatched
        	  <v-spacer></v-spacer>
        	  <v-text-field
              v-model="searchUnmatchedDatim"
              append-icon="search"
              label="Search"
              single-line
              hide-details
            ></v-text-field>
        	</v-card-title>
        	<template v-if='datimUnMatched.length > 0'>
	          <v-data-table
	            :headers="mohUnmatchedHeaders"
	            :items="datimUnMatched"
	            :search="searchUnmatchedDatim"
	            light
	            class="elevation-1"
	          >
		          <template slot="items" slot-scope="props">
			            <td>{{props.item.name}} <br>{{props.item.parents}}</td>
		          </template>
          	</v-data-table>
        	</template>
          <template v-else>
        		<v-progress-linear :size="70" indeterminate color="amber"></v-progress-linear>
        	</template>
        </v-card>
      </v-flex>
    </v-layout>
    <v-layout column wrap>
      <v-tabs icons-and-text centered grow dark color="cyan">
        <v-tabs-slider color="red"></v-tabs-slider>
        <v-tab key="match">
          MATCHED
          <v-icon color="white" right>thumb_up</v-icon>
        </v-tab>
        <v-tab key="nomatch">
          NO MATCH
          <v-icon color="white" right>thumb_down</v-icon>
        </v-tab>
        <v-tab key="flagged">
          FLAGGED
          <v-icon color="white" right>notification_important</v-icon>
        </v-tab>
        <v-tab-item key="match">
      	  <v-text-field
            v-model="searchMatched"
            append-icon="search"
            label="Search"
            single-line
            hide-details
          ></v-text-field>
	      	<v-data-table
	              :headers="matchedHeaders"
	              :items="matchedContent"
	              :search="searchMatched"
	              class="elevation-1"
	            >
            <template slot="items" slot-scope="props">
              <td>{{props.item.mohName}}</td>
              <td>{{props.item.mohId}}</td>
              <td>{{props.item.datimName}}</td>
              <td>{{props.item.datimId}}</td>
              <td><v-btn color="error" style='text-transform: none' small @click='breakMatch(props.item.datimId)'><v-icon>cached</v-icon>Break Match</v-btn></td>
            </template>
	        </v-data-table>
		    </v-tab-item>
		    <v-tab-item key="nomatch">
		    	<v-text-field
            v-model="searchNotMatched"
            append-icon="search"
            label="Search"
            single-line
            hide-details
          ></v-text-field>
	      	<v-data-table
	              :headers="noMatchHeaders"
	              :items="noMatchContent"
	              :search="searchNotMatched"
	              class="elevation-1"
	            >
            <template slot="items" slot-scope="props">
              <td>{{props.item.mohName}}</td>
              <td>{{props.item.mohId}}</td>
              <td>{{props.item.parents}}</td>
              <td><v-btn color="error" style='text-transform: none' small @click=''><v-icon>cached</v-icon>Break No Match</v-btn></td>
            </template>
	        </v-data-table>
		    </v-tab-item>
		    <v-tab-item key="flagged">
		    	<v-text-field
            v-model="searchFlagged"
            append-icon="search"
            label="Search"
            single-line
            hide-details
          ></v-text-field>
	      	<v-data-table
	              :headers="flaggedHeaders"
	              :items="flagged"
	              :search="searchFlagged"
	              class="elevation-1"
	            >
            <template slot="items" slot-scope="props">
              <td>{{props.item.mohName}}</td>
              <td>{{props.item.mohId}}</td>
              <td>{{props.item.datimName}}</td>
              <td>{{props.item.datimId}}</td>
              <td>
              	<v-btn color="primary" style='text-transform: none' small @click=''>
              		<v-icon>thumb_up</v-icon>Confirm Match
              	</v-btn>
              	<v-btn color="error" style='text-transform: none' small @click=''>
              		<v-icon>cached</v-icon>Release
              	</v-btn>
              </td>
            </template>
	        </v-data-table>
		    </v-tab-item>
      </v-tabs>
      </v-flex>
    </v-layout>
  </v-container>

</template>

<script>
import axios from 'axios'
import LiquorTree from 'liquor-tree'

const config = require('../../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)

export default {
  data () {
    return {
      levelArray: [],
      recoLevel: 0,
      searchUnmatchedDatim: '',
      searchUnmatchedMoh: '',
      searchMatched: '',
      searchNotMatched: '',
      searchFlagged: '',
      scoreResults: {},
      potentialMatches: [],
      matchedContent: [],
      noMatchContent: [],
      flagged: [],
      datimUnMatched: [],
      mohUnMatched: [],
      mohParents: {},
      mohFilter: { text: '', level: '' },
      selectedMohName: '',
      selectedMohId: '',
      selectedDatimId: '',
      selectedDatimName: '',
      dialog: false,
      mohUnmatchedHeaders: [
        { text: 'Location', value: 'name' }
      ],
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
      ],
      potentialHeaders: [
        { sortable: false },
        { text: 'DATIM Location', value: 'name', sortable: false },
        { text: 'ID', value: 'id', sortable: false },
        { text: 'Lat', value: 'lat', sortable: false },
        { text: 'Long', value: 'long', sortable: false },
        { text: 'Score', value: 'score' }
      ]
    }
  },
  methods: {
    levelChanged (level) {
      this.$store.state.recoLevel = level
      this.getScores()
    },
    getScores () {
      let orgid = this.$store.state.orgUnit.OrgId
      let recoLevel = this.$store.state.recoLevel
      let totalLevels = this.$store.state.totalLevels
      this.matchedContent = []
      this.noMatchContent = []
      this.datimUnMatched = []
      this.mohUnMatched = []
      this.flagged = []
      // generating levels
      this.levelArray = []
      for (var k = 1; k <= this.$store.state.totalLevels; k++) {
        this.levelArray.push({text: 'Level ' + k, value: k})
      }
      axios.get(backendServer + '/reconcile/' + orgid + '/' + totalLevels + '/' + recoLevel).then((scores) => {
        this.getDatimUnmached()
        this.scoreResults = scores.data.scoreResults
        for (let scoreResult of this.scoreResults) {
          if (scoreResult.moh.hasOwnProperty('tag') && scoreResult.moh.tag === 'flagged') {
            this.flagged.push({
              mohName: scoreResult.moh.name,
              mohId: scoreResult.moh.id,
              mohParents: scoreResult.moh.parents.join('->'),
              datimName: scoreResult.exactMatch.name,
              datimId: scoreResult.exactMatch.id,
              datimParents: scoreResult.exactMatch.parents.join('->')
            })
          } else if (scoreResult.moh.hasOwnProperty('tag') && scoreResult.moh.tag === 'noMatch') {
            let parents = scoreResult.moh.parents.join('->')
            this.noMatchContent.push({
              mohName: scoreResult.moh.name,
              mohId: scoreResult.moh.id,
              parents: parents
            })
          } else if (Object.keys(scoreResult.exactMatch).length > 0) {
            this.matchedContent.push({
              mohName: scoreResult.moh.name,
              mohId: scoreResult.moh.id,
              mohParents: scoreResult.moh.parents.join('->'),
              datimName: scoreResult.exactMatch.name,
              datimId: scoreResult.exactMatch.id,
              datimParents: scoreResult.exactMatch.parents.join('->')
            })
          } else if (Object.keys(scoreResult.potentialMatches).length > 0) {
            // let parents = scoreResult.moh.parents.join('->')
            let addTree = this.mohParents
            for (let i = scoreResult.moh.parents.length - 1; i >= 0; i--) {
              if (!addTree[scoreResult.moh.parents[i]]) {
                addTree[scoreResult.moh.parents[i]] = {}
              }
              addTree = addTree[scoreResult.moh.parents[i]]
            }
            this.mohUnMatched.push({
              name: scoreResult.moh.name,
              id: scoreResult.moh.id,
              // parents: parents
              parents: scoreResult.moh.parents
            })
          }
        }
      })
    },
    getDatimUnmached () {
      let orgid = this.$store.state.orgUnit.OrgId
      let recoLevel = this.$store.state.recoLevel
      axios.get(backendServer + '/getUnmatched/' + orgid + '/datim/' + recoLevel).then((unmatched) => {
        this.datimUnMatched = unmatched.data
      })
    },
    getPotentialMatch (id) {
      this.potentialMatches = []
      for (let scoreResult of this.scoreResults) {
        if (scoreResult.moh.id === id) {
          this.selectedMohName = scoreResult.moh.name
          this.selectedMohId = scoreResult.moh.id
          for (let score in scoreResult.potentialMatches) {
            for (let j in scoreResult.potentialMatches[score]) {
              let potentials = scoreResult.potentialMatches[score][j]
              var matched = this.matchedContent.find((matched) => {
                return matched.datimId === potentials.id
              })
              if (matched) {
                continue
              }
              this.potentialMatches.push({
                score: score,
                name: potentials.name,
                id: potentials.id,
                parents: potentials.parents.join('->')
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
      if (this.selectedDatimId === '') {
        return alert('select datim org')
      }
      let formData = new FormData()
      formData.append('mohId', this.selectedMohId)
      formData.append('datimId', this.selectedDatimId)
      formData.append('recoLevel', this.$store.state.recoLevel)
      formData.append('totalLevels', this.$store.state.totalLevels)
      var orgid = this.$store.state.orgUnit.OrgId
      // remove from DATIM Unmatched
      let datimParents = null
      for (let k in this.datimUnMatched) {
        if (this.datimUnMatched[k].id === this.selectedDatimId) {
          datimParents = this.datimUnMatched[k].parents
          this.datimUnMatched.splice(k, 1)
        }
      }

      // Add from a list of MOH Matched and remove from list of MOH unMatched
      for (let k in this.mohUnMatched) {
        if (this.mohUnMatched[k].id === this.selectedMohId) {
          if (type === 'match') {
            this.matchedContent.push({
              mohName: this.selectedMohName,
              mohId: this.selectedMohId,
              mohParents: this.mohUnMatched[k].parents,
              datimName: this.selectedDatimName,
              datimId: this.selectedDatimId,
              datimParents: datimParents
            })
          } else if (type === 'flag') {
            this.flagged.push({
              mohName: this.selectedMohName,
              mohId: this.selectedMohId,
              mohParents: this.mohUnMatched[k].parents,
              datimName: this.selectedDatimName,
              datimId: this.selectedDatimId,
              datimParents: datimParents
            })
          }
          this.mohUnMatched.splice(k, 1)
        }
      }
      this.selectedMohId = null
      this.selectedMohName = null
      this.selectedDatimId = null
      this.dialog = false
      axios.post(backendServer + '/match/' + type + '/' + orgid, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(() => {
      }).catch((err) => {
        console.log(err)
      })
    },
    breakMatch (datimId) {
      let orgid = this.$store.state.orgUnit.OrgId
      let formData = new FormData()
      formData.append('datimId', datimId)
      axios.post(backendServer + '/breakMatch/' + orgid, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).catch((err) => {
        console.log(err)
      })

      for (let k in this.matchedContent) {
        if (this.matchedContent[k].datimId === datimId) {
          this.mohUnMatched.push({
            name: this.matchedContent[k].mohName,
            id: this.matchedContent[k].mohId,
            parents: this.matchedContent[k].mohParents
          })
          this.datimUnMatched.push({
            name: this.matchedContent[k].datimName,
            id: this.matchedContent[k].datimId,
            parents: this.matchedContent[k].datimParents
          })
          this.matchedContent.splice(k, 1)
        }
      }
    },
    noMatch () {
      let formData = new FormData()
      formData.append('mohId', this.selectedMohId)
      formData.append('recoLevel', this.$store.state.recoLevel)
      formData.append('totalLevels', this.$store.state.totalLevels)
      let orgid = this.$store.state.orgUnit.OrgId

      // remove from MOH Unmatched
      for (let k in this.mohUnMatched) {
        if (this.mohUnMatched[k].id === this.selectedMohId) {
          this.noMatchContent.push({
            mohName: this.selectedMohName,
            mohId: this.selectedMohId,
            parents: this.mohUnMatched[k].parents
          })
          this.mohUnMatched.splice(k, 1)
        }
      }
      this.dialog = false
      this.selectedMohId = null
      this.selectedMohName = null
      this.selectedDatimId = null
      axios.post(backendServer + '/noMatch/' + orgid, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(() => {
      }).catch((err) => {
        console.log(err)
      })
    }
  },
  computed: {
    mohGridHeaders () {
      let header = [ { text: 'Location', value: 'name' } ]
      if (this.mohUnMatched.length > 0) {
        for (let i = this.mohUnMatched[0].parents.length; i > 0; i--) {
          header.push({ text: 'Level ' + i, value: 'level' + i })
        }
      }
      return header
    },
    mohTree () {
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
      createTree(this.mohParents, results)
      return results
    },
    mohGrid () {
      if (this.mohUnMatched.length > 0 && this.mohFilter.level !== '') {
        let parentIdx = this.mohUnMatched[0].parents.length - this.mohFilter.level
        return this.mohUnMatched.filter((location) => location.parents[parentIdx] === this.mohFilter.text)
      }
      return this.mohUnMatched
    }
    /*
    mohUnMatched () {
      let results = []
      for (let scoreresult of this.scoreResults){
        if( Object.keys(scoreResult.exactMatch) === 0) {
          let parents = scoreResult.moh.parents.join('->')
          results.push({
            name: scoreResult.moh.name,
            id: scoreResult.moh.id,
            parents: parents
          })
        }
      }
      return results
    }
    */
  },
  created () {
    this.getScores()
  },
  mounted () {
    const setListener = () => {
      if (this.$refs && this.$refs.mohTree) {
        this.$refs.mohTree.$on('node:selected', (node) => {
          this.mohFilter.text = node.data.text
          let level = 1
          while (node.parent) {
            node = node.parent
            level++
          }
          this.mohFilter.level = level
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

<style>

</style>
