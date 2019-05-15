<template>

</template>

<script>
import axios from 'axios'
import { eventBus } from '../../main'
const backendServer = process.env.BACKEND_SERVER
export default {
  methods: {
    getDHIS2User (callback) {
      // var href = location.href.split('api').shift()
      let href = 'https://play.dhis2.org/2.31.2/'
      axios.defaults.auth = {
        username: 'admin',
        password: 'district'
      }
      axios.get(href + 'api/me').then((userData) => {
        callback(userData)
      })
    }
  },
  created () {
    axios.defaults.params = {
      authDisabled: true
    }
    this.getDHIS2User((dhis2User) => {
      axios.get(backendServer + '/getUser/' + dhis2User.data.userCredentials.username).then((user) => {
        if (user.data.userID) {
          this.$store.state.auth.username = dhis2User.data.userCredentials.username
          this.$store.state.auth.userID = user.data.userID
          this.$store.state.auth.role = user.data.role
          this.$store.state.initializingApp = true
          this.$store.state.denyAccess = false
          eventBus.$emit('getConfig')
        } else {
          let formData = new FormData()
          formData.append('firstName', dhis2User.data.firstName)
          formData.append('otherName', '')
          formData.append('password', dhis2User.data.surname)
          formData.append('userName', dhis2User.data.userCredentials.username)
          formData.append('surname', dhis2User.data.surname)
          formData.append('role', '5bf2e180ddae1d4cca4fff9a')
          axios.post(backendServer + '/addUser', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }).then((data) => {
            axios.get(backendServer + '/getUser/' + dhis2User.data.userCredentials.username).then((user) => {
              if (user.data.userID) {
                this.$store.state.auth.username = dhis2User.data.userCredentials.username
                this.$store.state.auth.userID = user.data.userID
                this.$store.state.auth.role = user.data.role
                this.$store.state.initializingApp = true
                this.$store.state.denyAccess = false
                eventBus.$emit('getConfig')
              }
            })
          })
        }
      })
    })
  }
}
</script>
