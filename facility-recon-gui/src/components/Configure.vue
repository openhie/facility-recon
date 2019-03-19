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
                  @change="configChanged('userConfig')"
                  color="success"
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
        <v-card>
          <v-card-title>
            General Configurations
          </v-card-title>
          <v-card-text>
            <v-layout column>
              <v-flex v-if='$store.state.auth.role == "Admin"'>
                <v-switch
                  @change="configChanged('generalConfig')"
                  color="success"
                  label="Perform match based on parent constraint"
                  v-model="$store.state.config.generalConfig.reconciliation.parentConstraint"
                >
                </v-switch>
              </v-flex>
              <v-flex v-if='$store.state.auth.role == "Admin"'>
                <v-switch
                  @change="configChanged('generalConfig')"
                  color="success"
                  label="Enable self registration"
                  v-model="$store.state.config.generalConfig.selfRegistration"
                >
                </v-switch>
                <v-layout
                  row
                  wrap
                  v-if='$store.state.config.generalConfig.selfRegistration'
                >
                  <v-flex xs3>
                    <v-treeview :items="signupFields"></v-treeview>
                  </v-flex>
                  <v-flex xs2>
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
              <v-flex xs1 v-if='$store.state.auth.role == "Admin"'>
                <v-switch
                  @change="configChanged('generalConfig')"
                  color="success"
                  label="Enable Endpoint Notification when reconciliation is done"
                  v-model="$store.state.config.generalConfig.recoProgressNotification.enabled"
                >
                </v-switch>
                <v-card 
                  color="grey lighten-3" 
                  v-if='$store.state.config.generalConfig.recoProgressNotification.enabled && $store.state.auth.role == "Admin"'
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
  </v-container>
</template>
<script>
import axios from 'axios'
import { eventBus } from '../main'
import VueCookies from 'vue-cookies'
const backendServer = process.env.BACKEND_SERVER
export default {
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
      notification_password: ''
    }
  },
  methods: {
    configChanged (configLevel) {
      let userID = this.$store.state.auth.userID
      let formData = new FormData()
      formData.append('config', JSON.stringify(this.$store.state.config))
      formData.append('userID', userID)
      let endPoint
      if (configLevel === 'generalConfig') {
        endPoint = '/updateGeneralConfig'
      } else {
        endPoint = '/updateUserConfig'
      }
      axios
        .post(backendServer + endPoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(() => {
          eventBus.$emit('changeCSVHeaderNames')
        })
    },
    recoProgressNotificationChanged () {
      if (!this.$store.state.config.generalConfig.hasOwnProperty('recoProgressNotification')) {
        this.$store.state.config.generalConfig.recoProgressNotification = {}
      }
      this.$store.state.config.generalConfig.recoProgressNotification.url = this.notification_endpoint
      this.$store.state.config.generalConfig.recoProgressNotification.username = this.notification_username
      this.$store.state.config.generalConfig.recoProgressNotification.password = this.notification_password
      this.configChanged('generalConfig')
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
    }
  },
  created () {
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
  }
}
</script>
