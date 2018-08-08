<template>
  <v-container fluid>
    <v-dialog persistent v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <v-icon left>info</v-icon> Info
        </v-card-title>
        <v-card-text>
          Data uploaded successfully
        </v-card-text>
        <v-card-actions>
          <v-btn color="success" @click.native="closeDialog('FacilityReconHome')">
            <v-icon left>home</v-icon>
            Home
          </v-btn>
          <v-btn color="primary" dark @click.native="closeDialog('FacilityReconView')">
            <v-icon left>list</v-icon>
            View Data
          </v-btn>
          <v-btn color="primary" dark @click.native="closeDialog('FacilityReconScores')">
            <v-icon left>find_in_page</v-icon>
            Reconcile
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog persistent v-model="confirmUpload" max-width="500px">
      <v-card>
        <v-card-title>
          Warning
        </v-card-title>
        <v-card-text>
          You are about to upload a new dataset, this will erase any existing data
        </v-card-text>
        <v-card-actions>
          <v-btn color="error" @click.native="confirmUpload = false">Cancel</v-btn>
          <v-btn color="primary" dark @click.native="submitCSV">Proceed</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog persistent v-model="errorDialog" max-width="500px">
      <v-card>
        <v-card-title>
          {{errorTitle}}
        </v-card-title>
        <v-card-text>
          {{errorContent}}
        </v-card-text>
        <v-card-actions>
          <v-btn color="error" @click.native="errorDialog = false">Ok</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="uploadPrepaProgr" hide-overlay persistent width="300">
      <v-card color="primary" dark>
        <v-card-text>
          {{uploadStatus}}
          <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog v-model="percentDialog" hide-overlay persistent width="270">
      <v-card color="white" dark>
        <v-card-text>
          <center>
            <font style="color:blue">{{uploadStatus}}</font><br>
            <v-progress-circular :rotate="-90" :size="100" :width="15" :value="uploadPercent" color="primary">
              <v-avatar color="indigo" size="50px">
                <span class="white--text">
                  <b>{{ uploadPercent }}%</b>
                </span>
              </v-avatar>
            </v-progress-circular>
          </center>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-slide-y-transition mode="out-in" v-if='!$store.state.denyAccess'>
      <v-stepper v-model="e1">
        <v-stepper-header>
          <v-stepper-step step="1" :complete="e1 > 1">Upload MoH CSV</v-stepper-step>
          <v-divider></v-divider>
          <v-stepper-step step="2" :complete="e1 > 2">Map Headers</v-stepper-step>
        </v-stepper-header>
        <v-stepper-items>
          <v-stepper-content step="1">
            <v-card class="mb-5" height="200px">
              <v-card-title>Upload MoH CSV</v-card-title>
              <v-card-text>
                <div class="btn btn-primary jbtn-file">Upload CSV<input type="file" @change="fileSelected">
                </div>
                {{uploadedFileName}}

              </v-card-text>
            </v-card>
            <v-btn color="primary" @click.native="e1 = 2" v-if='uploadedFileName'>Continue</v-btn>
            <v-btn color="primary" @click.native="e1 = 2" v-else disabled>Continue</v-btn>
          </v-stepper-content>
          <v-stepper-content step="2">

            <v-container fluid>
              <v-layout row wrap ref="form" v-model="valid">
                <v-flex xs6>
                  <v-subheader>Facility*</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select :items="filteredItemFacility" v-model="facility" @blur="$v.facility.$touch()" @change="$v.facility.$touch()" :error-messages="facilityErrors" label="Select" required single-line clearable></v-select>
                </v-flex>
                <v-flex xs6>
                  <v-subheader>Code</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select :items="filteredItemCode" v-model="code" @blur="$v.code.$touch()" @change="$v.code.$touch()" :error-messages="codeErrors" label="Select" required single-line clearable></v-select>
                </v-flex>
                <v-flex xs6>
                  <v-subheader>Latitude</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select :items="filteredItemLat" v-model="lat" label="Select" single-line clearable></v-select>
                </v-flex>
                <v-flex xs6>
                  <v-subheader>Longitude</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select :items="filteredItemLong" v-model="long" label="Select" single-line clearable></v-select>
                </v-flex>
                <template v-if='$store.state.totalLevels-1 > 1'>
                  <v-flex xs6>
                    <v-subheader>Level 1</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel1" v-model="level1" @blur="$v.level1.$touch()" @change="$v.level1.$touch()" :error-messages="level1Errors" required label="Select" single-line clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels-1 > 2'>
                  <v-flex xs6>
                    <v-subheader>Level 2</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel2" v-model="level2" @blur="$v.level2.$touch()" @change="$v.level2.$touch()" :error-messages="level2Errors" label="Select" required single-line clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels-1 > 3'>
                  <v-flex xs6>
                    <v-subheader>Level 3</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel3" v-model="level3" label="Select" single-line clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels-1 > 4'>
                  <v-flex xs6>
                    <v-subheader>Level 4</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel4" v-model="level4" label="Select" single-line clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels-1 > 5'>
                  <v-flex xs6>
                    <v-subheader>Level 5</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel5" v-model="level5" label="Select" single-line clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels-1 > 6'>
                  <v-flex xs6>
                    <v-subheader>Level 6</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel6" v-model="level6" label="Select" single-line clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels-1 > 7'>
                  <v-flex xs6>
                    <v-subheader>Level 7</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel7" v-model="level7" label="Select" single-line clearable></v-select>
                  </v-flex>
                </template>
              </v-layout>
            </v-container>
            <v-btn color="primary" @click.native="confirmUpload = true" :disabled="$v.$invalid">Upload</v-btn>
            <v-btn color="error" @click.native="e1 = 1">Go Back</v-btn>
          </v-stepper-content>
        </v-stepper-items>
      </v-stepper>
    </v-slide-y-transition>
    <app-FacilityReconDbAdmin v-show='$store.state.showArchives' v-if='!$store.state.denyAccess'></app-FacilityReconDbAdmin>
  </v-container>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<script>
