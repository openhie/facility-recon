<template>
	<v-container fluid>
		<v-dialog v-model="mappingStatusDialog" hide-overlay persistent width="350">
			<v-card color="white" dark>
				<v-card-text>
					<center>
						<font style="color:blue">{{mappingStatusProgressTitle}}</font><br>
						<v-progress-circular :rotate="-90" :size="100" :width="15" :value="mappingStatusProgressPercent" color="primary" v-if="progressType == 'percent'">
							<v-avatar color="indigo" size="50px">
								<span class="white--text">
									<b>{{ mappingStatusProgressPercent }}%</b>
								</span>
							</v-avatar>
						</v-progress-circular>
						<v-progress-linear indeterminate color="red" class="mb-0" v-if="progressType == 'indeterminate'"></v-progress-linear>
					</center>
				</v-card-text>
			</v-card>
		</v-dialog>
		<v-layout column>
			<v-flex xs1>
				<v-layout row wrap>
					<v-flex xs6>
						<b>All Levels</b>
					</v-flex>
					<v-spacer></v-spacer>
					<v-flex xs4>
						<b>Level {{recoLevel-1}} Only</b>
					</v-flex>
				</v-layout>
			</v-flex>
			<v-flex xs1>
				<v-layout row wrap>
					<v-flex xs1>
						<v-chip color="red" text-color='white' style='height:138px;width:137px'>
							<v-layout column>
								<v-flex xs1>
									<v-icon light>thumb_up</v-icon>
									<b>MOH Matched</b>
								</v-flex>
								<v-flex xs1 align-center>
									<center>
										<b>{{$store.state.totalAllMapped}}/{{$store.state.mohTotalAllRecords}}</b>
									</center>
								</v-flex>
								<v-flex xs1>
									<center>
										<v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentMapped" color="yellow">
											<font color="white">
												<b>{{ mohPercentMapped }}%</b>
											</font>
										</v-progress-circular>
									</center>
								</v-flex>
							</v-layout>
						</v-chip>
					</v-flex>
					<v-flex xs1>
						<v-chip color="red" text-color='white' style='height:138px;width:144px'>
							<v-layout column>
								<v-flex xs1>
									<v-icon light>thumb_up</v-icon>
									<b>MOH Not Mapped</b>
								</v-flex>
								<v-flex xs1 align-center>
									<center>
										<b>{{$store.state.mohTotalAllNotMapped}}/{{$store.state.mohTotalAllRecords}}</b>
									</center>
								</v-flex>
								<v-flex xs1>
									<center>
										<v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentNotMapped" color="yellow">
											<font color="white">
												<b>{{ mohPercentNotMapped }}%</b>
											</font>
										</v-progress-circular>
									</center>
								</v-flex>
							</v-layout>
						</v-chip>
					</v-flex>
					<v-flex xs1>
						<v-chip color="red" text-color='white' style='height:138px;width:137px'>
							<v-layout column>
								<v-flex xs1>
									<v-icon light>thumb_down</v-icon>
									<b>MOH No Match</b>
								</v-flex>
								<v-flex xs1 align-center>
									<center>
										<b>{{$store.state.totalAllNoMatch}}/{{$store.state.mohTotalAllRecords}}</b>
									</center>
								</v-flex>
								<v-flex xs1>
									<center>
										<v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentNoMatch" color="yellow">
											<font color="white">
												<b>{{ mohPercentNoMatch }}%</b>
											</font>
										</v-progress-circular>
									</center>
								</v-flex>
							</v-layout>
						</v-chip>
					</v-flex>
					<v-flex xs1>
						<v-chip color="red" text-color='white' style='height:138px;width:137px'>
							<v-layout column>
								<v-flex xs1>
									<v-icon light>notification_important</v-icon>
									<b>MOH Flagged</b>
								</v-flex>
								<v-flex xs1 align-center>
									<center>
										<b>{{$store.state.totalAllFlagged}}/{{$store.state.mohTotalAllRecords}}</b>
									</center>
								</v-flex>
								<v-flex xs1>
									<center>
										<v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentFlagged" color="yellow">
											<font color="white">
												<b>{{ mohPercentFlagged }}%</b>
											</font>
										</v-progress-circular>
									</center>
								</v-flex>
							</v-layout>
						</v-chip>
					</v-flex>
					<v-flex xs1>
						<v-chip color="red" text-color='white' style='height:138px;width:137px'>
							<v-layout column>
								<v-flex xs1>
									<v-icon light>thumb_up</v-icon>
									<b>DATIM Matched</b>
								</v-flex>
								<v-flex xs1 align-center>
									<center>
										<b>{{$store.state.totalAllMapped}}/{{$store.state.datimTotalAllRecords}}</b>
									</center>
								</v-flex>
								<v-flex xs1>
									<center>
										<v-progress-circular :rotate="-90" :size="65" :width="8" :value="datimPercentMapped" color="yellow">
											<font color="white">
												<b>{{ datimPercentMapped }}%</b>
											</font>
										</v-progress-circular>
									</center>
								</v-flex>
							</v-layout>
						</v-chip>
					</v-flex>
					<v-flex xs1>
						<v-chip color="red" text-color='white' style='height:138px;width:137px'>
							<v-layout column>
								<v-flex xs1>
									<v-icon light>notification_important</v-icon>
									<b>DATIM Flagged</b>
								</v-flex>
								<v-flex xs1 align-center>
									<center>
										<b>{{$store.state.totalAllFlagged}}/{{$store.state.datimTotalAllRecords}}</b>
									</center>
								</v-flex>
								<v-flex xs1>
									<center>
										<v-progress-circular :rotate="-90" :size="65" :width="8" :value="datimPercentFlagged" color="yellow">
											<font color="white">
												<b>{{ datimPercentFlagged }}%</b>
											</font>
										</v-progress-circular>
									</center>
								</v-flex>
							</v-layout>
						</v-chip>
					</v-flex>
					<v-spacer></v-spacer>
					<v-flex xs1>
						<v-chip color="green" text-color='white' style='height:138px;width:137px'>
							<v-layout column>
								<v-flex xs1>
									<v-icon light>thumb_up</v-icon>
									<b>MOH Matched</b>
								</v-flex>
								<v-flex xs1 align-center>
									<center>
										<b>{{totalMapped}}/{{totalRecords}}</b>
									</center>
								</v-flex>
								<v-flex xs1>
									<center>
										<v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentMappedLevel" color="yellow">
											<font color="white">
												<b>{{ mohPercentMappedLevel }}%</b>
											</font>
										</v-progress-circular>
									</center>
								</v-flex>
							</v-layout>
						</v-chip>
					</v-flex>
					<v-flex xs1>
						<v-chip color="green" text-color='white' style='height:138px;width:137px'>
							<v-layout column>
								<v-flex xs1>
									<v-icon light>thumb_down</v-icon>
									<b>MOH No Match</b>
								</v-flex>
								<v-flex xs1 align-center>
									<center>
										<b>{{totalNoMatch}}/{{totalRecords}}</b>
									</center>
								</v-flex>
								<v-flex xs1>
									<center>
										<v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentNoMatchLevel" color="yellow">
											<font color="white">
												<b>{{ mohPercentNoMatchLevel }}%</b>
											</font>
										</v-progress-circular>
									</center>
								</v-flex>
							</v-layout>
						</v-chip>
					</v-flex>
					<v-flex xs1>
						<v-chip color="green" text-color='white' style='height:138px;width:137px'>
							<v-layout column>
								<v-flex xs1>
									<v-icon light>notification_important</v-icon>
									<b>MOH Flagged</b>
								</v-flex>
								<v-flex xs1 align-center>
									<center>
										<b>{{totalFlagged}}/{{totalRecords}}</b>
									</center>
								</v-flex>
								<v-flex xs1>
									<center>
										<v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentFlagged" color="yellow">
											<font color="white">
												<b>{{ mohPercentFlagged }}%</b>
											</font>
										</v-progress-circular>
									</center>
								</v-flex>
							</v-layout>
						</v-chip>
					</v-flex>
					<v-flex xs1>
						<v-chip color="green" text-color='white' style='height:138px;width:143px'>
							<v-layout column>
								<v-flex xs1>
									<v-icon light>thumb_down</v-icon>
									<b>MOH Not Mapped</b>
								</v-flex>
								<v-flex xs1 align-center>
									<center>
										<b>{{totalNotMapped}}/{{totalRecords}}</b>
									</center>
								</v-flex>
								<v-flex xs1>
									<center>
										<v-progress-circular :rotate="-90" :size="65" :width="8" :value="mohPercentNotMappedLevel" color="yellow">
											<font color="white">
												<b>{{ mohPercentNotMappedLevel }}%</b>
											</font>
										</v-progress-circular>
									</center>
								</v-flex>
							</v-layout>
						</v-chip>
					</v-flex>
				</v-layout>
			</v-flex>
			<v-flex xs1>
				<v-layout row wrap>
					<v-flex xs1 sm2 md2 right>
						<v-select :items="$store.state.levelArray" v-model="recoLevel" :item-value='$store.state.levelArray.value' :item-name='$store.state.levelArray.text' label="Level" class="input-group--focused" height='1' full-width @change="levelChanged" single-line>
						</v-select>
					</v-flex>
					<v-spacer></v-spacer>
					<!--
		    	<v-flex xs2>
	          <v-btn color="success" round @click='markRecoDone' v-if="$store.state.recoStatus.status !== 'done'"><v-icon>lock</v-icon>Mark Reconciliation Done</v-btn>
	          <v-btn color="success" round @click='markRecoUnDone' v-else><v-icon>lock_open</v-icon>Mark Reconciliation UnDone</v-btn>
		    	</v-flex>
		    	<v-spacer></v-spacer>
					-->
					<v-flex xs3>
						<v-text-field v-model="searchMatched" append-icon="search" label="Search" single-line hide-details></v-text-field>
					</v-flex>
				</v-layout>
			</v-flex>
			<v-flex xs1>
				<v-tabs icons-and-text centered grow dark color="cyan">
					<v-tabs-slider color="red"></v-tabs-slider>
					<v-tab key="match">
						MATCHED ({{totalMapped}})
						<v-icon color="white" right>thumb_up</v-icon>
					</v-tab>
					<v-tab key="notMapped">
						MOH Not Mapped ({{totalNotMapped}})
						<v-icon color="white" right>thumb_down</v-icon>
					</v-tab>
					<v-tab key="nomatch">
						MOH NO MATCH ({{totalNoMatch}})
						<v-icon color="white" right>thumb_down</v-icon>
					</v-tab>
					<v-tab key="flagged">
						FLAGGED ({{totalFlagged}})
						<v-icon color="white" right>notification_important</v-icon>
					</v-tab>
					<v-tab-item key="match">
						<v-data-table :headers="matchedHeaders" :items="mappingData.mapped" :search="searchMatched" class="elevation-1">
							<template slot="items" slot-scope="props">
								<td>{{props.item.mohName}}</td>
								<td>{{props.item.mohId}}</td>
								<td>{{props.item.datimName}}</td>
								<td>{{props.item.datimId}}</td>
							</template>
						</v-data-table>
					</v-tab-item>
					<v-tab-item key="notMapped">
						<v-data-table :headers="notMappedHeaders" :items="mappingData.notMapped" :search="searchMatched" class="elevation-1">
							<template slot="items" slot-scope="props">
								<td>{{props.item.mohName}}</td>
								<td>{{props.item.mohId}}</td>
							</template>
						</v-data-table>
					</v-tab-item>
					<v-tab-item key="nomatch">
						<v-data-table :headers="noMatchHeaders" :items="mappingData.noMatch" :search="searchMatched" class="elevation-1">
							<template slot="items" slot-scope="props">
								<td>{{props.item.mohName}}</td>
								<td>{{props.item.mohId}}</td>
							</template>
						</v-data-table>
					</v-tab-item>
					<v-tab-item key="flagged">
						<v-data-table :headers="flaggedHeaders" :items="mappingData.flagged" :search="searchMatched" class="elevation-1">
							<template slot="items" slot-scope="props">
								<td>{{props.item.mohName}}</td>
								<td>{{props.item.mohId}}</td>
								<td>{{props.item.datimName}}</td>
								<td>{{props.item.datimId}}</td>
							</template>
						</v-data-table>
					</v-tab-item>
				</v-tabs>
			</v-flex>
			</v-flex>
		</v-layout>
	</v-container>
