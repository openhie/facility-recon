<template>
  <v-container>
    <v-card>
      <v-card-title primary-title>
        <b>System Configurations</b>
      </v-card-title>
      <v-card-text>
        <v-card>
          <v-card-title primary-title>
            User Configurations
          </v-card-title>
          <v-card-text>
            <v-layout column>
              <v-flex>
                <v-switch
                  @change="saveConfiguration('userConfig', 'useCSVHeader')"
                  color="primary"
                  label="Use CSV header for display"
                  v-model="$store.state.config.userConfig.reconciliation.useCSVHeader"
                >
                </v-switch>
              </v-flex>
            </v-layout>
          </v-card-text>
        </v-card>
        <v-divider></v-divider>
        <v-divider></v-divider>
        <v-divider></v-divider>
        <v-card v-if='$store.state.auth.role == "Admin"'>
          <v-card-title>
            General Configurations
          </v-card-title>
          <v-card-text>
            <v-layout column>
              <v-flex>
                <v-switch
                  @change="saveConfiguration('generalConfig', 'parentConstraint')"
                  color="primary"
                  label="Perform match based on parent constraint"
                  v-model="$store.state.config.generalConfig.reconciliation.parentConstraint.enabled"
                >
                </v-switch>
                <v-switch
                  v-if="$store.state.dhis.user.orgId"
                  @change="saveConfiguration('generalConfig', 'parentConstraint')"
                  color="primary"
                  label="Single data source pair per org unit"
                  v-model="$store.state.config.generalConfig.reconciliation.singlePair"
                >
                </v-switch>
                <v-card
                  v-if="!$store.state.config.generalConfig.reconciliation.parentConstraint.enabled"
                  color="grey lighten-3"
                  style="margin-left:100px"
                >
                  <v-checkbox
                    @change="saveConfiguration('generalConfig', 'parConstrIdAuto')"
                    color="success"
                    label="Automatch By ID"
                    v-model="$store.state.config.generalConfig.reconciliation.parentConstraint.idAutoMatch"
                    disabled
                  ></v-checkbox>
                  <v-checkbox
                    @change="saveConfiguration('generalConfig', 'parConstrNameAuto')"
                    color="success"
                    label="Automatch By Name (when parents differ)"
                    v-model="$store.state.config.generalConfig.reconciliation.parentConstraint.nameAutoMatch"
                  ></v-checkbox>
                </v-card>
              </v-flex>
              <v-flex>
                <v-switch
                  @change="saveConfiguration('generalConfig', 'authDisabled')"
                  color="primary"
                  label="Disable Authentication"
                  v-model="$store.state.config.generalConfig.authDisabled"
                >
                </v-switch>
                <v-card
                  v-if="$store.state.config.generalConfig.authDisabled"
                  color="grey lighten-3"
                  style="margin-left:100px"
                >
                  External Authentication Method
                  <v-radio-group
                    v-model="$store.state.config.generalConfig.authMethod"
                    @change="saveConfiguration('generalConfig', 'useDhis2Auth')"
                  >
                    <v-radio label="dhis2" value="dhis2" disabled></v-radio>
                    <v-radio label="iHRIS" value="iHRIS" disabled></v-radio>
                  </v-radio-group>
                  <v-select
                    @change="saveConfiguration('generalConfig', 'externalAuth')"
                    label="Superuser Role Name"
                    item-text='displayName'
                    item-value='id'
                    :loading="loadingDhis2Roles"
                    required
                    :items="dhis2Roles"
                    v-model="$store.state.config.generalConfig.externalAuth.adminRole"
                  ></v-select>
                  <v-checkbox
                    @change="saveConfiguration('generalConfig', 'externalAuth')"
                    color="success"
                    v-if="$store.state.config.generalConfig.authMethod"
                    label="Pull org units"
                    v-model="$store.state.config.generalConfig.externalAuth.pullOrgUnits">
                  </v-checkbox>
                  <v-checkbox
                    @change="saveConfiguration('generalConfig', 'externalAuth')"
                    color="success"
                    v-if="$store.state.config.generalConfig.externalAuth.pullOrgUnits"
                    label="Share orgs with other users"
                    v-model="$store.state.config.generalConfig.externalAuth.shareOrgUnits">
                  </v-checkbox>
                  <v-checkbox
                    @change="saveConfiguration('generalConfig', 'externalAuth')"
                    color="success"
                    v-if="
                      $store.state.config.generalConfig.externalAuth.shareOrgUnits &&
                      $store.state.config.generalConfig.externalAuth.pullOrgUnits
                    "
                    label="Limit orgs sharing by user orgid"
                    v-model="$store.state.config.generalConfig.externalAuth.shareByOrgId">
                  </v-checkbox>
                  <v-text-field
                    v-if="$store.state.config.generalConfig.externalAuth.pullOrgUnits"
                    label="Dataset Name"
                    v-model="$store.state.config.generalConfig.externalAuth.datasetName"
                    @blur="ensureNameUnique" @input="ensureNameUnique" :error-messages="datasetNameErrors"
                    required
                  ></v-text-field>
                  <v-text-field
                    v-if="$store.state.config.generalConfig.externalAuth.pullOrgUnits"
                    label="Username"
                    v-model="$store.state.config.generalConfig.externalAuth.userName"
                    required
                  ></v-text-field>
                  <v-text-field
                    v-if="$store.state.config.generalConfig.externalAuth.pullOrgUnits"
                    label="Password"
                    v-model="$store.state.config.generalConfig.externalAuth.password"
                    type="password"
                    required
                  ></v-text-field>
                  <v-flex xs3>
                    <v-btn
                      color="success"
                      :disabled='datasetNameErrors.length > 0 || !$store.state.config.generalConfig.externalAuth.datasetName'
                      small
                      round
                      v-if="$store.state.config.generalConfig.externalAuth.pullOrgUnits"
                      @click="pullOrgUnits"
                    >start pulling</v-btn>
                  </v-flex>
                </v-card>
              </v-flex>
              <v-flex>
                <v-switch
                  @change="saveConfiguration('generalConfig', 'selfRegistration')"
                  color="primary"
                  label="Enable self registration"
                  v-model="$store.state.config.generalConfig.selfRegistration"
                >
                </v-switch>
                <v-layout
                  row
                  wrap
                  v-if='$store.state.config.generalConfig.selfRegistration'
                >
                  <v-spacer></v-spacer>
                  <v-flex xs3>
                    <v-treeview :items="signupFields"></v-treeview>
                  </v-flex>
                  <v-flex xs8>
                    <v-btn
                      small
                      round
                      @click='moreFields = !moreFields'
                      color="success"
                    >Add More Fields</v-btn>
                    <v-text-field
                      v-if='moreFields'
                      v-model="fieldLabel"
                      label="Field Label"
                    ></v-text-field>
                    <v-text-field
                      v-if='moreFields'
                      v-model="fieldName"
                      label="Unique Name"
                    ></v-text-field>
                    <v-select
                      v-if='moreFields'
                      :items="requiredText"
                      v-model="required"
                      label="Required"
                    ></v-select>
                    <v-btn
                      color="info"
                      small
                      v-if='moreFields'
                      @click='addMoreFields'
                    >Save</v-btn>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex xs1>
                <v-switch
                  @change="saveConfiguration('generalConfig', 'recoProgressNotification')"
                  color="primary"
                  label="Enable Endpoint Notification when reconciliation is done"
                  v-model="$store.state.config.generalConfig.recoProgressNotification.enabled"
                >
                </v-switch>
                <v-card
                  color="grey lighten-3"
                  v-if='$store.state.config.generalConfig.recoProgressNotification.enabled'
                  style="margin-left:100px"
                >
                  <v-card-text>
                    End point to send notification when reconciliation is done
                  </v-card-text>
                  <v-card-actions>
                    <v-layout column>
                      <v-flex>
                        <v-text-field
                          label="End point URL"
                          v-model="notification_endpoint"
                          box
                        ></v-text-field>
                      </v-flex>
                      <v-flex>
                        <v-text-field
                          label="End point Username"
                          v-model="notification_username"
                          box
                        ></v-text-field>
                      </v-flex>
                      <v-flex>
                        <v-text-field
                          label="End point Password"
                          v-model="notification_password"
                          box
                        ></v-text-field>
                      </v-flex>
                      <v-flex>
                        <v-layout row wrap>
                          <v-spacer></v-spacer>
                          <v-flex xs1>
                            <v-btn color="success" @click="recoProgressNotificationChanged"><v-icon>save</v-icon>Save</v-btn>
                          </v-flex>
                        </v-layout>
                      </v-flex>
                    </v-layout>
                  </v-card-actions>
                </v-card>
              </v-flex>
            </v-layout>
          </v-card-text>
        </v-card>
      </v-card-text>
    </v-card>
    <appRemoteSync
      syncType="dhisSync"
      :serverName="$store.state.config.generalConfig.externalAuth.datasetName"
      :userID="$store.state.auth.userID"
      :sourceOwner="$store.state.auth.userID"
      mode="full"
    >
    </appRemoteSync>
  </v-container>
