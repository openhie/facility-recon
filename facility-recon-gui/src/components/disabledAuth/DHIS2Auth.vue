<template>

</template>

<script>
import axios from 'axios'
import { eventBus } from '@/main'
import { generalMixin } from '@/mixins/generalMixin'
const backendServer = process.env.BACKEND_SERVER
export default {
  mixins: [generalMixin],
  methods: {
    getDHIS2UserData (callback) {
      let auth = this.$store.state.dhis.dev.auth
      if (auth.username === '') {
        auth = ''
      }
      axios.get(this.$store.state.dhis.host + 'api/me', { auth }).then((userData) => {
        var orgUnitsIDs = userData.data.organisationUnits
        if (orgUnitsIDs.length > 0) {
          this.$store.state.dhis.user.orgId = orgUnitsIDs.shift().id
          axios.get(this.$store.state.dhis.host + 'api/organisationUnits/' + this.$store.state.dhis.user.orgId, { auth }).then((orgUnits) => {
            this.$store.state.dhis.user.orgName = orgUnits.data.displayName
            return callback(userData)
          })
        }
      }).catch((err) => {
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        if (err.response && err.response.data && err.response.data.httpStatusCode === 401) {
          this.$store.state.errorDescription = 'Unauthorized, ensure that your DHIS2 login is active'
          this.$router.push({ name: 'Logout' })
        } else {
          this.$store.state.errorDescription = 'Unauthorized, please reload the app'
        }
      })
    }
  },
  created () {
    this.setDHIS2Credentials()
    this.getRoles()
    this.getDHIS2UserData((dhis2User) => {
      let isAdmin = dhis2User.data.userCredentials.userRoles.find((role) => {
        return role.id === this.$store.state.config.generalConfig.externalAuth.adminRole
      })
      let roleID, roleText
      if (isAdmin) {
        let role = this.roles.find((role) => {
          return role.text === 'Admin'
        })
        roleID = role.value
        roleText = role.text
      } else {
        let role = this.roles.find((role) => {
          return role.text === 'Data Manager'
        })
        roleID = role.value
        roleText = role.text
      }
      axios.get(backendServer + '/getUser/' + dhis2User.data.userCredentials.username).then((user) => {
        if (user.data.userID) {
          this.$store.state.auth.username = dhis2User.data.userCredentials.username
          this.$store.state.auth.userID = user.data.userID
          this.$store.state.auth.role = roleText
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
          formData.append('role', roleID)
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