</template>

<script>
import { scoresMixin } from '../mixins/scoresMixin'
import axios from 'axios'
const config = require('../../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)
export default {
  mixins: [scoresMixin],
  data () {
    return {
      matchedHeaders: [
        { text: 'MOH Location', value: 'mohName' },
        { text: 'MOH ID', value: 'mohId' },
        { text: 'DATIM Location', value: 'datimName' },
        { text: 'DATIM ID', value: 'datimId' }
      ],
      noMatchHeaders: [
        { text: 'MOH Location', value: 'mohName' },
        { text: 'MOH ID', value: 'mohId' }
      ],
      notMappedHeaders: [
        { text: 'MOH Location', value: 'mohName' },
        { text: 'MOH ID', value: 'mohId' }
      ],
      flaggedHeaders: [
        { text: 'MOH Location', value: 'mohName' },
        { text: 'MOH ID', value: 'mohId' },
        { text: 'DATIM Location', value: 'datimName' },
        { text: 'DATIM ID', value: 'datimId' }
      ],
      searchMatched: '',
      mappingData: {},
      recoLevel: 2,
      mappingStatusDialog: false,
      mappingStatusProgressTitle: 'Waiting for progress status',
      mappingStatusProgressPercent: 0
    }
  },
  methods: {
    checkMappingStatusProgress () {
      const orgId = this.$store.state.orgUnit.OrgId
      const clientId = this.$store.state.clientId
      axios.get(backendServer + '/mappingStatusProgress/' + orgId + '/' + clientId).then((mappingStatusProgress) => {
        if (mappingStatusProgress.data === null || mappingStatusProgress.data === undefined || mappingStatusProgress.data === false) {
          clearInterval(this.mappingStatusProgressTimer)
          return
        }
        this.mappingStatusProgressTitle = mappingStatusProgress.data.status
        if (mappingStatusProgress.data.percent) {
          if (this.progressType !== 'percent') {
            this.progressType = 'percent'
          }
          this.mappingStatusProgressPercent = mappingStatusProgress.data.percent
        }
        if (mappingStatusProgress.data.status === 'Done') {
          clearInterval(this.mappingStatusProgressTimer)
          this.mappingStatusDialog = false
          this.mappingStatusProgressTitle = 'Waiting for progress status'
        }
      }).catch((err) => {
        console.log(err)
      })
    },
    mappingStatus () {
      var orgUnit = this.$store.state.orgUnit
      this.mappingData = {}
      const clientId = this.$store.state.clientId
      this.mappingStatusDialog = true
      this.progressType = 'indeterminate'
      axios.get(backendServer + '/mappingStatus/' + orgUnit.OrgId + '/' + this.recoLevel + '/' + clientId).then((mappingStatus) => {
        this.mappingData = mappingStatus.data
      })
      this.mappingStatusProgressTimer = setInterval(this.checkMappingStatusProgress, 500)
    },
    levelChanged (level) {
      this.recoLevel = level
      this.mappingStatus()
    },
    markRecoDone () {
      axios.get(backendServer + '/markRecoDone/' + this.$store.state.orgUnit.OrgId).then((status) => {
        if (status.data.status) {
          this.$store.state.recoStatus.status = status.data.status
        }
      }).catch((err) => {
        console.log(err.response.data.error)
      })
    },
    markRecoUnDone () {
      axios.get(backendServer + '/markRecoUnDone/' + this.$store.state.orgUnit.OrgId).then((status) => {
        if (status.data.status) {
          this.$store.state.recoStatus.status = status.data.status
        }
      }).catch((err) => {
        console.log(err.response.data.error)
      })
    }
  },
  computed: {
    mohPercentMapped () {
      if (this.$store.state.mohTotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.totalAllMapped * 100 / this.$store.state.mohTotalAllRecords).toFixed(2))
      }
    },
    mohPercentMappedLevel () {
      if (this.totalRecords === 0) {
        return 0
      } else {
        return parseFloat((this.totalMapped * 100 / this.totalRecords).toFixed(2))
      }
    },
    mohPercentNoMatch () {
      if (this.$store.state.mohTotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.totalAllNoMatch * 100 / this.$store.state.mohTotalAllRecords).toFixed(2))
      }
    },
    mohPercentNoMatchLevel () {
      if (this.totalRecords === 0) {
        return 0
      } else {
        return parseFloat((this.totalNoMatch * 100 / this.totalRecords).toFixed(2))
      }
    },
    mohPercentFlagged () {
      if (this.$store.state.mohTotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.totalAllFlagged * 100 / this.$store.state.mohTotalAllRecords).toFixed(2))
      }
    },
    mohPercentFlaggedLevel () {
      if (this.totalRecords === 0) {
        return 0
      } else {
        return parseFloat((this.totalFlagged * 100 / this.totalRecords).toFixed(2))
      }
    },
    mohPercentNotMapped () {
      if (this.$store.state.mohTotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.mohTotalAllNotMapped * 100 / this.$store.state.mohTotalAllRecords).toFixed(2))
      }
    },
    mohPercentNotMappedLevel () {
      if (this.totalRecords === 0) {
        return 0
      } else {
        return parseFloat((this.totalNotMapped * 100 / this.totalRecords).toFixed(2))
      }
    },
    datimPercentFlagged () {
      if (this.$store.state.datimTotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.totalAllFlagged * 100 / this.$store.state.datimTotalAllRecords).toFixed(2))
      }
    },
    datimPercentMapped () {
      if (this.$store.state.datimTotalAllRecords === 0) {
        return 0
      } else {
        return parseFloat((this.$store.state.totalAllMapped * 100 / this.$store.state.datimTotalAllRecords).toFixed(2))
      }
    },
    totalMapped () {
      if (this.mappingData && this.mappingData.hasOwnProperty('mapped')) {
        return this.mappingData.mapped.length
      } else {
        return 0
      }
    },
    totalNotMapped () {
      if (this.mappingData && this.mappingData.hasOwnProperty('notMapped')) {
        return this.mappingData.notMapped.length
      } else {
        return 0
      }
    },
    totalNoMatch () {
      if (this.mappingData && this.mappingData.hasOwnProperty('noMatch')) {
        return this.mappingData.noMatch.length
      } else {
        return 0
      }
    },
    totalFlagged () {
      if (this.mappingData && this.mappingData.hasOwnProperty('flagged')) {
        return this.mappingData.flagged.length
      } else {
        return 0
      }
    },
    totalRecords () {
      return this.totalMapped + this.totalNotMapped + this.totalNoMatch + this.totalFlagged
    }
  },
  created () {
    this.mappingStatus()
  }
}
</script>