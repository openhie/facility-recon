<template>
  <v-container>
    <template>
      <v-card>
        <v-card-title class="indigo white--text headline">
          <template v-if="action === 'request'">
            Fill Details Below About A New Facility And Submit For Approval
          </template>
          <template v-if="action === 'add'">
            Fill Details Below To Add A New Facility
          </template>
        </v-card-title>

        <v-layout
          justify-space-between
          pa-4
        >
          <v-scroll-y-transition>
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
          </v-scroll-y-transition>

          <v-divider vertical></v-divider>

          <v-flex
            d-flex
            text-center
          >
            <v-scroll-y-transition mode="out-in">
              <v-card
                v-if='activeJurisdiction.id'
                class="pt-4 mx-auto"
                flat
              >
                <v-card-title primary-title>
                  <b>
                    <template v-if="action === 'request'">
                      Requesting New Facility Under {{activeJurisdiction.text}}
                    </template>
                    <template v-else-if="action === 'add'">
                      Adding New Facility Under {{activeJurisdiction.text}}
                    </template>
                  </b>
                </v-card-title>
                <v-card-text>
                  <v-card>
                    <v-form
                      ref="form"
                      class="pa-3 pt-4"
                    >
                      <v-layout
                        column
                        wrap
                      >
                        <v-flex xs12>
                          <v-layout
                            row
                            wrap
                          >
                            <v-flex xs5>
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
                            </v-flex>
                            <v-spacer></v-spacer>
                            <v-flex xs5>
                              <v-text-field
                                v-model="alt_name"
                                box
                                color="deep-purple"
                                label="Alternative Name"
                              />
                            </v-flex>
                          </v-layout>
                        </v-flex>
                        <v-flex xs12>
                          <v-layout
                            row
                            wrap
                          >
                            <v-flex xs5>
                              <v-text-field
                                required
                                v-model="code"
                                box
                                color="deep-purple"
                                label="Code"
                              />
                            </v-flex>
                            <v-spacer></v-spacer>
                            <v-flex xs5>
                              <v-select
                                clearable
                                :items="types"
                                v-model="facilityType"
                                label="Facility Type"
                              ></v-select>
                            </v-flex>
                          </v-layout>
                        </v-flex>
                        <v-flex xs12>
                          <v-layout
                            row
                            wrap
                          >
                            <v-flex xs5>
                              <v-select
                                clearable
                                :items="status"
                                v-model="facilityStatus"
                                label="Status"
                              ></v-select>
                            </v-flex>
                            <v-spacer></v-spacer>
                            <v-flex xs5>
                              <v-select
                                clearable
                                :items="ownerships"
                                v-model="facilityOwnership"
                                label="Facility Ownership"
                              ></v-select>
                            </v-flex>
                          </v-layout>
                        </v-flex>
                        <v-flex xs12>
                          <v-layout
                            row
                            wrap
                          >
                            <v-flex xs5>
                              <v-text-field
                                v-model="lat"
                                box
                                color="deep-purple"
                                label="Latitude"
                              />
                            </v-flex>
                            <v-spacer></v-spacer>
                            <v-flex xs5>
                              <v-text-field
                                required
                                v-model="long"
                                box
                                color="deep-purple"
                                label="Longitude"
                              />
                            </v-flex>
                          </v-layout>
                        </v-flex>
                        <v-flex xs12>
                          <v-card>
                            <v-card-title primary-title>
                              Contacts Informations
                            </v-card-title>
                            <v-card-text>
                              <v-layout
                                column
                                wrap
                              >
                                <v-flex>
                                  <v-layout
                                    row
                                    wrap
                                  >
                                    <v-flex xs5>
                                      <v-text-field
                                        v-model="contact.email"
                                        box
                                        color="deep-purple"
                                        label="Email"
                                      />
                                    </v-flex>
                                    <v-spacer></v-spacer>
                                    <v-flex xs5>
                                      <v-text-field
                                        v-model="contact.phone"
                                        box
                                        color="deep-purple"
                                        label="Phone"
                                      />
                                    </v-flex>
                                  </v-layout>
                                </v-flex>
                                <v-flex>
                                  <v-layout
                                    row
                                    wrap
                                  >
                                    <v-flex xs5>
                                      <v-text-field
                                        v-model="contact.fax"
                                        box
                                        color="deep-purple"
                                        label="Fax"
                                      />
                                    </v-flex>
                                    <v-spacer></v-spacer>
                                    <v-flex xs5>
                                      <v-text-field
                                        v-model="contact.website"
                                        box
                                        color="deep-purple"
                                        label="Website"
                                      />
                                    </v-flex>
                                  </v-layout>
                                </v-flex>
                              </v-layout>
                            </v-card-text>
                          </v-card>
                        </v-flex>
                        <v-flex xs12>
                          <v-textarea
                            outline
                            label="Facility Description"
                            v-model="description"
                          >
                          </v-textarea>

                        </v-flex>
                      </v-layout>
                    </v-form>
                    <v-card-actions>
                      <v-btn
                        flat
                        @click="$store.state.baseRouterViewKey++"
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
                        <v-icon left>language</v-icon>
                        <template v-if="action === 'request'">
                          Send Request
                        </template>
                        <template v-else-if="action === 'add'">
                          Add
                        </template>
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-card-text>
              </v-card>
              <template v-else>
                <template v-if="action === 'request'">
                  <b>Select a location on the left to request a new facility</b>
                </template>
                <template v-else-if="action === 'add'">
                  <b>Select a location on the left to add a facility</b>
                </template>
              </template>
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
  props: ['action', 'requestType'],
  data () {
    return {
      loadingTree: false,
      searchJurisdiction: '',
      activeJurisdiction: {},
      jurisdictionHierarchy: [],
      name: '',
      alt_name: '',
      code: '',
      description: '',
      facilityType: '',
      types: [{
        text: 'Clinic',
        value: 'CLNC'
      }, {
        text: 'Dispensary',
        value: 'DSPN'
      }, {
        text: 'Health Center',
        value: 'HCNT'
      }, {
        text: 'Health Post',
        value: 'HPST'
      }, {
        text: 'Hospital',
        value: 'HOSP'
      }],
      ownerships: [{
        text: 'Concesion',
        value: 'CNCS'
      }, {
        text: 'Public',
        value: 'PBLC'
      }, {
        text: 'Private',
        value: 'PRVT'
      }, {
        text: 'Private Faith Based',
        value: 'PFBO'
      }, {
        text: 'Private Not Profit',
        value: 'PNPR'
      }],
      facilityOwnership: '',
      status: [{
        text: 'Functional',
        value: 'active'
      }, {
        text: 'Not Functional',
        value: 'inactive'
      }, {
        text: 'Suspended',
        value: 'suspended'
      }],
      facilityStatus: '',
      lat: '',
      long: '',
      contact: {
        email: '',
        phone: '',
        fax: '',
        website: ''
      }
    }
  },
  methods: {
    getTree () {
      this.loadingTree = true
      this.jurisdictionHierarchy = []
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
      formData.append('alt_name', this.alt_name)
      formData.append('code', this.code)
      formData.append('action', this.action)
      formData.append('requestType', this.requestType)
      formData.append('username', this.$store.state.auth.username)
      if (this.facilityType) {
        formData.append('type', this.facilityType)
      }
      if (this.facilityStatus) {
        formData.append('status', this.facilityStatus)
      }
      if (this.facilityOwnership) {
        formData.append('ownership', this.facilityOwnership)
      }
      if (this.lat) {
        formData.append('lat', this.lat)
      }
      if (this.long) {
        formData.append('long', this.long)
      }
      formData.append('contact', JSON.stringify(this.contact))
      if (this.description) {
        formData.append('description', this.description)
      }
      formData.append('parent', this.activeJurisdiction.id)
      axios.post(backendServer + '/FR/addBuilding', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        this.$store.state.alert.show = true
        this.$store.state.alert.width = '600px'
        this.$store.state.alert.msg = 'Facility added successfully!'
        this.$store.state.alert.type = 'success'
        // increment component key to force component reload
        this.$store.state.baseRouterViewKey += 1
      }).catch((err) => {
        this.$store.state.alert.show = true
        this.$store.state.alert.width = '600px'
        this.$store.state.alert.msg = 'Failed to add Facility!'
        this.$store.state.alert.type = 'error'
        // increment component key to force component reload
        this.$store.state.baseRouterViewKey += 1
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