<template>
  <v-container>
    <v-card
      class="pt-4 mx-auto"
      flat
      max-width="500"
    >
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
        v-model="alertFail"
        type="error"
        dismissible
        transition="scale-transition"
      >
        {{alertMsg}}
      </v-alert>
      <v-card-title primary-title>
        <b>Adding New {{displayText}}</b>
      </v-card-title>
      <v-card-text>
        <v-card>
          <v-form
            ref="form"
            class="pa-3 pt-4"
          >
            <v-text-field
              required
              @blur="$v.name.$touch()"
              @change="$v.name.$touch()"
              :error-messages="nameErrors"
              v-model="name"
              box
              color="deep-purple"
              label="Name"
            />
            <v-text-field
              required
              v-model="code"
              box
              color="deep-purple"
              label="Code"
            />
          </v-form>
          <v-card-actions>
            <v-btn
              flat
              @click="$refs.form.reset()"
            >
              <v-icon>clear</v-icon>Clear
            </v-btn>
            <v-spacer />
            <v-btn
              @click="addServiceType()"
              :disabled="$v.$invalid"
              class="white--text"
              color="deep-purple accent-4"
              depressed
            >
              <v-icon left>add</v-icon>Add
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-card-text>
    </v-card>
  </v-container>
</template>
<script>
import axios from 'axios'
import { required } from 'vuelidate/lib/validators'
const backendServer = process.env.BACKEND_SERVER
export default {
  validations: {
    name: { required }
  },
  props: ['codeSystemType', 'displayText'],
  data () {
    return {
      alertFail: false,
      alertSuccess: false,
      alertMsg: '',
      name: '',
      code: ''
    }
  },
  methods: {
    addServiceType () {
      let formData = new FormData()
      formData.append('name', this.name)
      formData.append('code', this.code)
      formData.append('codeSystemType', this.codeSystemType)
      axios.post(backendServer + '/FR/addCodeSystem', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        this.alertSuccess = true
        this.alertMsg = 'Code system added successfully!'
        this.$refs.form.reset()
      }).catch((err) => {
        this.alertFail = true
        this.alertMsg = 'Failed to add code system!'
        console.log(err)
      })
    }
  },
  computed: {
    nameErrors () {
      const errors = []
      if (!this.$v.name.$dirty) return errors
      !this.$v.name.required && errors.push('Name is required')
      return errors
    }
  }
}
</script>