</template>
<script>
import axios from 'axios'
import RemoteSync from './DataSources/RemoteSync'
import { eventBus } from '../main'
import VueCookies from 'vue-cookies'
import { required } from 'vuelidate/lib/validators'
import { generalMixin } from '@/mixins/generalMixin'
const backendServer = process.env.BACKEND_SERVER
export default {
  mixins: [generalMixin],
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
  data () {
    return {
      useCSVHeader: false,
      moreFields: false,
      fieldLabel: '',
      fieldName: '',
      required: 'No',
      requiredText: ['Yes', 'No'],
      signupFields: [],
      notification_endpoint: '',
      notification_username: '',
      notification_password: '',
      dhis2Roles: [],
      loadingDhis2Roles: false,
      datasetNameErrors: []
    }
  },
  methods: {
    recoProgressNotificationChanged () {
      if (!this.$store.state.config.generalConfig.hasOwnProperty('recoProgressNotification')) {
        this.$store.state.config.generalConfig.recoProgressNotification = {}
      }
      this.$store.state.config.generalConfig.recoProgressNotification.url = this.notification_endpoint
      this.$store.state.config.generalConfig.recoProgressNotification.username = this.notification_username
      this.$store.state.config.generalConfig.recoProgressNotification.password = this.notification_password
      this.saveConfiguration('generalConfig')
    },
    addMoreFields () {
      this.$store.state.progressTitle = 'Saving field'
      // this.$store.state.dynamicProgress = true
      let exist = this.signupFields[0].children.find(child => {
        return child.id === this.fieldName
      })
      if (!exist) {
        let formData = new FormData()
        let required
        if (this.required === 'Yes') {
          required = true
        } else {
          required = false
        }
        formData.append('fieldName', this.fieldName)
        formData.append('fieldLabel', this.fieldLabel)
        formData.append('fieldRequired', required)
        formData.append('form', 'signup')
        axios.post(backendServer + '/addFormField', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }).then(() => {
          this.$store.state.dynamicProgress = false
          this.$store.state.dialogError = true
          this.$store.state.errorTitle = 'Info'
          this.$store.state.errorDescription = 'Field added successfully'

          this.$store.state.signupFields[this.fieldName] = {
            type: 'String',
            display: this.fieldLabel
          }
          this.$store.state.customSignupFields[this.fieldName] = {
            type: 'String',
            display: this.fieldLabel
          }
          VueCookies.set('signupFields', this.$store.state.signupFields, 'infinity')
          VueCookies.set('customSignupFields', this.$store.state.customSignupFields, 'infinity')

          this.signupFields[0].children.push({
            id: this.fieldName,
            name: this.fieldLabel
          })

          this.fieldName = ''
          this.fieldLabel = ''
          this.required = 'No'
        })
      } else {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        this.$store.state.errorDescription = 'Field name must be unique'
      }
    },
    pullOrgUnits () {
      this.saveConfiguration('generalConfig', 'externalAuth')
      let formData = new FormData()
      formData.append('host', this.$store.state.dhis.host)
      formData.append('sourceType', 'DHIS2')
      formData.append('source', 'syncServer')
      formData.append('shareToAll', this.$store.state.config.generalConfig.externalAuth.shareOrgUnits)
      formData.append('limitByUserLocation', this.$store.state.config.generalConfig.externalAuth.shareByOrgId)
      formData.append('username', this.$store.state.config.generalConfig.externalAuth.userName)
      formData.append('password', this.$store.state.config.generalConfig.externalAuth.password)
      formData.append('name', this.$store.state.config.generalConfig.externalAuth.datasetName)
      formData.append('userID', this.$store.state.auth.userID)

      axios.post(backendServer + '/addDataSource', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        eventBus.$emit('runRemoteSync')
      })
    },
    getDHIS2Roles (callback) {
      let auth = this.$store.state.dhis.dev.auth
      axios.get(this.$store.state.dhis.host + 'api/userRoles', {auth}).then((roles) => {
        callback(roles)
      })
    },
    ensureNameUnique () {
      this.datasetNameErrors = []
      if (this.$store.state.config.generalConfig.externalAuth.datasetName === '') {
        return this.datasetNameErrors.push('Dataset name is required')
      }
      for (let dtSrc of this.$store.state.dataSources) {
        if (dtSrc.name === this.uploadName) {
          this.datasetNameErrors.push('This Name Exists')
          return false
        }
      }
    }
  },
  created () {
    if (this.$store.state.config.generalConfig.authDisabled && this.$store.state.config.generalConfig.authMethod === 'dhis2') {
      this.loadingDhis2Roles = true
      this.getDHIS2Roles((roles) => {
        this.loadingDhis2Roles = false
        this.dhis2Roles = roles.data.userRoles
      })
    }
    this.signupFields.push({
      id: 'signupFields',
      name: 'Self Registration Fields',
      children: []
    })
    for (let field in this.$store.state.signupFields) {
      this.signupFields[0].children.push({
        id: field,
        name: field
      })
    }
    if (this.$store.state.config.generalConfig.hasOwnProperty('recoProgressNotification')) {
      this.notification_endpoint = this.$store.state.config.generalConfig.recoProgressNotification.url
      this.notification_username = this.$store.state.config.generalConfig.recoProgressNotification.username
      this.notification_password = this.$store.state.config.generalConfig.recoProgressNotification.password
    }
  },
  beforeCreate () {
    if (!this.$store.state.config.generalConfig.hasOwnProperty('authMethod')) {
      this.$set(this.$store.state.config.generalConfig, 'authMethod', 'dhis2')
    }
    if (!this.$store.state.config.generalConfig.hasOwnProperty('externalAuth')) {
      let externalAuth = {
        pullOrgUnits: true,
        shareOrgUnits: false,
        shareByOrgId: false,
        datasetName: '',
        adminRole: ''
      }
      this.$set(this.$store.state.config.generalConfig, 'externalAuth', externalAuth)
    }
  },
  components: {
    'appRemoteSync': RemoteSync
  }
}
</script>
