<template>
  <v-container fluid>
    <v-dialog
      persistent
      v-model="editDialog"
      transition="scale-transition"
      max-width="800px"
    >
      <v-toolbar
        color="primary"
        dark
      >
        <v-toolbar-title>
          Editing {{name}}
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-icon
          @click="editDialog = false"
          style="cursor: pointer"
        >close</v-icon>
      </v-toolbar>
      <v-card>
        <v-card-text>
          <v-layout
            column
            wrap
          >
            <v-flex xs1>
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
            <v-flex>
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
            <v-flex>
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
            <v-flex>
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
            <v-flex>
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
            <v-flex>
              <v-textarea
                outline
                label="Facility Description"
                v-model="description"
              >
              </v-textarea>
            </v-flex>
            <v-flex color="white">
              Selected Parent: <b>{{facilityParent.text}}</b><br><br>
              Choose Different Parent
              <liquor-tree
                @node:selected="selectedEditJurisdiction"
                v-if="jurisdictionHierarchy.length > 0"
                :data="jurisdictionHierarchy"
                :filter="searchJurisdiction"
                ref="jurisdictionHierarchy"
              >
                <div
                  slot-scope="{ node }"
                  class="node-container"
                >
                  <div class="node-text">{{ node.text }}</div>
                </div>
              </liquor-tree>
            </v-flex>
          </v-layout>
        </v-card-text>
        <v-card-actions>
          <v-layout column>
            <v-flex>
              <v-toolbar>
                <v-layout
                  row
                  wrap
                >
                  <v-flex
                    xs6
                    text-sm-left
                  >
                    <v-btn
                      color="error"
                      @click.native="editDialog = false"
                    >
                      <v-icon left>cancel</v-icon> Cancel
                    </v-btn>
                  </v-flex>
                  <v-flex
                    xs6
                    text-sm-right
                  >
                    <v-btn
                      color="primary"
                      :disabled="$v.$invalid"
                      dark
                      @click="saveEdit()"
                    >
                      <v-icon left>save</v-icon>Save
                    </v-btn>
                  </v-flex>
                </v-layout>
              </v-toolbar>
            </v-flex>
          </v-layout>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-card>
      <v-card-title class="indigo white--text headline">
        Facilities List
      </v-card-title>

      <v-layout justify-space-between>
        <v-scroll-y-transition>
          <v-flex xs3>
            <v-text-field
              v-model="searchJurisdiction"
              append-icon="search"
              label="Search Jurisdiction"
              single-line
              hide-details
            ></v-text-field>
            <template v-if="loadingTree">
              <v-progress-linear :indeterminate="true"></v-progress-linear>
            </template>
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
              flat
            >
              <v-card-title primary-title>
                <v-layout
                  row
                  wrap
                >
                  <v-flex>
                    <b>
                      <center>Facilities Under {{activeJurisdiction.text}}</center>
                    </b>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex>
                    <v-text-field
                      v-model="searchBuildings"
                      append-icon="search"
                      label="Search Facility"
                      single-line
                      hide-details
                    ></v-text-field>
                  </v-flex>
                </v-layout>
              </v-card-title>
              <v-card-text>
                <v-data-table
                  :loading="loadingBuildings"
                  :headers="buildingsHeaders"
                  :items="buildings"
                  :search="searchBuildings"
                  class="elevation-1"
                >
                  <template
                    slot="items"
                    slot-scope="props"
                  >
                    <td>
                      <v-btn
                        icon
                        color="primary"
                        @click="edit(props.item)"
                      >
                        <v-icon>edit</v-icon>
                      </v-btn>
                    </td>
                    <td>{{props.item.name}}</td>
                    <td>{{props.item.code}}</td>
                    <td>{{props.item.parent.name}}</td>
                    <td>{{props.item.type.text}}</td>
                    <td>{{props.item.ownership.text}}</td>
                    <td>{{props.item.status.text}}</td>
                    <td>{{props.item.lat}}</td>
                    <td>{{props.item.long}}</td>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
            <template v-else-if="!loadingBuildings">
              <b>Select a location on the left to add a facility</b>
            </template>
          </v-scroll-y-transition>
        </v-flex>
      </v-layout>
    </v-card>
  </v-container>
