<template>
  <v-container fluid>
    <template v-if='$store.state.uploadRunning'><br><br><br>
      <v-alert type="info" :value="true">
        <b>Wait for upload to finish ...</b>
        <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
      </v-alert>
    </template>
    <template v-if='archives.length == 0'><br><br><br>
      <v-alert type="info" :value="true">
        <b>No archived upload ...</b>
      </v-alert>
    </template>
    <template>
      <v-container grid-list-lg>
        <v-dialog v-model="restoreDialog" hide-overlay persistent width="300">
          <v-card color="primary" dark>
            <v-card-text>
              Restoring
              <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
            </v-card-text>
          </v-card>
        </v-dialog>
        <v-dialog persistent v-model="dialog" width="500px">
          <v-card>
            <v-card-title>
              {{alertTitle}}
            </v-card-title>
            <v-card-text>
              {{alertText}}
            </v-card-text>
            <v-card-actions>
              <v-btn color="success" @click='dialog = false'>OK</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <v-layout row wrap v-if='archives.length > 0'>
          <v-flex xs12 sm12 md12 child-flex>
            <v-card color="green lighten-4">
              <v-card-title primary-title style='color:black'>
                Archived Uploads
              </v-card-title>
              <v-card-text>
                <v-data-table :headers="header" :items="archives" hide-actions style='color:red' class="elevation-1">
                  <template slot="items" slot-scope="props">
                    <tr>
                      <v-radio-group v-model='selectedArchive' color='red' style="height: 5px">
                        <td>
                          <v-radio :value="props.item" color="red"></v-radio>
                        </td>
                      </v-radio-group>
                      <td>{{props.item}}</td>
                    </tr>
                  </template>
                </v-data-table>
              </v-card-text>
              <v-card-actions style='float: center'>
                <v-btn color="error" dark @click.native="restoreArchive">
                  <v-icon left>cached</v-icon>Restore</v-btn>
              </v-card-actions>
            </v-card>
          </v-flex>
        </v-layout>
      </v-container>
    </template>
  </v-container>
</template>
<script>
import axios from 'axios'
import { eventBus } from '../main'
const backendServer = process.env.BACKEND_SERVER
export default {
  data () {
    return {
      dialog: false,
      restoreDialog: false,
      alertTitle: '',
      alertText: '',
      archives: [],
      selectedArchive: '',
      header: [
        { sortable: false },
        { text: 'Archive Name', value: 'archiveName' }
      ]
    }
  },
  methods: {
    getArchives () {
      var orgUnit = this.$store.state.orgUnit
      axios
        .get(backendServer + '/getArchives/' + orgUnit.OrgId)
        .then(archives => {
          this.archives = archives.data
          if (this.archives.length === 0) {
            this.$store.state.showArchives = false
          } else {
            this.$store.state.showArchives = true
          }
        })
    },
    restoreArchive () {
      if (this.selectedArchive === '') {
        this.alertTitle = 'Error'
        this.alertText = 'Select an archive to restored'
        this.dialog = true
      } else {
        this.restoreDialog = true
        var orgUnit = this.$store.state.orgUnit
        let formData = new FormData()
        formData.append('archive', this.selectedArchive)
        axios
          .post(backendServer + '/restoreArchive/' + orgUnit.OrgId, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
          .then(() => {
            this.restoreDialog = false
            eventBus.$emit('refreshApp')
            this.getArchives()
            this.selectedArchive = ''
          })
          .catch(err => {
            this.restoreDialog = false
            this.$store.state.dialogError = true
            this.$store.state.errorTitle = 'Error'
            this.$store.state.errorDescription = err.response.data.error
            console.log(err.response.data.error)
          })
      }
    }
  },
  created () {
    this.getArchives()
  }
}
</script>
<style>
</style>
