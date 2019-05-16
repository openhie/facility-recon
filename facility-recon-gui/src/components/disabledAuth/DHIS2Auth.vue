<template>

</template>

<script>
import axios from 'axios'
import { eventBus } from '../../main'
import { generalMixin } from '../../mixins/generalMixin'
const backendServer = process.env.BACKEND_SERVER
export default {
  mixins: [generalMixin],
  methods: {
    getDHIS2UserData (callback) {
      let auth = this.$store.state.dhis.dev.auth
      axios.get(this.$store.state.dhis.host + 'api/me', {auth}).then((userData) => {
        var orgUnitsIDs = userData.data.organisationUnits
        if (orgUnitsIDs.length > 0) {
          this.$store.state.dhis.user.orgId = orgUnitsIDs.shift().id
          axios.get(this.$store.state.dhis.host + 'api/organisationUnits/' + this.$store.state.dhis.user.orgId, {auth}).then((orgUnits) => {
            this.$store.state.dhis.user.orgName = orgUnits.data.displayName
            return callback(userData)
          })
        }
      })
    }
  },
  created () {
    if (process.env.NODE_ENV === 'development') {
      this.$store.state.dhis.host = 'https://play.dhis2.org/2.31.2/'
    } else if (process.env.NODE_ENV === 'production') {
      this.$store.state.dhis.host = location.href.split('api').shift()
    }
    axios.defaults.params = {
      authDisabled: true
    }
    this.getRoles()
    this.getDHIS2UserData((dhis2User) => {
      let isAdmin = dhis2User.data.userCredentials.userRoles.find((role) => {
        return role.id === this.$store.state.config.generalConfig.externalAuth.adminRole
      })
      let role
      if (isAdmin) {
        role = this.roles.find((role) => {
          return role.text === 'Admin'
        })
        role = role.value
      } else {
        role = this.roles.find((role) => {
          return role.text === 'Data Manager'
        })
        role = role.value
      }
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
          formData.append('role', role)
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
