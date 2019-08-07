<template>
  <v-container grid-list-xs>
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
    <v-layout
      row
      wrap
    >
      <v-flex xs6>
        <v-btn
          color="success"
          round
          small
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
      </v-flex>
      <v-flex xs6>
        <v-btn
          color="success"
          round
          small
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
      </v-flex>
    </v-layout>
  </v-container>
</template>
<script>
import axios from 'axios'
import { scoresMixin } from '../mixins/scoresMixin'
import { generalMixin } from '../mixins/generalMixin'
const backendServer = process.env.BACKEND_SERVER
export default {
  mixins: [scoresMixin, generalMixin],
  data () {
    return {
      loadingCSV: false,
      loadingFHIR: false,
      downloadDialog: false,
      matchedDownloadData: '',
      unmatchedSource1DownloadData: '',
      unmatchedSource2DownloadData: '',
      downloadType: ''
    }
  },
  methods: {
    closeDownloadDialog () {
      this.downloadDialog = false
      this.matchedDownloadData = ''
      this.unmatchedSource1DownloadData = ''
      this.unmatchedSource2DownloadData = ''
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
      // const matchedData = encodeURI(
      //   encoding + this.matchedDownloadData
      // )
      const matchedData = encoding + escape(this.matchedDownloadData)
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
      // const unmatchedSource1Data = encodeURI(
      //   encoding + this.unmatchedSource1DownloadData
      // )
      const unmatchedSource1Data = encoding + escape(this.unmatchedSource1DownloadData)
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
      // const unmatchedSource2Data = encodeURI(
      //   encoding + this.unmatchedSource2DownloadData
      // )
      const unmatchedSource2Data = encoding + escape(this.unmatchedSource2DownloadData)
      const link = document.createElement('a')
      link.setAttribute('href', unmatchedSource2Data)
      link.setAttribute('download', `unmatched${this.getSource2()}.${extension}`)
      link.click()
    }
  }
}
</script>
