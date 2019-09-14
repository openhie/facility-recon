<template>
  <v-container>
    <template>
      <v-card>
        <v-card-title class="indigo white--text headline">
          Jurisdiction Hierarchy
        </v-card-title>

        <v-layout
          justify-space-between
          pa-4
        >
          <v-flex xs5>
            <template v-if="loadingTree">
              <v-progress-linear :indeterminate="true"></v-progress-linear>
            </template>
            <v-text-field
              v-if="jurisdictionHierarchy.length > 0"
              v-model="searchJurisdiction"
              append-icon="search"
              label="Search Jurisdiction"
              single-line
              hide-details
            ></v-text-field>
            <liquor-tree
              @node:selected="selectedJurisdiction"
              v-if="jurisdictionHierarchy.length > 0"
              :data="jurisdictionHierarchy"
              :filter="searchJurisdiction"
              ref="jurisdictionHierarchy"
            />
          </v-flex>

          <v-divider vertical></v-divider>

          <v-flex
            d-flex
            text-center
          >
            <v-scroll-y-transition mode="out-in">
              <v-card
                class="pt-4 mx-auto"
                flat
                max-width="500"
              >
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
                <v-card-title primary-title>
                  <template v-if='activeJurisdiction.id'>
                    <b>Adding New Jurisdiction Under {{activeJurisdiction.text}}</b>
                  </template>
                  <template v-else>
                    <b>Adding New Jurisdiction On Top Level</b>
                  </template>
                </v-card-title>
                <v-card-text>
                  <v-card>
                    <v-form
                      ref="form"
                      class="pa-3 pt-4"
                    >
                      <v-text-field
                        required
                        @blur="$v.name.$touch()"
                        @change="$v.name.$touch()"
                        :error-messages="nameErrors"
                        v-model="name"
                        box
                        color="deep-purple"
                        label="Name"
                      />
                      <v-text-field
                        required
                        v-model="code"
                        box
                        color="deep-purple"
                        label="Code"
                      />
                    </v-form>
                    <v-card-actions>
                      <v-btn
                        flat
                        @click="$refs.form.reset()"
                      >
                        <v-icon>clear</v-icon>Clear
                      </v-btn>
                      <v-spacer />
                      <v-btn
                        @click="addLocation()"
                        :disabled="$v.$invalid"
                        class="white--text"
                        color="deep-purple accent-4"
                        depressed
                      >
                        <v-icon left>language</v-icon>Add
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-card-text>
              </v-card>
            </v-scroll-y-transition>
          </v-flex>
        </v-layout>
      </v-card>
    </template>
  </v-container>
</template>
<script>
import axios from 'axios'
import LiquorTree from 'liquor-tree'
import { required } from 'vuelidate/lib/validators'
const backendServer = process.env.BACKEND_SERVER
export default {
  validations: {
    name: { required }
  },
  data () {
    return {
      loadingTree: false,
      alertFail: false,
      alertSuccess: false,
      alertMsg: '',
      searchJurisdiction: '',
      activeJurisdiction: {},
      jurisdictionHierarchy: [],
      name: '',
      code: ''
    }
  },
  methods: {
    getTree () {
      this.jurisdictionHierarchy = []
      this.loadingTree = true
      axios.get(backendServer + '/FR/getTree').then((hierarchy) => {
        this.loadingTree = false
        if (hierarchy.data) {
          this.jurisdictionHierarchy = hierarchy.data
        }
      })
    },
    selectedJurisdiction (node) {
      this.activeJurisdiction = node
    },
    addLocation () {
      let formData = new FormData()
      formData.append('name', this.name)
      formData.append('code', this.code)
      if (this.activeJurisdiction.id) {
        formData.append('parent', this.activeJurisdiction.id)
      }
      axios.post(backendServer + '/FR/addJurisdiction', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        this.alertSuccess = true
        this.alertMsg = 'Jurisdiction added successfully!'
        this.$refs.form.reset()
        this.getTree()
      }).catch((err) => {
        this.alertFail = true
        this.alertMsg = 'Failed to add Jurisdiction!'
        console.log(err)
      })
    }
  },
  computed: {
    nameErrors () {
      const errors = []
      if (!this.$v.name.$dirty) return errors
      !this.$v.name.required && errors.push('Name is required')
      return errors
    },
    codeErrors () {
      const errors = []
      if (!this.$v.code.$dirty) return errors
      !this.$v.code.required && errors.push('Code is required')
      return errors
    }
  },
  created () {
    this.getTree()
  },
  components: {
    'liquor-tree': LiquorTree
  }
}
</script>