<template>
  <v-container>
    <v-card
      class="pt-4 mx-auto"
      flat
      max-width="500"
    >
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
              @blur="$v.code.$touch()"
              @change="$v.code.$touch()"
              :error-messages="codeErrors"
              v-model="code"
              box
              color="deep-purple"
              label="Code"
            />
          </v-form>
          <v-card-actions>
            <v-btn
              flat
              @click="$store.state.baseRouterViewKey++"
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
    name: { required },
    code: { required }
  },
  props: ['codeSystemType', 'displayText'],
  data () {
    return {
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
        this.$store.state.alert.show = true
        this.$store.state.alert.width = '500px'
        this.$store.state.alert.msg = 'Code system added successfully!'
        this.$store.state.alert.type = 'success'
        // increment component key to force component reload
        this.$store.state.baseRouterViewKey += 1
      }).catch((err) => {
        this.$store.state.alert.show = true
        this.$store.state.alert.width = '500px'
        this.$store.state.alert.msg = 'Failed to add code system!'
        this.$store.state.alert.type = 'error'
        // increment component key to force component reload
        this.$store.state.baseRouterViewKey += 1
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
    },
    codeErrors () {
      const errors = []
      if (!this.$v.code.$dirty) return errors
      !this.$v.code.required && errors.push('Code is required')
      return errors
    }
  }
}
</script>