</template>
<script>
import axios from 'axios'
import LiquorTree from 'liquor-tree'
import { required } from 'vuelidate/lib/validators'
import { generalMixin } from '../../mixins/generalMixin'
const backendServer = process.env.BACKEND_SERVER
export default {
  mixins: [generalMixin],
  validations: {
    name: { required }
  },
  data () {
    return {
      facilityId: '',
      editDialog: false,
      loadingTree: false,
      loadingBuildings: false,
      buildingsHeaders: [
        { sortable: false },
        { text: 'Name', value: 'name' },
        { text: 'Code', value: 'code' },
        { text: 'Parent', value: 'parent' },
        { text: 'Facility Type', value: 'type' },
        { text: 'Facility Ownership', value: 'ownership' },
        { text: 'Status', value: 'status' },
        { text: 'Latitude', value: 'latitude' },
        { text: 'Longitude', value: 'longitude' }
      ],
      searchJurisdiction: '',
      searchBuildings: '',
      activeJurisdiction: {},
      jurisdictionHierarchy: [],
      buildings: [],
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
      facilityParent: {},
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
    getBuildings () {
      this.facilities = []
      this.buildings = []
      this.loadingBuildings = true
      axios.get(backendServer + '/FR/getBuildings', {
        params: {
          jurisdiction: this.activeJurisdiction.id
        }
      }).then((response) => {
        this.loadingBuildings = false
        this.buildings = response.data
      }).catch((err) => {
        this.loadingBuildings = false
        console.log(err)
      })
    },
    selectedJurisdiction (node) {
      this.activeJurisdiction = node
      this.getBuildings()
    },
    selectedEditJurisdiction (node) {
      this.facilityParent = node
    },
    edit (item) {
      this.facilityId = item.id
      this.facilityType = item.type.code
      this.facilityStatus = item.status.code
      this.facilityParent.id = item.parent.id
      this.facilityParent.text = item.parent.name
      this.facilityOwnership = item.ownership.code
      this.name = item.name
      this.alt_name = item.alt_name
      this.code = item.code
      this.lat = item.lat
      this.long = item.long
      this.contact.phone = item.phone
      this.contact.email = item.email
      this.contact.website = item.website
      this.contact.fax = item.fax
      this.description = item.description
      this.editDialog = true
    },
    saveEdit () {
      let formData = new FormData()
      formData.append('id', this.facilityId)
      formData.append('name', this.name)
      formData.append('alt_name', this.alt_name)
      formData.append('code', this.code)
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
      formData.append('parent', this.facilityParent.id)
      this.$store.state.progressTitle = 'Saving Changes'
      this.editDialog = false
      this.$store.state.dynamicProgress = true
      axios.post(backendServer + '/FR/addBuilding', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        this.$store.state.dynamicProgress = false
        this.$store.state.errorTitle = 'Changes Saved'
        this.$store.state.errorDescription = 'Changes saved successfully'
        this.$store.state.dialogError = true
        this.getBuildings()
      }).catch((err) => {
        this.$store.state.errorTitle = 'Failed To Save Changes'
        this.$store.state.errorDescription = 'Failed To Save Changes'
        this.$store.state.dialogError = true
        console.log(err)
      })
    }
  },
  created () {
    this.loadingTree = true
    this.getTree(false, (err, tree) => {
      if (!err) {
        this.loadingTree = false
        this.jurisdictionHierarchy = tree
      } else {
        this.loadingTree = false
      }
    })
  },
  computed: {
    nameErrors () {
      const errors = []
      if (!this.$v.name.$dirty) return errors
      !this.$v.name.required && errors.push('Name is required')
      return errors
    }
  },
  components: {
    'liquor-tree': LiquorTree
  }
}
</script>