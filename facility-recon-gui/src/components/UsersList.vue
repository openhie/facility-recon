<template>
  <v-container fluid>
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
    <v-dialog
      v-model="approveUserDialog"
      persistent
      :overlay="false"
      max-width="500px"
      transition="dialog-transition"
    >
      <v-toolbar
        color="primary"
        dark
      >
        <v-spacer></v-spacer>
        <v-icon
          @click="approveUserDialog = false"
          style="cursor: pointer"
        >close</v-icon>
      </v-toolbar>
      <v-card>
        <v-card-title primary-title>
          User {{user.userName}}
        </v-card-title>
        <v-card-text>
          <v-layout
            column
            wrap
          >
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex x5>
                  {{user.firstName}}
                </v-flex>
                <v-spacer></v-spacer>
                <v-flex xs5>
                  {{user.surname}}
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex x5>
                  {{user.phone}}
                </v-flex>
                <v-spacer></v-spacer>
                <v-flex xs5>
                  {{user.email}}
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-select
                required
                :items="roles"
                v-model="role"
                single-line
                clearable
                @blur="$v.role.$touch()"
                @change="$v.role.$touch()"
                :error-messages="roleErrors"
                box
                label="Role"
              ></v-select>
            </v-flex>
          </v-layout>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="error"
            @click="changeStatus('Rejected')"
          >
            <v-icon>clear</v-icon>Reject
          </v-btn>
          <v-spacer />
          <v-btn
            @click="changeStatus('Active')"
            :disabled="$v.$invalid"
            class="white--text"
            color="deep-purple accent-4"
            depressed
          >
            <v-icon left>language</v-icon>Approve
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-card
      color="cyan lighten-5"
      width="1500px"
      class="mx-auto"
    >
      <v-card-title
        primary-title
        width="1000"
      >
        <v-toolbar
          color="white"
          style="font-weight: bold; font-size: 18px;"
        >
          Users List
          <v-spacer></v-spacer>
          <v-text-field
            v-model="searchUsers"
            append-icon="search"
            label="Search"
            single-line
            hide-details
          ></v-text-field>
        </v-toolbar>
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="usersHeader"
          :items="users"
          :search="searchUsers"
          dark
          class="elevation-1"
          :loading='$store.state.loadingusers'
        >
          <v-progress-linear
            slot="progress"
            color="blue"
            indeterminate
          ></v-progress-linear>
          <template
            slot="items"
            slot-scope="props"
          >
            <td>{{props.item.firstName}}</td>
            <td>{{props.item.surname}}</td>
            <td>{{props.item.otherName}}</td>
            <td>{{props.item.phone}}</td>
            <td>{{props.item.email}}</td>
            <td>{{props.item.userName}}</td>
            <td v-if='props.item.role'>{{props.item.role.name}}</td>
            <td v-else></td>
            <td>{{props.item.status}}</td>
            <td v-if='props.item.status === "Pending" || props.item.status === "Rejected"'>
              <v-btn
                color="success"
                small
                @click="displayApprovalDialog(props.item)"
              >Approve/Reject</v-btn>
            </td>
            <td v-else>
              <v-btn
                small
                color="error"
                v-if='props.item.status === "Active"'
                @click="accountAction('Inactive', props.item)"
              >Deactivate</v-btn>
              <v-btn
                small
                color="success"
                v-else
                @click="accountAction('Active', props.item)"
              >Activate</v-btn>
              <v-btn
                small
                color="error"
                @click="accountAction('reset', props.item)"
              >
                <v-icon left>refresh</v-icon> Reset Password
              </v-btn>
            </td>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>
<script>
import axios from 'axios'
import { required } from 'vuelidate/lib/validators'
import { generalMixin } from '../mixins/generalMixin'

const backendServer = process.env.BACKEND_SERVER

export default {
  mixins: [generalMixin],
  validations: {
    role: { required }
  },
  data () {
    return {
      usersHeader: [
        { text: 'Firstname', value: 'firstName' },
        { text: 'Surname', value: 'surname' },
        { text: 'Othername', value: 'otherName' },
        { text: 'Phone', value: 'phone' },
        { text: 'Email', value: 'email' },
        { text: 'User Name', value: 'username' },
        { text: 'Role', value: 'role' },
        { text: 'Status', value: 'status' }
      ],
      users: [],
      user: {},
      role: '',
      approveUserDialog: false,
      loadingUsers: false,
      searchUsers: '',
      alertSuccess: false,
      alertFail: false,
      alertMsg: ''
    }
  },
  methods: {
    displayApprovalDialog (item) {
      this.user = item
      this.approveUserDialog = true
    },
    changeStatus (status) {
      let formData = new FormData()
      formData.append('role', this.role)
      formData.append('status', status)
      formData.append('id', this.user._id)
      axios.post(backendServer + '/processUserAccoutRequest/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(() => {
        this.approveUserDialog = false
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorDescription = 'This request was processed successfully'
        this.$store.state.dialogError = true
        this.getUsers()
      }).catch((err) => {
        this.approveUserDialog = false
        this.$store.state.errorTitle = 'Error'
        this.$store.state.errorDescription = 'An error occured while processing this request, please retry'
        this.$store.state.dialogError = true
        console.log(err.response.data.error)
      })
    },
    getUsers () {
      let formData = new FormData()
      formData.append('username', this.username)
      formData.append('password', this.password)
      this.users = []
      this.loadingUsers = true
      axios.get(backendServer + '/getUsers/').then((users) => {
        this.loadingUsers = false
        this.users = users.data
      }).catch((err) => {
        this.loadingUsers = false
        if (err.hasOwnProperty('response')) {
          console.log(err.response.data.error)
        }
      })
    },
    accountAction (action, user) {
      let id = user._id
      let formData = new FormData()
      formData.append('id', id)
      if (action === 'Active' || action === 'Inactive') {
        formData.append('status', action)
        axios.post(backendServer + '/changeAccountStatus', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }).then((resp) => {
          this.alertSuccess = true
          if (action === 'Active') {
            this.alertMsg = 'Account activated successfully'
          } else if (action === 'Inactive') {
            this.alertMsg = 'Account deactivated successfully'
          }
          this.getUsers()
        }).catch((err) => {
          console.log(JSON.stringify(err))
          this.alertFail = true
          this.alertMsg = 'Action failed'
        })
      } else if (action === 'reset') {
        formData.append('surname', user.surname)
        axios.post(backendServer + '/resetPassword', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }).then((resp) => {
          this.alertSuccess = true
          this.alertMsg = 'Password reseted successfully'
          this.getUsers()
        }).catch((err) => {
          console.log(JSON.stringify(err))
          this.alertFail = true
          this.alertMsg = 'Action failed'
        })
      }
    }
  },
  computed: {
    roleErrors () {
      const errors = []
      if (!this.$v.role.$dirty) return errors
      !this.$v.role.required && errors.push('Role is required')
      return errors
    }
  },
  created () {
    this.getUsers()
    this.getRoles()
  }
}
</script>

