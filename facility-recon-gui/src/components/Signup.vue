<template>
  <v-container fluid>
    <v-layout
      row
      wrap
    >
      <v-spacer />
      <v-flex xs6>
        <v-alert
          style="width: 900px"
          v-model="alertSuccess"
          type="success"
          dismissible
          transition="scale-transition"
        >
          {{alertMsg}}
        </v-alert>
        <v-alert
          style="width: 900px"
          v-model="alertFail"
          type="error"
          dismissible
          transition="scale-transition"
        >
          {{alertMsg}}
        </v-alert>
        <v-card
          class="mx-auto"
          style="max-width: 1500px;"
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
            <v-card-title class="title font-weight-regular">Create Account</v-card-title>
          </v-toolbar>
          <v-form
            ref="form"
            class="pa-3 pt-4"
          >
            <v-layout
              column
              wrap
            >
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-text-field
                      required
                      @blur="$v.firstname.$touch()"
                      @change="$v.firstname.$touch()"
                      :error-messages="firstnameErrors"
                      v-model="firstname"
                      box
                      color="deep-purple"
                      label="First Name"
                    />
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-text-field
                      required
                      @blur="$v.surname.$touch()"
                      @change="$v.surname.$touch()"
                      :error-messages="surnameErrors"
                      v-model="surname"
                      box
                      color="deep-purple"
                      label="Surname"
                    />
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-text-field
                      v-model="othername"
                      box
                      color="deep-purple"
                      label="Middle Names"
                    />
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-text-field
                      required
                      @blur="validatePhone"
                      @change="validatePhone"
                      @input="validatePhone"
                      :error-messages="phoneErrors"
                      v-model="phone"
                      box
                      color="deep-purple"
                      label="Phone"
                    />
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-text-field
                      required
                      @blur="validateEmail"
                      @change="validateEmail"
                      @input="validateEmail"
                      :error-messages="emailErrors"
                      v-model="email"
                      box
                      color="deep-purple"
                      label="Email*"
                    />
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-text-field
                      required
                      @blur="$v.username.$touch()"
                      @change="$v.surname.$touch()"
                      :error-messages="usernameErrors"
                      v-model="username"
                      box
                      color="deep-purple"
                      label="Username"
                    />
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
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
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
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
                  </v-flex>
                </v-layout>
              </v-flex>
            </v-layout>
            <label
              v-for='(type, name) in $store.state.customSignupFields'
              :key="name"
            >
              <v-text-field
                v-if='type.required'
                required
                v-model="customFields[name]"
                box
                color="deep-purple"
                :label="type.display"
              />
              <v-text-field
                v-else
                required
                v-model="customFields[name]"
                box
                color="deep-purple"
                :label="type.display"
              />
            </label>
          </v-form>
          <v-divider />
          <v-card-actions>
            <v-btn
              flat
              @click="$refs.form.reset()"
            >
              <v-icon>clear</v-icon>Clear
            </v-btn>
            <v-spacer />
            <v-btn
              @click="displayLogin"
              flat
            >
              <v-icon>lock</v-icon>Back To Login
            </v-btn>
            <v-spacer />
            <v-btn
              @click="signup()"
              :disabled="$v.$invalid"
              class="white--text"
              color="deep-purple accent-4"
              depressed
            >
              <v-icon left>how_to_reg</v-icon>Add
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
import VueCookies from 'vue-cookies'
const backendServer = process.env.BACKEND_SERVER

export default {
  validations: {
    username: { required },
    retype_password: { required },
    password: { required },
    firstname: { required },
    surname: { required },
    phone: { required },
    email: { required }
  },
  data () {
    return {
      firstname: '',
      othername: '',
      surname: '',
      phone: '',
      email: '',
      username: '',
      password: '',
      retype_password: '',
      customFields: [],
      phoneErrors: [],
      emailErrors: [],
      alertFail: false,
      alertSuccess: false,
      alertMsg: ''
    }
  },
  methods: {
    validateEmail () {
      this.emailErrors = []
      if (!this.email) {
        this.emailErrors.push('Email is required')
        return false
      }
      let re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!re.test(this.email)) {
        this.emailErrors.push('Invalid Email')
        return false
      }
    },
    validatePhone () {
      this.phoneErrors = []
      if (!this.phone) {
        return this.phoneErrors.push('Phone is required')
      }
      let re = /^[+]?[\s./0-9]*[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/g
      if (!re.test(this.phone)) {
        return this.phoneErrors.push('Invalid phone number')
      }
    },
    signup () {
      if (this.password !== this.retype_password) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        this.$store.state.errorDescription = 'Password mismatch'
      }
      this.$store.state.dynamicProgress = true
      this.$store.state.progressTitle = 'Creating Account'
      let formData = new FormData()
      formData.append('firstName', this.firstname)
      formData.append('otherName', this.othername)
      formData.append('surname', this.surname)
      formData.append('phone', this.phone)
      formData.append('email', this.email)
      formData.append('password', this.password)
      formData.append('userName', this.username)
      if (this.$store.state.config.generalConfig.selfRegistration.requiresApproval) {
        formData.append('status', 'Pending')
      }
      for (let field in this.customFields) {
        formData.append(field, this.customFields[field])
      }
      axios
        .post(backendServer + '/addUser/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(() => {
          let fields = Object.keys(this.$v.$params)
          for (let field of fields) {
            this.$v[field].$reset()
          }
          this.$refs.form.reset()
          this.$store.state.dynamicProgress = false
          this.alertSuccess = true
          if (this.$store.state.config.generalConfig.selfRegistration.requiresApproval) {
            this.alertMsg = 'Account created and waiting for approval, you will receive an email once approved'
          } else {
            this.alertMsg = 'Account created successfully'
          }
        })
        .catch(err => {
          this.$store.state.dynamicProgress = false
          this.alertFail = true
          this.alertMsg = 'This account was not added, try different username'
          console.log(err.response.data.error)
        })
    },
    displayLogin () {
      this.$router.push({ name: 'Login' })
    }
  },
  computed: {
    codeErrors () {
      const errors = []
      if (!this.$v.code.$dirty) return errors
      !this.$v.code.required && errors.push('Code is required')
      return errors
    },
    firstnameErrors () {
      const errors = []
      if (!this.$v.firstname.$dirty) return errors
      !this.$v.firstname.required && errors.push('First Name is required')
      return errors
    },
    surnameErrors () {
      const errors = []
      if (!this.$v.surname.$dirty) return errors
      !this.$v.surname.required && errors.push('Surname is required')
      return errors
    },
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
    },
    retype_passwordErrors () {
      const errors = []
      if (!this.$v.retype_password.$dirty) return errors
      !this.$v.retype_password.required && errors.push('Re-type Password')
      return errors
    }
  },
  created () {
    this.$store.state.signupFields = VueCookies.get('signupFields')
    this.$store.state.customSignupFields = VueCookies.get('customSignupFields')
  }
}
</script>
