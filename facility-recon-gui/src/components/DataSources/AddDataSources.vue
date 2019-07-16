<template>
  <v-container fluid>
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
          This page let you load data from various sources into the app for reconciliation
          <v-list>1. Select to add remote source if you have a DHIS2 or FHIR server that you want to use its data on this app</v-list>
          <v-list>2. Select Upload CSV if you have a CSV file and want to upload its data on the app</v-list>
          <v-list>3. The system requires CSV data to have atleast 2 levels above facility</v-list>
          <v-list>4. Level 1 is the highest level on the hierarchy i.e Country</v-list>
          <v-list>
            5. Base URL under remote sources section refer to the URL i.e http://localhost:3447/fhir and not http://localhost:3447/fhir/Location.
            Same applies to DHIS2 base URL
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-alert
      style="width: 500px"
      v-model="alertSuccess"
      type="success"
      dismissible
      transition="scale-transition"
    >
      {{alertMsg}}
    </v-alert>
    <v-alert
      style="width: 500px"
      v-model="alertError"
      type="error"
      dismissible
      transition="scale-transition"
    >
      {{alertMsg}}
    </v-alert>
    <v-layout
      row
      wrap
    >
      <v-spacer></v-spacer>
      <v-flex xs6>
        <v-card>
          <v-card-title primary-title>
            <v-toolbar
              color="white"
              style="font-weight: bold; font-size: 18px;"
            >
              Choose way to add data source
            </v-toolbar>
            <v-spacer></v-spacer>
          </v-card-title>
          <v-card-text>
            <v-radio-group
              v-model="dataSource"
              row
              @change="sourceSelected"
            >
              <v-radio
                v-if='canUseUploadWay'
                :disabled="!canAddDataset"
                color="primary"
                label="Upload CSV"
                value="upload"
              ></v-radio>
              <v-radio
                v-if='canUseRemoteWay'
                :disabled="!canAddDataset"
                color="primary"
                label="Remote Source"
                value="remote"
              ></v-radio>
            </v-radio-group>
          </v-card-text>
        </v-card>
      </v-flex>
      <v-spacer></v-spacer>
      <v-flex
        xs1
        text-xs-right
      >
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
    <v-layout column>
      <v-flex>
        <component
          :is="selectedComponent"
          v-if='addDataSource'
        />
      </v-flex>
    </v-layout>
    <appDialogs
      :datasetLimitWarn="datasetLimitWarn"
      @limitWarnStateChange='limitWarnStateChange'
    >
    </appDialogs>
  </v-container>
</template>

<script>
import FacilityReconUpload from './FacilityReconUpload'
import FacilityReconRemoteSources from './FacilityReconRemoteSources'
import Dialogs from './dialogs'
import { generalMixin } from '../../mixins/generalMixin'
import { eventBus } from '../../main'
export default {
  mixins: [generalMixin],
  data () {
    return {
      helpDialog: false,
      datasetLimitWarn: false,
      selectedComponent: '',
      dataSources: [
        { text: 'Upload CSV', value: 'upload' },
        { text: 'Remote Source', value: 'remote' }
      ],
      dataSource: '',
      addDataSource: true,
      alertSuccess: false,
      alertError: false,
      alertMsg: ''
    }
  },
  methods: {
    limitWarnStateChange (newVal) {
      this.datasetLimitWarn = newVal
    },
    sourceSelected (selection) {
      this.addDataSource = true
      if (selection === 'upload') {
        this.selectedComponent = 'FacilityReconUpload'
      } else if (selection === 'remote') {
        this.selectedComponent = 'FacilityReconRemoteSources'
      }
    }
  },
  computed: {
    canUseUploadWay () {
      if (this.$store.state.config.generalConfig.datasetsAdditionWays.indexOf('CSV Upload') === -1) {
        return false
      } else {
        return true
      }
    },
    canUseRemoteWay () {
      if (this.$store.state.config.generalConfig.datasetsAdditionWays.indexOf('Remote Servers Sync') === -1) {
        return false
      } else {
        return true
      }
    }
  },
  components: {
    'FacilityReconUpload': FacilityReconUpload,
    'FacilityReconRemoteSources': FacilityReconRemoteSources,
    'appDialogs': Dialogs
  },
  created () {
    eventBus.$on('dataSourceSaved', () => {
      this.addDataSource = false
      this.dataSource = ''
    })
    eventBus.$on('dataSourceAddedSuccessfully', () => {
      this.alertSuccess = true
      this.alertMsg = 'Data Source Added Successfully'
      setTimeout(() => {
        this.alertSuccess = false
      }, 3000)
    })
    eventBus.$on('remoteServerFailedAdd', () => {
      this.alertError = true
      this.alertMsg = 'Data Source Failed To Be Added'
    })
  }
}
</script>
