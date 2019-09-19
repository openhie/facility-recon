<template>
  <v-container>
    <center>
      <v-layout
        row
        wrap
      >
        <v-flex xs3></v-flex>
        <v-flex xs6>
          <v-alert
            type="error"
            :value="authStatus"
          >
            Authentication Failed
          </v-alert>
        </v-flex>
      </v-layout>
      <v-card
        width="430px"
        hover
      >
        <v-card-title primary-title>
          <v-toolbar
            color="primary"
            style="color: white"
          >
            <v-layout
              row
              wrap
            >
              <v-flex
                xs2
                text-xs-left
              >
                <v-icon
                  x-large
                  color="white"
                >lock</v-icon>
              </v-flex>
              <v-flex
                xs9
                text-xs-right
              >
                <b>Login</b>
              </v-flex>
            </v-layout>
          </v-toolbar>
        </v-card-title>
        <v-card-text>
          <v-form
            ref="form"
            class="pa-3 pt-4"
          >
            <v-text-field
              required
              v-on:keyup.enter="authenticate()"
              @blur="$v.username.$touch()"
              @change="$v.username.$touch()"
              :error-messages="usernameErrors"
              v-model="username"
              box
              color="deep-purple"
              label="Username"
            />
            <v-text-field
              required
              v-on:keyup.enter="authenticate()"
              @blur="$v.password.$touch()"
              @change="$v.password.$touch()"
              :error-messages="passwordErrors"
              v-model="password"
              box
              type="password"
              color="deep-purple"
              label="Password"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-toolbar>
            <v-btn
              v-if="$store.state.config.generalConfig.selfRegistration.enabled"
              color="success"
              @click="displaySignup"
            >Signup</v-btn>
            <v-spacer></v-spacer>
            <v-btn
              @click="authenticate()"
              :disabled="$v.$invalid"
              class="white--text"
              color="success"
              depressed
            >Login</v-btn>
          </v-toolbar>
        </v-card-actions>
      </v-card>
    </center>
  </v-container>
</template>
<script>
import { required } from 'vuelidate/lib/validators'
import axios from 'axios'
import VueCookies from 'vue-cookies'
import { uuid } from 'vue-uuid'
import { eventBus } from '../main'
const backendServer = process.env.BACKEND_SERVER

export default {
  validations: {
    username: { required },
    password: { required }
  },
  data () {
    return {
      username: '',
      password: '',
      authStatus: false,
      signupEnabled: false
    }
  },
  methods: {
    authenticate () {
      let formData = new FormData()
      formData.append('username', this.username)
      formData.append('password', this.password)
      axios
        .post(backendServer + '/authenticate/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(authResp => {
          this.$store.state.auth.token = authResp.data.token
          this.$store.state.auth.username = this.username
          this.$store.state.auth.userID = authResp.data.userID
          this.$store.state.auth.role = authResp.data.role
          VueCookies.config('30d')
          VueCookies.set('token', this.$store.state.auth.token, 'infinity')
          VueCookies.set('userID', this.$store.state.auth.userID, 'infinity')
          VueCookies.set('role', this.$store.state.auth.role, 'infinity')
          VueCookies.set(
            'username',
            this.$store.state.auth.username,
            'infinity'
          )
          this.$store.state.auth.role = authResp.data.role
          if (authResp.data.token) {
            this.$store.state.clientId = uuid.v4()
            this.$store.state.initializingApp = true
            this.$store.state.denyAccess = false
            eventBus.$emit('getConfig')
          } else {
            this.authStatus = true
          }
        })
        .catch(err => {
          if (err.hasOwnProperty('response')) {
            console.log(err.response.data.error)
          }
        })
    },
    displaySignup () {
      this.$router.push({ name: 'Signup' })
    }
  },
  computed: {
    usernameErrors () {
      const errors = []
      if (!this.$v.username.$dirty) return errors
      !this.$v.username.required && errors.push('Username is required')
      return errors
    },
    passwordErrors () {
      const errors = []
      if (!this.$v.password.$dirty) return errors
      !this.$v.password.required && errors.push('Password is required')
      return errors
    }
  },
  created () {
    axios.get(backendServer + '/getSignupConf').then(resp => {
      if (resp.data) {
        this.signupEnabled = true
        this.$store.state.signupFields = resp.data.allSignupFields
        this.$store.state.customSignupFields = resp.data.customSignupFields
        VueCookies.set('signupFields', resp.data.allSignupFields, 'infinity')
        VueCookies.set('customSignupFields', resp.data.customSignupFields, 'infinity')
      }
    })
  },
  beforeCreate () {
    if (this.$store.state.config.generalConfig.authDisabled) {
      this.$store.state.clientId = uuid.v4()
      this.$store.state.initializingApp = true
      this.$store.state.denyAccess = false
      this.$router.push({ name: 'DHIS2Auth' })
    }
  }
}
</script>

