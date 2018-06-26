<template>
	<v-container grid-list-xl>
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
	          </v-radio-group>
          </v-data-table>
        </v-card-text>
        <v-card-actions style='float: center'>
          <v-btn color="error" @click.native="flag(selectedDatimId)"><v-icon>notification_important</v-icon>Flag</v-btn>
          <v-btn color="primary" dark @click.native="noMatch" ><v-icon>block</v-icon>No Match</v-btn>
          <v-btn color="primary" dark @click.native="match(selectedDatimId)" ><v-icon>save</v-icon>Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-layout row wrap>
      <v-flex xs12 sm6 md2>
        <v-card color="purple" dark>
          <v-card-title primary class="title">Progress</v-card-title>
          <v-card-text></v-card-text>
        </v-card>
      </v-flex>
      <v-flex xs12 sm6 md5 child-flex>
        <v-card color="green lighten-2" dark>
        	<v-card-title primary-title>
        	  MOH Unmatched
        	</v-card-title>
          <v-card-text>
          	<v-list light dense expand>
          	  <template v-for="(unMatched,key) in mohUnMatched">
          	  	<v-list-tile @click="getPotentialMatch(unMatched.id)" :key='unMatched.id'>
          	  		<v-list-tile-content>
          	  			<v-list-tile-title v-html="unMatched.name"></v-list-tile-title>
          	  			<v-list-tile-sub-title v-html="unMatched.parents"></v-list-tile-sub-title>
          	  		</v-list-tile-content>
          	  	</v-list-tile>
        	  	</template>
          	</v-list>
          </v-card-text>
        </v-card>
      </v-flex>
      <v-flex xs12 sm6 md5>
        <v-card color="blue lighten-2" dark>
        	<v-card-title primary-title>
        	  DATIM Unmatched
        	</v-card-title>
          <v-card-text>Org1<br>org2</v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
    <v-layout column wrap>
      <v-flex d-flex xs12 sm6 md5>
        <v-card color="blue lighten-2" dark>
        	<v-card-title primary-title>
        		MOH to DATIM Matched Locations
        	</v-card-title>
          <v-card-text>
          	<v-data-table
              :headers="matchedHeaders"
              :items="matchedContent"
              hide-actions
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
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>

</template>

<script>
	import axios from 'axios'
	export default {
		data(){
			return {
				scoreResults: {},
				recoLevel:0,
				potentialMatches: [],
				matchedContent: [],
				selectedMohName: '',
				selectedMohId: '',
				selectedDatimId: '',
				selectedDatimName: '',
				dialog: false,
				matchedHeaders: [
	        { text: 'MOH Location', value: 'mohName' },
	        { text: 'MOH ID', value: 'mohId' },
	        { text: 'DATIM Location', value: 'datimName' },
	        { text: 'DATIM ID', value: 'datimId' }
      	],
				potentialHeaders: [
					{sortable: false},
	        { text: 'DATIM Location', value: 'name', sortable: false },
	        { text: 'ID', value: 'id', sortable: false },
	        { text: 'Lat', value: 'lat', sortable: false },
	        { text: 'Long', value: 'long', sortable: false },
	        { text: 'Score', value: 'score' }
      	]
			}
		},
		methods: {
			getScores(){
				var orgid = this.$store.state.orgUnit.OrgId
				axios.get('http://localhost:3000/reconcile/' + orgid).then((scores) => {
					this.scoreResults = scores.data.scoreResults
					this.recoLevel = scores.data.recoLevel
					for(var k in this.scoreResults){
						var scoreResult = this.scoreResults[k]
						if(Object.keys(scoreResult.exactMatch).length > 0){
							this.matchedContent.push({
								mohName:scoreResult.moh.name,
								mohId:scoreResult.moh.id,
								datimName:scoreResult.exactMatch.name,
								datimId:scoreResult.exactMatch.id
								}
							)
						}
					}
				})
			},
			getPotentialMatch(id){
				this.potentialMatches = []
				for(var k in this.scoreResults) {
					var scoreResult = this.scoreResults[k]
					if(scoreResult.moh.id == id) {
						this.selectedMohName = scoreResult.moh.name
						this.selectedMohId = scoreResult.moh.id
						for(var score in scoreResult.potentialMatches){
							for(var j in scoreResult.potentialMatches[score]){
								var potentials = scoreResult.potentialMatches[score][j]
								this.potentialMatches.push({
										score: score,
										name: potentials.name,
										id: potentials.id
									}
								)
							}
						}
					}
				}
				this.dialog = true
			},
			changeMappingSelection(id,name){
				this.selectedDatimId = id
				this.selectedDatimName = name
			},
			flag(){

			},
			match(){
				let formData = new FormData()
				formData.append('mohId', this.selectedMohId)
				formData.append('datimId', this.selectedDatimId)
				formData.append('recoLevel',this.recoLevel)
				formData.append('totalLevels',this.$store.state.totalLevels)
				var orgid = this.$store.state.orgUnit.OrgId
				for(var k in this.mohUnMatched) {
					if(this.mohUnMatched[k].id == this.selectedMohId){
						this.mohUnMatched.splice(k,1)
						this.matchedContent.push({
							mohName: this.selectedMohName,
							mohId: this.selectedMohId,
							datimName: this.selectedDatimName,
							datimId: this.selectedDatimId
						})
					}
				}
				this.selectedMohId = null
				this.selectedMohName = null
				this.selectedDatimId = null
				this.dialog = false
				axios.post('http://localhost:3000/match/' + orgid,
					formData,
					{
          	headers: {
            'Content-Type': 'multipart/form-data'
          	}
        	}
				).then(()=>{

				}).catch((err)=>{
					console.log(err)
				})
			},
			breakMatch(datimId){
				var orgid = this.$store.state.orgUnit.OrgId
				let formData = new FormData()
				formData.append('datimId', datimId)
				axios.post('http://localhost:3000/breakMatch/' + orgid,
					formData,
					{
						headers: {
            'Content-Type': 'multipart/form-data'
          	}
					}
				).catch((err)=>{
					console.log(err)
				})
				for(var k in this.matchedContent){
					if(this.matchedContent[k].datimId == datimId){
						this.mohUnMatched.push({
							name: this.matchedContent[k].mohName,
							id:this.matchedContent[k].mohId,
							parents:''
						})
						this.matchedContent.splice(k,1)
					}
				}
			},
			noMatch(){
				this.dialog = false
			}
		},
		computed: {
			mohUnMatched() {
				var results = []
				for(var k in this.scoreResults){
					var scoreResult = this.scoreResults[k]
					if(Object.keys(scoreResult.exactMatch) == 0){
						var parents = scoreResult.moh.parents.join('->')
						results.push({
							name: scoreResult.moh.name,
							id: scoreResult.moh.id,
							parents: parents
							}
						)
					}
				}
				return results
			}
		},
		created() {
			this.getScores()
		}
	}
</script>

<style>

</style>