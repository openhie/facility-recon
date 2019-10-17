<template>
  <v-container>
    <v-layout
      row
      wrap
    >
      <v-spacer />
      <v-flex xs6>
        <v-card
          class="mx-auto"
          style="max-width: 500px;"
        >
          <v-system-bar
            color="deep-purple darken-4"
            dark
          />
          <v-toolbar
            color="deep-purple accent-4"
            cards
            dark
            flat
          >
            <v-card-title class="title font-weight-regular">Change Password</v-card-title>
          </v-toolbar>
          <v-form
            ref="form"
            class="pa-3 pt-4"
          >
            <v-text-field
              required
              @blur="$v.oldPassword.$touch()"
              @change="$v.oldPassword.$touch()"
              :error-messages="oldPasswordErrors"
              v-model="oldPassword"
              type="password"
              box
              color="deep-purple"
              label="Old Password"
            />
            <v-text-field
              required
              @blur="$v.password.$touch()"
              @change="$v.password.$touch()"
              :error-messages="passwordErrors"
              v-model="password"
              type="password"
              box
              color="deep-purple"
              label="Password"
            />
            <v-text-field
              required
              @blur="$v.retype_password.$touch()"
              @change="$v.retype_password.$touch()"
              :error-messages="retype_passwordErrors"
              v-model="retype_password"
              type="password"
              box
              color="deep-purple"
              label="Re-type Password"
            />
          </v-form>
          <v-divider />
          <v-card-actions>
            <v-btn
              flat
              @click="$store.state.baseRouterViewKey++"
            >
              <v-icon>clear</v-icon>Clear
            </v-btn>
            <v-spacer />
            <v-btn
              @click="verifyPassword()"
              :disabled="$v.$invalid"
              class="white--text"
              color="deep-purple accent-4"
              depressed
            >
              <v-icon left>how_to_reg</v-icon>Change
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
      <v-spacer />
    </v-layout>
  </v-container>
</template>
<script>
import axios from 'axios'
import { required } from 'vuelidate/lib/validators'
const backendServer = process.env.BACKEND_SERVER

export default {
  validations: {
    retype_password: { required },
    password: { required },
    oldPassword: { required }
  },
  data () {
    return {
      oldPassword: '',
      password: '',
      retype_password: ''
    }
  },
  methods: {
    changePassword () {
      if (this.password !== this.retype_password) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        this.$store.state.errorDescription = 'Password mismatch'
        return
      }
      this.$store.state.dynamicProgress = true
      this.$store.state.progressTitle = 'Changing Password'
      let formData = new FormData()
      formData.append('password', this.password)
      formData.append('id', this.$store.state.auth.userID)
      axios.post(backendServer + '/changePassword/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(() => {
        this.$store.state.alert.show = true
        this.$store.state.alert.width = '500px'
        this.$store.state.alert.msg = 'Password changed successfully!'
        this.$store.state.alert.type = 'success'
        // increment component key to force component reload
        this.$store.state.baseRouterViewKey += 1
      }).catch((err) => {
        this.$store.state.alert.show = true
        this.$store.state.alert.width = '500px'
        this.$store.state.alert.msg = 'Password change failed!'
        this.$store.state.alert.type = 'error'
        // increment component key to force component reload
        this.$store.state.baseRouterViewKey += 1
        console.log(err.response.data.error)
      })
    },
    verifyPassword () {
      let formData = new FormData()
      formData.append('username', this.$store.state.auth.username)
      formData.append('password', this.oldPassword)
      axios.post(backendServer + '/authenticate/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((authResp) => {
        if (authResp.data.token) {
          this.changePassword()
        } else {
          this.alertFail = true
          this.alertMsg = 'Wrong Old Password'
        }
      }).catch((err) => {
        console.log(JSON.stringify(err))
      })
    }
  },
  computed: {
    oldPasswordErrors () {
      const errors = []
      if (!this.$v.oldPassword.$dirty) return errors
      !this.$v.oldPassword.required && errors.push('Old Password is required')
      return errors
    },
    passwordErrors () {
      const errors = []
      if (!this.$v.password.$dirty) return errors
      !this.$v.password.required && errors.push('Password is required')
      return errors
    },
    retype_passwordErrors () {
      const errors = []
      if (!this.$v.retype_password.$dirty) return errors
      !this.$v.retype_password.required && errors.push('Re-type Password')
      return errors
    }
  }
}
</script>
