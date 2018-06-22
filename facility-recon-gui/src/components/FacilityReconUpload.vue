<template>
  <v-container fluid>
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          Alert
        </v-card-title>
        <v-card-text>
          Data submitted and scores are being calculated
        </v-card-text>
        <v-card-actions>
          <v-btn color="error" @click.native="closeDialog('FacilityReconHome')">Close</v-btn>
          <v-btn color="primary" dark @click.native="closeDialog('FacilityReconView')" >View Data</v-btn>
          <v-btn color="primary" dark @click.native="closeDialog('FacilityReconScores')" >View Scores</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-slide-y-transition mode="out-in">
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
                <div class="btn btn-primary jbtn-file">Upload CSV<input
                  type="file" @change="fileSelected">
                </div>
                {{uploadedFileName}}
                  
              </v-card-text>
            </v-card>
            <v-btn color="primary" @click.native="e1 = 2">Continue</v-btn>
            <v-btn flat>Cancel</v-btn>
          </v-stepper-content>
          <v-stepper-content step="2">

            <v-container fluid>
              <v-layout row wrap ref="form" v-model="valid">
                <v-flex xs6>
                  <v-subheader>Facility*</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select :items="filteredItemFacility"
                  v-model="facility"
                  @blur="$v.facility.$touch()"
                  @change="$v.facility.$touch()"
                  :error-messages="facilityErrors"
                  label="Select"
                  required
                  single-line
                  clearable></v-select>
                </v-flex>
                <v-flex xs6>
                  <v-subheader>Code</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select :items="filteredItemCode"
                  v-model="code"
                  @blur="$v.code.$touch()"
                  @change="$v.code.$touch()"
                  :error-messages="codeErrors"
                  label="Select"
                  required
                  single-line
                  clearable></v-select>
                </v-flex>
                <v-flex xs6>
                  <v-subheader>Latitude</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select :items="filteredItemLat"
                  v-model="lat"
                  label="Select"
                  @blur="$v.lat.$touch()"
                  @change="$v.lat.$touch()"
                  :error-messages="latErrors"
                  required
                  single-line
                  clearable></v-select>
                </v-flex>
                <v-flex xs6>
                  <v-subheader>Longitude</v-subheader>
                </v-flex>
                <v-flex xs6>
                  <v-select :items="filteredItemLong"
                  v-model="long"
                  label="Select"
                  @blur="$v.long.$touch()"
                  @change="$v.long.$touch()"
                  :error-messages="longErrors"
                  required
                  single-line
                  clearable></v-select>
                </v-flex>
                <template v-if='$store.state.totalLevels > 1'>
                  <v-flex xs6>
                    <v-subheader>Level 1</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel1"
                    v-model="level1"
                    @blur="$v.level1.$touch()"
                    @change="$v.level1.$touch()"
                    :error-messages="level1Errors"
                    required
                    label="Select"
                    single-line
                    clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels > 2'>
                  <v-flex xs6>
                    <v-subheader>Level 2</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel2"
                    v-model="level2"
                    @blur="$v.level2.$touch()"
                    @change="$v.level2.$touch()"
                    :error-messages="level2Errors"
                    label="Select"
                    required
                    single-line
                    clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels > 3'>
                  <v-flex xs6>
                    <v-subheader>Level 3</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel3"
                    v-model="level3"
                    @blur="$v.level3.$touch()"
                    @change="$v.level3.$touch()"
                    :error-messages="level3Errors"
                    label="Select"
                    required
                    single-line
                    clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels > 4'>
                  <v-flex xs6>
                    <v-subheader>Level 4</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel4"
                    v-model="level4"
                    @blur="$v.level4.$touch()"
                    @change="$v.level4.$touch()"
                    :error-messages="level4Errors"
                    required
                    label="Select"
                    single-line
                    clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels > 5'>
                  <v-flex xs6>
                    <v-subheader>Level 5</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel5"
                    v-model="level5"
                    label="Select"
                    single-line
                    clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels > 6'>
                  <v-flex xs6>
                    <v-subheader>Level 6</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel6"
                    v-model="level6"
                    label="Select"
                    single-line
                    clearable></v-select>
                  </v-flex>
                </template>
                <template v-if='$store.state.totalLevels > 7'>
                  <v-flex xs6>
                    <v-subheader>Level 7</v-subheader>
                  </v-flex>
                  <v-flex xs6>
                    <v-select :items="filteredItemLevel7"
                    v-model="level7"
                    label="Select"
                    single-line
                    clearable></v-select>
                  </v-flex>
                </template>
              </v-layout>
            </v-container>
            <v-btn color="primary" @click.native="submitCSV" :disabled="$v.$invalid">Upload</v-btn>
            <v-btn color="error" @click.native="e1 = 1">Go Back</v-btn>
          </v-stepper-content>
        </v-stepper-items>
      </v-stepper>
    </v-slide-y-transition>
  </v-container>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<script>
import axios from 'axios'
import { required } from 'vuelidate/lib/validators'
export default {
  data () {
    return {
      dialog: false,
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
    lat: {
      required: required
    },
    long: {
      required: required
    },
    level1: {
      required: required
    },
    level2: {
      required: required
    },
    level3: {
      required: required
    },
    level4: {
      required: required
    }
  },
  methods: {
    fileSelected (e) {
      this.uploadedFileName = e.target.files[0]['name']
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
      // this.dialog = true
      axios.post('http://localhost:3000/uploadCSV/lZsCb6y0KDX',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      ).then((data) => {
        this.$store.state.mohHierarchy = data
      }).catch((err) => {
        console.log(err)
      })
    },
    closeDialog (component) {
      this.$router.push({name: component})
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
    level3Errors () {
      const errors = []
      if (!this.$v.level3.$dirty) return errors
      !this.$v.level3.required && errors.push('Level 3 is required')
      return errors
    },
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
  }
}
</script>

<style scoped>
  .jbtn-file {
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }
  .jbtn-file input[type=file] {
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
    background-color: #ffc9aa
  }
  .input.invalid label {
    color: red
  }
</style>
