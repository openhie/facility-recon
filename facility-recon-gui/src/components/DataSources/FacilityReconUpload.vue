<template>
  <v-container fluid>
    <v-dialog
      persistent
      transition="scale-transition"
      v-model="dialog"
      max-width="500px"
    >
      <v-card>
        <v-toolbar
          color="primary"
          dark
        >
          <v-toolbar-title>
            Information
          </v-toolbar-title>
        </v-toolbar>
        <v-card-text>
          Data uploaded successfully
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="primary"
            dark
            @click.native="closeDialog('FacilityReconView')"
          >
            <v-icon left>list</v-icon>
            View Data
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      persistent
      transition="scale-transition"
      v-model="invalidRows"
      max-width="1050px"
    >
      <v-card>
        <v-toolbar
          color="error"
          dark
        >
          <v-toolbar-title>
            <v-icon>error</v-icon>Data Upload was not successful,review below invalid rows in your CSV
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon
            dark
            @click.native="closeInvalidRows()"
          >
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <v-data-table
            :headers="invalidRowsHeader"
            :items="invalidRowsContent"
            light
            class="elevation-1"
          >
            <template
              slot="items"
              slot-scope="props"
            >
              <td v-for='header in invalidRowsHeader'>{{props.item[header.value]}}</td>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog
      persistent
      transition="scale-transition"
      v-model="confirmUpload"
      max-width="500px"
    >
      <v-card>
        <v-toolbar
          color="primary"
          dark
        >
          <v-toolbar-title>
            Warning
          </v-toolbar-title>
        </v-toolbar>
        <v-card-text>
          You are about to upload CSV data into the app, click proceed to upload
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="error"
            @click.native="confirmUpload = false"
          >Cancel</v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            dark
            @click.native="performExtraCheck"
          >Proceed</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      persistent
      transition="scale-transition"
      v-model="errorDialog"
      max-width="500px"
    >
      <v-card>
        <v-card-title>
          {{errorTitle}}
        </v-card-title>
        <v-card-text>
          {{errorContent}}
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="error"
            @click.native="errorDialog = false"
          >Ok</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="uploadPrepaProgr"
      transition="scale-transition"
      persistent
      width="300"
    >
      <v-card
        color="primary"
        dark
      >
        <v-card-text>
          {{uploadStatus}}
          <v-progress-linear
            indeterminate
            color="white"
            class="mb-0"
            v-if='!fileUploadPercentage'
          ></v-progress-linear>
          <v-progress-linear
            v-model="fileUploadPercentage"
            color="white"
            class="mb-0"
            v-else
          ></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="percentDialog"
      transition="scale-transition"
      persistent
      width="270"
    >
      <v-card
        color="white"
        dark
      >
        <v-card-text>
          <center>
            <font style="color:blue">{{uploadStatus}}</font><br>
            <v-progress-circular
              :rotate="-90"
              :size="100"
              :width="15"
              :value="uploadPercent"
              color="primary"
            >
              <v-avatar
                color="indigo"
                size="50px"
              >
                <span class="white--text">
                  <b>{{ uploadPercent }}%</b>
                </span>
              </v-avatar>
            </v-progress-circular>
          </center>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-slide-y-transition
      mode="out-in"
      v-if='!$store.state.denyAccess'
    >
      <v-stepper v-model="e1">
        <v-stepper-header>
          <v-stepper-step
            step="1"
            :complete="e1 > 1"
          >Upload CSV</v-stepper-step>
          <v-divider></v-divider>
          <v-stepper-step
            step="2"
            :complete="e1 > 2"
          >Map Headers</v-stepper-step>
          <v-btn
            icon
            @click.native="closeUploadWindow()"
          >
            <v-icon>close</v-icon>
          </v-btn>
        </v-stepper-header>
        <v-stepper-items>
          <v-stepper-content step="1">
            <v-card class="mb-5">
              <v-card-title>Upload CSV (utf-8 only) - <b>Select a CSV file and upload</b></v-card-title>
              <v-card-text>
                <v-text-field
                  label="Enter Unique Name For Your Data"
                  v-model="uploadName"
                  @blur="ensureNameUnique"
                  @input="ensureNameUnique"
                  :error-messages="uploadNameErrors"
                  required
                ></v-text-field>
                <input
                  type="file"
                  @change="fileSelected"
                >
                <br><br>
                <v-card>
                  <v-card-title primary-title>
                    Advanced Options
                  </v-card-title>
                  <v-card-text>
                    <v-tooltip top>
                      <v-checkbox
                        v-if="$store.state.dhis.user.orgId"
                        :disabled="shareWithAll"
                        slot="activator"
                        color="primary"
                        label="Share with other users of the same org unit as yours"
                        v-model="shareToSameOrgid"
                      ></v-checkbox>
                      <span>
                        Share this dataset with all other users that are on the same org unit as you
                      </span>
                    </v-tooltip>
                    <v-checkbox
                      v-if='$store.state.config.generalConfig.allowShareToAllForNonAdmin || $store.state.auth.role === "Admin"'
                      @change="sharingOptions"
                      color="primary"
                      label="Share with all other users"
                      v-model="shareWithAll"
                    >
                    </v-checkbox>
                    <v-tooltip top>
                      <v-checkbox
                        v-if="shareWithAll && $store.state.dhis.user.orgId"
                        slot="activator"
                        color="primary"
                        label="Limit orgs sharing by user orgid"
                        v-model="limitShareByOrgId"
                      >
                      </v-checkbox>
                      <span>
                        if activated, other users will see locations (including location children) that has the same location id as their location id
                      </span>
                    </v-tooltip>
                  </v-card-text>
                </v-card>
              </v-card-text>
            </v-card>
            <v-btn
              color="primary"
              @click.native="e1 = 2"
              v-if='uploadedFileName && uploadName && uploadNameErrors.length === 0'
            >Continue</v-btn>
            <v-btn
              color="primary"
              @click.native="e1 = 2"
              v-else
              disabled
            >Continue</v-btn>
          </v-stepper-content>
          <v-stepper-content step="2">
            <b>Map an appropriate CSV header against those on the app.</b>
            <v-container fluid>
              <v-layout
                row
                wrap
                ref="form"
                v-model="valid"
              >
                <v-flex xs6>
                  <v-subheader>Facility*</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select
                    :items="filteredItemFacility"
                    v-model="facility"
                    @blur="$v.facility.$touch()"
                    @change="$v.facility.$touch()"
                    :error-messages="facilityErrors"
                    label="Select"
                    required
                    single-line
                    clearable
                  >
                  </v-select>
                </v-flex>
                <v-flex xs6>
                  <v-subheader>Code*</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select
                    :items="filteredItemCode"
                    v-model="code"
                    @blur="$v.code.$touch()"
                    @change="$v.code.$touch()"
                    :error-messages="codeErrors"
                    label="Select"
                    required
                    single-line
                    clearable
                  >
                  </v-select>
                </v-flex>
                <v-flex xs6>
                  <v-subheader>Latitude</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select
                    :items="filteredItemLat"
                    v-model="lat"
                    label="Select"
                    single-line
                    clearable
                  >
                  </v-select>
                </v-flex>
                <v-flex xs6>
                  <v-subheader>Longitude</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select
                    :items="filteredItemLong"
                    v-model="long"
                    label="Select"
                    single-line
                    clearable
                  >
                  </v-select>
                </v-flex>
                <template>
                  <v-flex xs6>
                    <v-subheader>Level 1</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select
                      :items="filteredItemLevel1"
                      v-model="level1"
                      label="Select"
                      single-line
                      clearable
                    >
                    </v-select>
                  </v-flex>
                </template>
                <template>
                  <v-flex xs6>
                    <v-subheader>Level 2</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select
                      :items="filteredItemLevel2"
                      v-model="level2"
                      label="Select"
                      single-line
                      clearable
                    >
                    </v-select>
                  </v-flex>
                </template>
                <template v-if='showLevel3'>
                  <v-flex xs6>
                    <v-subheader>Level 3</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select
                      :items="filteredItemLevel3"
                      v-model="level3"
                      label="Select"
                      single-line
                      clearable
                    >
                    </v-select>
                  </v-flex>
                </template>
                <template v-if='showLevel4'>
                  <v-flex xs6>
                    <v-subheader>Level 4</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select
                      :items="filteredItemLevel4"
                      v-model="level4"
                      label="Select"
                      single-line
                      clearable
                    >
                    </v-select>
                  </v-flex>
                </template>
                <template v-if='showLevel5'>
                  <v-flex xs6>
                    <v-subheader>Level 5</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select
                      :items="filteredItemLevel5"
                      v-model="level5"
                      label="Select"
                      single-line
                      clearable
                    >
                    </v-select>
                  </v-flex>
                </template>
                <template v-if='showLevel6'>
                  <v-flex xs6>
                    <v-subheader>Level 6</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select
                      :items="filteredItemLevel6"
                      v-model="level6"
                      label="Select"
                      single-line
                      clearable
                    >
                    </v-select>
                  </v-flex>
                </template>
                <template v-if='showLevel7'>
                  <v-flex xs6>
                    <v-subheader>Level 7</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select
                      :items="filteredItemLevel7"
                      v-model="level7"
                      label="Select"
                      single-line
                      clearable
                    >
                    </v-select>
                  </v-flex>
                </template>
                <v-layout
                  row
                  wrap
                >
                  <v-spacer></v-spacer>
                  <v-tooltip top>
                    <v-btn
                      v-if='!showLevel7'
                      color="success"
                      slot="activator"
                      icon
                      @click="showMoreLevel"
                    >
                      <v-icon>add</v-icon>
                    </v-btn>
                    <span>Add More Level</span>
                  </v-tooltip>
                </v-layout>
              </v-layout>
            </v-container>
            <v-layout
              row
              wrap
            >
              <v-flex xs1>
                <v-btn
                  color="error"
                  @click.native="e1 = 1"
                >Go Back</v-btn>
              </v-flex>
              <v-spacer></v-spacer>
              <v-flex xs1>
                <v-btn
                  color="primary"
                  @click.native="confirmUpload = true"
                  :disabled="$v.$invalid"
                >Upload</v-btn>
              </v-flex>
            </v-layout>
          </v-stepper-content>
        </v-stepper-items>
      </v-stepper>
    </v-slide-y-transition>
  </v-container>
