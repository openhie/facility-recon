<template>
  <v-container>
    <v-card color="cyan lighten-5">
      <v-card-title primary-title>
        <v-toolbar color="white" style="font-weight: bold; font-size: 18px;">
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
          dark class="elevation-1" 
          :loading='$store.state.loadingusers'
        >
          <v-progress-linear slot="progress" color="blue" indeterminate></v-progress-linear>
          <template slot="items" slot-scope="props">
            <td>{{props.item.firstName}}</td>
            <td>{{props.item.surname}}</td>
            <td>{{props.item.otherName}}</td>
            <td>{{props.item.userName}}</td>
            <td>{{props.item.role.name}}</td>
            <td>{{props.item.status}}</td>
            <td>
              <v-btn small color="error" v-if='props.item.status === "Active"' @click="accountAction('Inactive', props.item)">Deactivate</v-btn> 
              <v-btn small color="success" v-else @click="accountAction('Active', props.item)">Activate</v-btn>
               <v-btn small color="error" @click="accountAction('reset', props.item)"> <v-icon left>refresh</v-icon> Reset Password</v-btn>
            </td>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>
<script>
import axios from 'axios'
const backendServer = process.env.BACKEND_SERVER

export default {
  data () {
    return {
      usersHeader: [
        { text: 'Firstname', value: 'firstname' },
        { text: 'Surname', value: 'surname' },
        { text: 'Othername', value: 'othername' },
        { text: 'User Name', value: 'username' },
        { text: 'Role', value: 'role' },
        { text: 'Status', value: 'status' }
      ],
      users: [],
      loadingUsers: false,
      searchUsers: ''
    }
  },
  methods: {
    getUsers () {
      let formData = new FormData()
      formData.append('username', this.username)
      formData.append('password', this.password)
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
      console.log(action)
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
          this.getUsers()
        })
      } else if (action === 'reset') {
        formData.append('surname', user.surname)
        axios.post(backendServer + '/resetPassword', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }).then((resp) => {
          this.getUsers()
        })
      }
    }
  },
  created () {
    this.getUsers()
  }
}
</script>

