<template>
  <v-container>
    Select role to edit tasks
    <v-select
      required
      :items="roles"
      @change="roleSelected"
      single-line
      box
      label="Select Role"
    ></v-select>
    <v-card v-if="role.value">
      <v-card-title primary-title>
        Tasks assigned to role {{role.text}}
      </v-card-title>
      <v-card-text>
        <v-data-table
          :items="tasks"
          height="10px"
          hide-actions
        >
          <template v-slot:items="props">
            <tr>
              <td>
                <v-checkbox
                  :value="props.item._id"
                  v-model="role.tasks"
                >
                </v-checkbox>
              </td>
              <td>{{props.item.display}}</td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="saveRole"
        >
          <v-icon left>save</v-icon> Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>
<script>
import axios from 'axios'
import { generalMixin } from '../mixins/generalMixin'

const backendServer = process.env.BACKEND_SERVER

export default {
  mixins: [generalMixin],
  data () {
    return {
      role: {},
      task: ''
    }
  },
  methods: {
    roleSelected (id) {
      this.role = this.roles.find((role) => {
        return role.value === id
      })
    },
    saveRole () {
      this.$store.state.progressTitle = 'Updating role'
      this.$store.state.dynamicProgress = true
      let formData = new FormData()
      formData.append('role', JSON.stringify(this.role))
      axios.post(backendServer + '/updateRole', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(() => {
        this.$store.state.dynamicProgress = false
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Info'
        this.$store.state.errorColor = 'primary'
        this.$store.state.errorDescription = `Role ${this.role.text} updated successfully`
        this.getRoles()
      }).catch((error) => {
        this.$store.state.dynamicProgress = false
        this.$store.state.dialogError = true
        this.$store.state.errorTitle = 'Error'
        this.$store.state.errorColor = 'error'
        this.$store.state.errorDescription = `An error has occured while updating role ${this.role.text}`
        console.log(error)
      })
    }
  },
  created () {
    this.getRoles()
    this.getTasks()
  }
}
</script>

