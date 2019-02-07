<template>
  <v-container>
    <v-card>
      <v-card-text>
        <v-layout column>
          <v-flex background-color="primary">
            <v-switch @change="configChanged" color="success" label="Use CSV header for display" v-model="$store.state.config.reconciliation.useCSVHeader"></v-switch>
            <v-switch @change="configChanged" color="success" label="Perform match based on parent" v-model="$store.state.config.reconciliation.parentConstraint"></v-switch>
          </v-flex>
        </v-layout>
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
      useCSVHeader: false
    }
  },
  methods: {
    configChanged () {
      let userID = this.$store.state.auth.userID
      let formData = new FormData()
      formData.append('config', JSON.stringify(this.$store.state.config))
      formData.append('userID', userID)
      axios.post(backendServer + '/updateConfig', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    }
  }
}
</script>