import axios from 'axios'
import FacilityReconDbAdmin from './FacilityReconDbAdmin.vue'
import { required } from 'vuelidate/lib/validators'

const config = require('../../config')
const isProduction = process.env.NODE_ENV === 'production'
const backendServer = (isProduction ? config.build.backend : config.dev.backend)

export default {
  data () {
    return {
      errorDialog: false,
      errorTitle: '',
      errorContent: '',
      dialog: false,
      percentDialog: false,
      uploadPrepaProgr: false,
      UploadProgressTimer: '',
      uploadStatus: '1/4 Uploading CSV to the server',
      uploadPercent: null,
      confirmUpload: false,
      confirmTitle: '',
      confirmMsg: '',
      showArchives: false,
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
      uploadedHeaders: [
      ],
      mappedHeaders: [],
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
    level1: {
      required: required
    },
    level2: {
      required: required
    }
  },
  components: {
    appFacilityReconDbAdmin: FacilityReconDbAdmin
  },
  methods: {
    fileSelected (e) {
      this.uploadedFileName = e.target.files[0]['name']
      if (e.target.files[0]['type'] !== 'text/csv') {
        this.errorDialog = true
        this.errorTitle = 'Error'
        this.errorContent = 'Wrong file type uploaded,Only CSV format is supported'
        this.uploadedFileName = ''
      }
      this.file = e.target.files[0]
      let reader = new FileReader()
      reader.addEventListener('load', function () {
        var data = reader.result
        var byteLength = data.byteLength
        var ui8a = new Uint8Array(data, 0)
        var headerString = ''
        for (var i = 0; i < byteLength; i++) {
          var char = String.fromCharCode(ui8a[i])
          if (char.match(/[^\r\n]+/g) !== null) {
            headerString += char
          } else {
            break
          }
        }
        this.uploadedHeaders = headerString.split(',')
      }.bind(this), false)
      reader.readAsArrayBuffer(e.target.files[0])
    },

    confirmSubmit () {
      this.confirmUpload = true
    },
    checkUploadProgress () {
      const orgId = this.$store.state.orgUnit.OrgId
      const clientId = this.$store.state.clientId
      axios.get(backendServer + '/uploadProgress/' + orgId + '/' + clientId).then((uploadProgress) => {
        if (uploadProgress.data === null || uploadProgress.data === undefined || uploadProgress.data === false) {
          this.$store.state.uploadRunning = false
          this.uploadPrepaProgr = false
          this.percentDialog = false
          clearInterval(this.UploadProgressTimer)
          return
        } else if (uploadProgress.data.error !== null) {
          this.$store.state.uploadRunning = false
          this.uploadPrepaProgr = false
          this.percentDialog = false
          this.$store.state.dialogError = true
          this.$store.state.errorTitle = 'Error'
          this.$store.state.errorDescription = uploadProgress.data.error
          clearInterval(this.UploadProgressTimer)
          console.log(uploadProgress.data.error)
        } else if (uploadProgress.data.status === null) {
          this.$store.state.uploadRunning = false
          this.uploadPrepaProgr = false
          this.percentDialog = false
          clearInterval(this.UploadProgressTimer)
        }
        this.uploadStatus = uploadProgress.data.status
        if (uploadProgress.data.percent) {
          if (!this.percentDialog) {
            this.uploadPrepaProgr = false
            this.percentDialog = true
          }
          this.uploadPercent = uploadProgress.data.percent
        }
        if (uploadProgress.data.status === 'Done') {
          clearInterval(this.UploadProgressTimer)
          this.$root.$emit('recalculateScores')
          this.$root.$emit('reloadTree')
          this.percentDialog = false
          this.dialog = true
          this.$store.state.uploadRunning = false
        }
      }).catch((err) => {
        console.log(err)
      })
    },
    submitCSV () {
      let formData = new FormData()
      formData.append('file', this.file)
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
      formData.append('orgid', this.$store.state.orgUnit.OrgId)
      formData.append('orgname', this.$store.state.orgUnit.OrgName)
      formData.append('clientId', this.$store.state.clientId)
      this.confirmUpload = false
      this.$store.state.uploadRunning = true
      this.uploadPrepaProgr = true
      axios.post(backendServer + '/uploadCSV',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      ).then((data) => {
        this.UploadProgressTimer = setInterval(this.checkUploadProgress, 1000)
      }).catch((err) => {
        this.$store.state.uploadRunning = false
        this.uploadPrepaProgr = false
        this.percentDialog = false
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        this.$store.state.errorDescription = err.response.data.error + '. Reload page and retry'
        clearInterval(this.checkUploadProgress)
        console.log(err.response.data.error)
      })
    },
    closeDialog (component) {
      this.$router.push({ name: component })
      // location.reload()
      this.dialog = false
    }
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
    latErrors () {
      const errors = []
      if (!this.$v.lat.$dirty) return errors
      !this.$v.lat.required && errors.push('Latitude is required')
      return errors
    },
    longErrors () {
      const errors = []
      if (!this.$v.long.$dirty) return errors
      !this.$v.long.required && errors.push('Longitude is required')
      return errors
    },
    level1Errors () {
      const errors = []
      if (!this.$v.level1.$dirty) return errors
      !this.$v.level1.required && errors.push('Level 1 is required')
      return errors
    },
    level2Errors () {
      const errors = []
      if (!this.$v.level2.$dirty) return errors
      !this.$v.level2.required && errors.push('Level 2 is required')
      return errors
    },
    /*
    level3Errors () {
      const errors = []
      if (!this.$v.level3.$dirty) return errors
      !this.$v.level3.required && errors.push('Level 3 is required')
      return errors
    },
    */
    level4Errors () {
      const errors = []
      if (!this.$v.level4.$dirty) return errors
      !this.$v.level4.required && errors.push('Level 4 is required')
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
    if (this.percentDialog || this.uploadPrepaProgr) {
      this.UploadProgressTimer = setInterval(this.checkUploadProgress, 1000)
    }
  },
  destroyed () {
    this.$store.state.uploadProgressData.dialog = this.dialog
    this.$store.state.uploadProgressData.percentDialog = this.percentDialog
    this.$store.state.uploadProgressData.uploadPrepaProgr = this.uploadPrepaProgr
    this.$store.state.uploadProgressData.UploadProgressTimer = this.UploadProgressTimer
    this.$store.state.uploadProgressData.uploadStatus = this.uploadStatus
    this.$store.state.uploadProgressData.uploadPercent = this.uploadPercent
    clearInterval(this.checkUploadProgress)
  }
}
</script>

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
