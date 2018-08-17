<template>
  <v-container>
    <app-syncProgress :syncProgrIndeter='syncProgrIndeter' :syncStatus='syncStatus' :syncProgrPercent='syncProgrPercent' :syncPercent='syncPercent'>

    </app-syncProgress>
    <v-layout row wrap v-if='!syncRunning'>
      <v-spacer></v-spacer>
      <v-flex xs6>
        <v-card class="mx-auto" style="max-width: 500px;">
          <v-system-bar color="deep-purple darken-4" dark>

          </v-system-bar>
          <v-toolbar color="deep-purple accent-4" cards dark flat>
            <v-card-title class="title font-weight-regular">DHIS2 Credentials</v-card-title>
          </v-toolbar>
          <v-form ref="form" class="pa-3 pt-4">
            <v-text-field v-model="name" box required color="deep-purple" label="Source Name"></v-text-field>
            <v-text-field v-model="host" box required color="deep-purple" label="Host"></v-text-field>
            <v-text-field required v-model="username" box color="deep-purple" label="Username"></v-text-field>
            <v-text-field v-model="password" box required color="deep-purple" label="Password" style="min-height: 96px" type="password"></v-text-field>
          </v-form>
          <v-divider></v-divider>
          <v-card-actions>
            <v-btn flat @click="$refs.form.reset()">
              Clear
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn @click="sync('full')" :disabled="$v.$invalid" class="white--text" color="deep-purple accent-4" depressed>Sync</v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
      <v-spacer></v-spacer>
    </v-layout>
  </v-container>
</template>
<script>
import { required, url } from 'vuelidate/lib/validators'
import { syncMixin } from './mixins/syncMixin'
import SyncProgress from './SyncProgress'

export default {
  mixins: [syncMixin],
  validations: {
    username: { required },
    password: { required },
    host: { required, url },
    name: { required }
  },
  components: {
    'appSyncProgress': SyncProgress
  }
}
</script>
