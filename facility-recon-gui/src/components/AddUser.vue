<template>
  <v-container>
    <v-layout
      row
      wrap>
      <v-spacer/>
      <v-flex xs6>
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
        <v-card
          class="mx-auto"
          style="max-width: 500px;">
          <v-system-bar
            color="deep-purple darken-4"
            dark/>
          <v-toolbar
            color="deep-purple accent-4"
            cards
            dark
            flat>
            <v-card-title class="title font-weight-regular">Add New User</v-card-title>
          </v-toolbar>
          <v-form
            ref="form"
            class="pa-3 pt-4">
            <v-text-field
              required
              @blur="$v.firstName.$touch()"
              @change="$v.firstName.$touch()"
              :error-messages="firstnameErrors"
              v-model="firstName"
              box
              color="deep-purple"
              label="First Name"/>
            <v-text-field
              v-model="otherName"
              box
              color="deep-purple"
              label="Middle Names"/>
            <v-text-field
              required
              @blur="$v.surname.$touch()"
              @change="$v.surname.$touch()"
              :error-messages="surnameErrors"
              v-model="surname"
              box
              color="deep-purple"
              label="Surname"/>
            <v-text-field
              required
              @blur="$v.userName.$touch()"
              @change="$v.surname.$touch()"
              :error-messages="usernameErrors"
              v-model="userName"
              box
              color="deep-purple"
              label="Username"/>
            <label v-for='(type, name) in $store.state.customSignupFields' :key="name">
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
            <v-text-field
              required
              @blur="$v.password.$touch()"
              @change="$v.password.$touch()"
              :error-messages="passwordErrors"
              v-model="password"
              type="password"
              box
              color="deep-purple"
              label="Password"/>
            <v-text-field
              required
              @blur="$v.retype_password.$touch()"
              @change="$v.retype_password.$touch()"
              :error-messages="retype_passwordErrors"
              v-model="retype_password"
              type="password"
              box
              color="deep-purple"
              label="Re-type Password"/>
            <v-select
              required
              :items="roles"
              v-model="role"
              single-line clearable
              @blur="$v.role.$touch()"
              @change="$v.role.$touch()"
              :error-messages="roleErrors"
              box
              label="Role"
            ></v-select>
          </v-form>
          <v-divider/>
          <v-card-actions>
            <v-btn
              flat
              @click="$refs.form.reset()">
              <v-icon>clear</v-icon>Clear
            </v-btn>
            <v-spacer/>
            <v-btn
              @click="addUser()"
              :disabled="$v.$invalid"
              class="white--text"
              color="deep-purple accent-4"
              depressed><v-icon left>how_to_reg</v-icon>Add</v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
      <v-spacer/>
    </v-layout>
  </v-container>
</template>
<script>
import axios from 'axios'
import { required } from 'vuelidate/lib/validators'
const backendServer = process.env.BACKEND_SERVER

export default {
  validations: {
    userName: { required },
    retype_password: { required },
    password: { required },
    role: { required },
    firstName: { required },
    surname: { required }
  },
  data () {
    return {
      firstName: '',
      otherName: '',
      surname: '',
      userName: '',
      password: '',
      retype_password: '',
      role: '',
      customFields: [],
      alertFail: false,
      alertSuccess: false,
      alertMsg: '',
      roles: []
    }
  },
  methods: {
    addUser () {
      if (this.password !== this.retype_password) {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        this.$store.state.errorDescription = 'Password mismatch'
        return
      }
      this.$store.state.dynamicProgress = true
      this.$store.state.progressTitle = 'Saving User'
      let formData = new FormData()
      formData.append('firstName', this.firstName)
      formData.append('otherName', this.otherName)
      formData.append('password', this.password)
      formData.append('userName', this.userName)
      formData.append('surname', this.surname)
      formData.append('role', this.role)
      for (let field in this.customFields) {
        formData.append(field, this.customFields[field])
      }
      axios.post(backendServer + '/addUser/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(() => {
        let fields = Object.keys(this.$v.$params)
        for (let field of fields) {
          this.$v[field].$reset()
        }
        this.$refs.form.reset()
        this.$store.state.dynamicProgress = false
        this.alertSuccess = true
        this.alertMsg = 'User added successfully'
      }).catch((err) => {
        this.$store.state.dynamicProgress = false
        this.alertFail = true
        this.alertMsg = 'This user was not added, ensure userName is not used'
        console.log(err.response.data.error)
      })
    },
    getRoles () {
      axios.get(backendServer + '/getRoles').then((roles) => {
        for (let role of roles.data) {
          this.roles.push({text: role.name, value: role._id})
        }
      }).catch((err) => {
        console.log(err.response.data)
      })
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
      if (!this.$v.firstName.$dirty) return errors
      !this.$v.firstName.required && errors.push('First Name is required')
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
      if (!this.$v.userName.$dirty) return errors
      !this.$v.userName.required && errors.push('Username is required')
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
    },
    roleErrors () {
      const errors = []
      if (!this.$v.role.$dirty) return errors
      !this.$v.role.required && errors.push('Role is required')
      return errors
    }
  },
  created () {
    this.getRoles()
  }
}
</script>