</template>

<script>
import axios from 'axios'
import Dialogs from './dialogs'
import { dataSourcesMixin } from './dataSourcesMixin'
import { generalMixin } from '../../mixins/generalMixin'
import { required } from 'vuelidate/lib/validators'
import { eventBus } from '../../main'
const backendServer = process.env.BACKEND_SERVER

export default {
  mixins: [dataSourcesMixin, generalMixin],
  data () {
    return {
      datasetLimitWarn: false,
      errorDialog: false,
      errorTitle: '',
      errorContent: '',
      dialog: false,
      fileUploadPercentage: '',
      percentDialog: false,
      uploadPrepaProgr: false,
      UploadProgressTimer: '',
      uploadStatus: '1/3 Uploading CSV to the server',
      uploadPercent: null,
      uploadName: '',
      uploadNameErrors: [],
      confirmUpload: false,
      confirmTitle: '',
      confirmMsg: '',
      file: '',
      uploadedFileName: '',
      e1: 0,
      facility: null,
      code: null,
      lat: null,
      long: null,
      level1: null,
      level2: null,
      level3: null,
      level4: null,
      level5: null,
      level6: null,
      level7: null,
      showLevel3: false,
      showLevel4: false,
      showLevel5: false,
      showLevel6: false,
      showLevel7: false,
      uploadedHeaders: [
      ],
      mappedHeaders: [],
      invalidRowsHeader: [],
      invalidRowsContent: [],
      invalidRows: false,
      valid: false
    }
  },
  validations: {
    facility: {
      required: required
    },
    code: {
      required: required
    },
    uploadName: {
      required: required
    }
  },
  methods: {
    fileSelected (e) {
      this.uploadedFileName = e.target.files[0]['name']
      if (e.target.files[0]['type'] !== 'text/csv' &&
        !(e.target.files[0]['type'] === 'application/vnd.ms-excel' &&
          e.target.files[0].name.slice(-3).toLowerCase() === 'csv')
      ) {
        this.errorDialog = true
        this.errorTitle = 'Error'
        this.errorContent = 'Wrong file type uploaded,Only CSV format is supported'
        this.uploadedFileName = ''
      }
      this.file = e.target.files[0]
      let reader = new FileReader()
      reader.addEventListener('load', function () {
        var data = reader.result
        var allTextLines = data.split(/\r\n|\n/)
        var headerString = allTextLines[0]
        this.uploadedHeaders = headerString.split(',')
      }.bind(this), false)
      reader.readAsText(e.target.files[0], 'utf-8')
    },
    ensureNameUnique () {
      this.uploadNameErrors = []
      if (this.uploadName === '') {
        return this.uploadNameErrors.push('Upload name is required')
      }
      if (this.uploadName.length > 35) {
        return this.uploadNameErrors.push('Name must not exceed 35 characters')
      }
      for (let invalidChar of this.invalidCharacters) {
        if (this.uploadName.indexOf(invalidChar) !== -1) {
          return this.uploadNameErrors.push('Name is invalid')
        }
      }
      for (let dtSrc of this.$store.state.dataSources) {
        if (dtSrc.name.toLowerCase() === this.uploadName.toLowerCase()) {
          this.uploadNameErrors.push('This Name Exists')
          return false
        }
      }
    },
    confirmSubmit () {
      this.confirmUpload = true
    },
    checkUploadProgress () {
      const clientId = this.$store.state.clientId
      axios.get(backendServer + '/progress/uploadProgress/' + clientId).then((uploadProgress) => {
        if (!uploadProgress.data || (!uploadProgress.data.status && !uploadProgress.data.percent && !uploadProgress.data.error)) {
          this.$store.state.uploadRunning = false
          this.uploadPrepaProgr = false
          this.percentDialog = false
          this.$store.state.errorTitle = 'An error has occured'
          this.$store.state.errorDescription = 'You should delete this data source from view data source page then re-upload'
          this.$store.state.errorColor = 'error'
          this.$store.state.dialogError = true
          return
        } else if (uploadProgress.data.error !== null) {
          this.$store.state.uploadRunning = false
          this.uploadPrepaProgr = false
          this.percentDialog = false
          this.$store.state.dialogError = true
          this.$store.state.errorTitle = 'Error'
          this.$store.state.errorDescription = uploadProgress.data.error
          console.log(uploadProgress.data.error)
          return
        }
        this.uploadStatus = uploadProgress.data.status
        if (uploadProgress.data.percent) {
          if (!this.percentDialog) {
            this.uploadPrepaProgr = false
            this.percentDialog = true
          }
          this.uploadPercent = uploadProgress.data.percent
        }
        if (uploadProgress.data.status === 'Done' || uploadProgress.data.status >= 100) {
          this.clearProgress('uploadProgress')
          this.addDataSource('upload')
          clearInterval(this.UploadProgressTimer)
          // resetting reco level
          this.$store.state.recoLevel = 2
          this.percentDialog = false
          this.dialog = true
          this.$store.state.uploadRunning = false
        } else {
          this.checkUploadProgress()
        }
      }).catch((err) => {
        console.log(err)
        this.checkUploadProgress()
      })
    },
    performExtraCheck () {
      // reload general config and see if still allowed to upload more data sources
      this.$store.state.dynamicProgress = true
      this.$store.state.progressTitle = 'Performing extra validations'
      this.getGeneralConfig(() => {
        this.datasetLimitWarn = false
        this.$store.state.dynamicProgress = false
        if (this.canAddDataset) {
          this.submitCSV()
        } else {
          this.confirmUpload = false
          this.datasetLimitWarn = true
        }
      })
    },
    submitCSV () {
      let formData = new FormData()
      formData.append('file', this.file)
      formData.append('csvName', this.uploadName)
      formData.append('facility', this.facility)
      formData.append('code', this.code)
      formData.append('lat', this.lat)
      formData.append('long', this.long)
      formData.append('level1', this.level1)
      formData.append('level2', this.level2)
      formData.append('level3', this.level3)
      formData.append('level4', this.level4)
      formData.append('level5', this.level5)
      formData.append('level6', this.level6)
      formData.append('level7', this.level7)
      formData.append('clientId', this.$store.state.clientId)
      formData.append('userID', this.$store.state.auth.userID)
      this.confirmUpload = false
      this.$store.state.uploadRunning = true
      this.uploadPrepaProgr = true

      // preparing data for adding data source
      this.host = ''
      this.sourceType = 'upload'
      this.username = ''
      this.password = ''
      this.name = this.uploadName

      axios.post(backendServer + '/uploadCSV',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: function (progressEvent) {
            this.fileUploadPercentage = parseInt(Math.round((progressEvent.loaded * 100) / progressEvent.total))
            if (this.fileUploadPercentage === 100) {
              this.fileUploadPercentage = ''
              this.uploadStatus = '2/3 Validating CSV Data'
            }
          }.bind(this)
        }
      ).then((data) => {
        // this.UploadProgressTimer = setInterval(this.checkUploadProgress, 1000)
        this.checkUploadProgress()
      }).catch((err) => {
        if (Array.isArray(err.response.data.error)) {
          this.invalidRows = true
          for (var k = 0; k < err.response.data.error.length; k++) {
            if (k === 0) {
              let headers = Object.keys(err.response.data.error[k].data)
              for (let header of headers) {
                this.invalidRowsHeader.push({
                  text: header,
                  value: header
                })
              }
              this.invalidRowsHeader.push({
                text: 'Reason',
                value: 'reason'
              })
            }
            let row = Object.values(err.response.data.error[k].data)
            let content = {}
            for (let ind in row) {
              content[this.invalidRowsHeader[ind].value] = row[ind]
            }
            content['reason'] = err.response.data.error[k].reason
            this.invalidRowsContent.push(content)
          }
        } else {
          this.$store.state.dialogError = true
          this.$store.state.errorTitle = 'Error'
          this.$store.state.errorDescription = err.response.data.error + '. Reload page and retry'
        }
        this.$store.state.uploadRunning = false
        this.uploadPrepaProgr = false
        this.percentDialog = false
        clearInterval(this.UploadProgressTimer)
      })
    },
    closeInvalidRows () {
      this.invalidRows = false
      this.invalidRowsHeader = []
      this.invalidRowsContent = []
      this.e1 = 1
    },
    closeDialog (component) {
      this.$router.push({ name: component })
      this.dialog = false
    },
    closeUploadWindow () {
      eventBus.$emit('dataSourceSaved')
    },
    showMoreLevel () {
      if (!this.showLevel3) {
        this.showLevel3 = true
        return
      }
      if (!this.showLevel4) {
        this.showLevel4 = true
        return
      }
      if (!this.showLevel5) {
        this.showLevel5 = true
        return
      }
      if (!this.showLevel6) {
        this.showLevel6 = true
        return
      }
      if (!this.showLevel7) {
        this.showLevel7 = true
      }
    }
  },
  components: {
    'appDialogs': Dialogs
  },
  computed: {
    facilityErrors () {
      const errors = []
      if (!this.$v.facility.$dirty) return errors
      !this.$v.facility.required && errors.push('Facility is required')
      return errors
    },
    codeErrors () {
      const errors = []
      if (!this.$v.code.$dirty) return errors
      !this.$v.code.required && errors.push('Code is required')
      return errors
    },
    filteredItemFacility () {
      let uploadedHeaders = this.uploadedHeaders
      return uploadedHeaders.filter(o => o !== this.code && o !== this.lat && o !== this.long && o !== this.level1 && o !== this.level2 && o !== this.level3 && o !== this.level4 && o !== this.level5 && o !== this.level6 && o !== this.level7)
    },
    filteredItemCode () {
      let uploadedHeaders = this.uploadedHeaders
      return uploadedHeaders.filter(o => o !== this.facility && o !== this.lat && o !== this.long && o !== this.level1 && o !== this.level2 && o !== this.level3 && o !== this.level4 && o !== this.level5 && o !== this.level6 && o !== this.level7)
    },
    filteredItemLat () {
      let uploadedHeaders = this.uploadedHeaders
      return uploadedHeaders.filter(o => o !== this.facility && o !== this.code && o !== this.long && o !== this.level1 && o !== this.level2 && o !== this.level3 && o !== this.level4 && o !== this.level5 && o !== this.level6 && o !== this.level7)
    },
    filteredItemLong () {
      let uploadedHeaders = this.uploadedHeaders
      return uploadedHeaders.filter(o => o !== this.facility && o !== this.code && o !== this.lat && o !== this.level1 && o !== this.level2 && o !== this.level3 && o !== this.level4 && o !== this.level5 && o !== this.level6 && o !== this.level7)
    },
    filteredItemLevel1 () {
      let uploadedHeaders = this.uploadedHeaders
      return uploadedHeaders.filter(o => o !== this.facility && o !== this.code && o !== this.lat && o !== this.long && o !== this.level2 && o !== this.level3 && o !== this.level4 && o !== this.level5 && o !== this.level6 && o !== this.level7)
    },
    filteredItemLevel2 () {
      let uploadedHeaders = this.uploadedHeaders
      return uploadedHeaders.filter(o => o !== this.facility && o !== this.code && o !== this.lat && o !== this.long && o !== this.level1 && o !== this.level3 && o !== this.level4 && o !== this.level5 && o !== this.level6 && o !== this.level7)
    },
    filteredItemLevel3 () {
      let uploadedHeaders = this.uploadedHeaders
      return uploadedHeaders.filter(o => o !== this.facility && o !== this.code && o !== this.lat && o !== this.long && o !== this.level1 && o !== this.level2 && o !== this.level4 && o !== this.level5 && o !== this.level6 && o !== this.level7)
    },
    filteredItemLevel4 () {
      let uploadedHeaders = this.uploadedHeaders
      return uploadedHeaders.filter(o => o !== this.facility && o !== this.code && o !== this.lat && o !== this.long && o !== this.level1 && o !== this.level2 && o !== this.level3 && o !== this.level5 && o !== this.level6 && o !== this.level7)
    },
    filteredItemLevel5 () {
      let uploadedHeaders = this.uploadedHeaders
      return uploadedHeaders.filter(o => o !== this.facility && o !== this.code && o !== this.lat && o !== this.long && o !== this.level1 && o !== this.level2 && o !== this.level3 && o !== this.level4 && o !== this.level6 && o !== this.level7)
    },
    filteredItemLevel6 () {
      let uploadedHeaders = this.uploadedHeaders
      return uploadedHeaders.filter(o => o !== this.facility && o !== this.code && o !== this.lat && o !== this.long && o !== this.level1 && o !== this.level2 && o !== this.level3 && o !== this.level4 && o !== this.level5 && o !== this.level7)
    },
    filteredItemLevel7 () {
      let uploadedHeaders = this.uploadedHeaders
      return uploadedHeaders.filter(o => o !== this.facility && o !== this.code && o !== this.lat && o !== this.long && o !== this.level1 && o !== this.level2 && o !== this.level3 && o !== this.level4 && o !== this.level5 && o !== this.level6)
    }
  },
  created () {
    if (this.$store.state.uploadProgressData.percentDialog) {
      this.percentDialog = this.$store.state.uploadProgressData.percentDialog
    }
    if (this.$store.state.uploadProgressData.uploadPrepaProgr) {
      this.uploadPrepaProgr = this.$store.state.uploadProgressData.uploadPrepaProgr
    }
    if (this.$store.state.uploadProgressData.UploadProgressTimer) {
      this.UploadProgressTimer = this.$store.state.uploadProgressData.UploadProgressTimer
    }
    if (this.$store.state.uploadProgressData.uploadStatus) {
      this.uploadStatus = this.$store.state.uploadProgressData.uploadStatus
    }
    if (this.$store.state.uploadProgressData.uploadPercent) {
      this.uploadPercent = this.$store.state.uploadProgressData.uploadPercent
    }
    // if (this.percentDialog || this.uploadPrepaProgr) {
    //   this.UploadProgressTimer = setInterval(this.checkUploadProgress, 1000)
    // }
  },
  destroyed () {
    this.$store.state.uploadProgressData.dialog = this.dialog
    this.$store.state.uploadProgressData.percentDialog = this.percentDialog
    this.$store.state.uploadProgressData.uploadPrepaProgr = this.uploadPrepaProgr
    this.$store.state.uploadProgressData.UploadProgressTimer = this.UploadProgressTimer
    this.$store.state.uploadProgressData.uploadStatus = this.uploadStatus
    this.$store.state.uploadProgressData.uploadPercent = this.uploadPercent
    // clearInterval(this.checkUploadProgress)
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.jbtn-file {
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.jbtn-file input[type="file"] {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 100%;
  min-height: 100%;
  text-align: right;
  filter: alpha(opacity=0);
  opacity: 0;
  outline: none;
  cursor: inherit;
  display: block;
}
.input.invalid input {
  border: 1px solid red;
  background-color: #ffc9aa;
}
.input.invalid label {
  color: red;
}
</style>
