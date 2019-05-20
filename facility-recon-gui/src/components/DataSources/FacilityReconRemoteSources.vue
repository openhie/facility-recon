<template>
  <v-container>
    <v-layout row wrap>
      <v-spacer></v-spacer>
      <v-flex xs6>
        <v-card class="mx-auto" style="max-width: 500px;">
          <v-system-bar color="deep-purple darken-4" dark>

          </v-system-bar>
          <v-toolbar color="deep-purple accent-4" cards dark flat>
            <v-card-title class="title font-weight-regular">Add New Remote Source</v-card-title>
            <v-spacer></v-spacer>
            <v-btn icon dark @click.native="close()">
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-form ref="form" class="pa-3 pt-4">
            <v-select
              :items="$store.state.remoteDataSources"
              v-model="sourceType"
              required
              label="Source Type"
            ></v-select>
            <v-text-field v-model="name" box required color="deep-purple" label="Source Name"></v-text-field>
            <v-text-field v-model="host" box required color="deep-purple" label="Base URL"></v-text-field>
            <v-text-field v-model="username" box color="deep-purple" label="Username"></v-text-field>
            <v-text-field v-model="password" box color="deep-purple" label="Password" style="min-height: 96px" type="password"></v-text-field>
            <template v-if="$store.state.dhis.user.orgId">
              <v-tooltip top>
                <v-checkbox
                  :disabled="shareWithAll"
                  slot="activator"
                  color="primary"
                  label="Share with other users of the same org unit as yours"
                  v-model="shareToSameOrgid"
                ></v-checkbox>
                <span>
                  Share this dataset with all other users that are on the same org unit as you
                </span>
              </v-tooltip>
              <v-checkbox
                @change="sharingOptions"
                color="primary"
                label="Share with all other users"
                v-model="shareWithAll">
              </v-checkbox>
              <v-tooltip top>
                <v-checkbox
                  slot="activator"
                  color="primary"
                  v-if="shareWithAll"
                  label="Limit orgs sharing by user orgid"
                  v-model="limitShareByOrgId">
                </v-checkbox>
                <span>
                  if activated, other users will see locations (including location children) that has the same location id as their location id
                </span>
              </v-tooltip>
            </template>
          </v-form>
          <v-divider></v-divider>
          <v-card-actions>
            <v-btn flat @click="$refs.form.reset()">
              Clear
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              @click="addDataSource('syncServer')"
              :disabled="$v.$invalid"
              class="white--text"
              color="deep-purple accent-4"
              depressed>
              Add
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
      <v-spacer></v-spacer>
    </v-layout>
  </v-container>
</template>
<script>
import { required } from 'vuelidate/lib/validators'
import { dataSourcesMixin } from './dataSourcesMixin'
import {eventBus} from '../../main'
export default {
  mixins: [dataSourcesMixin],
  validations: {
    host: { required },
    name: { required },
    sourceType: { required }
  },
  methods: {
    close () {
      eventBus.$emit('dataSourceSaved')
    }
  }
}
</script>
