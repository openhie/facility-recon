<template>
  <v-container>
    <v-card>
      <v-card-text>
        <v-layout column>
          <v-flex background-color="primary">
            <v-layout column>
              <v-flex>
                <v-switch
                  @change="configChanged"
                  color="success"
                  label="Use CSV header for display"
                  v-model="$store.state.config.userConfig.reconciliation.useCSVHeader"
                >
                </v-switch>
              </v-flex>
              <v-flex>
                <v-switch
                  @change="configChanged"
                  color="success"
                  label="Perform match based on parent constraint"
                  v-model="$store.state.config.userConfig.reconciliation.parentConstraint"
                >
                </v-switch>
              </v-flex>
              <v-flex>
                <v-switch
                  @change="configChanged"
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
            </v-layout>
          </v-flex>
        </v-layout>
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
      signupFields: []
    }
  },
  methods: {
    configChanged () {
      let userID = this.$store.state.auth.userID
      let formData = new FormData()
      formData.append('config', JSON.stringify(this.$store.state.config))
      formData.append('userID', userID)
      axios
        .post(backendServer + '/updateConfig', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(() => {
          eventBus.$emit('changeCSVHeaderNames')
        })
    },
    addMoreFields () {
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
        })

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
  }
}
</script>
