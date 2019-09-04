<template>
  <v-container>
    <v-card
      class="pt-4 mx-auto"
      flat
      max-width="800"
    >
      <v-alert
        style="width: 800px"
        v-model="alertSuccess"
        type="success"
        dismissible
        transition="scale-transition"
      >
        {{alertMsg}}
      </v-alert>
      <v-alert
        style="width: 800px"
        v-model="alertFail"
        type="error"
        dismissible
        transition="scale-transition"
      >
        {{alertMsg}}
      </v-alert>
      <v-card-title primary-title>
        <b>Adding New Service</b>
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
              <v-flex>
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
                      label="Name *"
                    />
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-text-field
                      required
                      v-model="code"
                      box
                      color="deep-purple"
                      label="Code"
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
                    <v-select
                      multiple
                      multi-line
                      item-text="display"
                      item-value="code"
                      :items="serviceCategoryConcept"
                      v-model="serviceCategories"
                      label="Service Category"
                    >
                      <template v-slot:selection="{ item, index }">
                        <v-chip v-if="index < 2">
                          <span>{{ item.display }}</span>
                        </v-chip>
                        <span
                          v-if="index === 2"
                          class="grey--text caption"
                        >(+{{ serviceCategories.length - 2 }} others)</span>
                      </template>
                    </v-select>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-select
                      multiple
                      multi-line
                      item-text="display"
                      item-value="code"
                      :items="serviceTypeConcept"
                      v-model="serviceTypes"
                      label="Service Type"
                    >
                      <template v-slot:selection="{ item, index }">
                        <v-chip v-if="index < 2">
                          <span>{{ item.display }}</span>
                        </v-chip>
                        <span
                          v-if="index === 2"
                          class="grey--text caption"
                        >(+{{ serviceTypes.length - 2 }} others)</span>
                      </template>
                    </v-select>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                  </v-flex>
                </v-layout>
              </v-flex>
            </v-layout>
            <v-select
              multiple
              multi-line
              item-text="display"
              item-value="code"
              :items="specialtyConcept"
              v-model="specialties"
              label="Specialties"
            >
              <template v-slot:selection="{ item, index }">
                <v-chip v-if="index < 2">
                  <span>{{ item.display }}</span>
                </v-chip>
                <span
                  v-if="index === 2"
                  class="grey--text caption"
                >(+{{ specialties.length - 2 }} others)</span>
              </template>
            </v-select>
            <v-textarea
              outline
              label="Comment about this service"
              v-model="comment"
            >
            </v-textarea>
            <v-switch
              label="Active"
              v-model="active"
            ></v-switch>
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
              <v-icon left>add</v-icon>Add
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-card-text>
    </v-card>
  </v-container>
</template>
<script>
import axios from 'axios'
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
      alertFail: false,
      alertSuccess: false,
      alertMsg: '',
      name: '',
      code: '',
      comment: '',
      serviceTypes: [],
      serviceCategories: [],
      specialties: [],
      serviceTypeConcept: [],
      serviceCategoryConcept: [],
      specialtyConcept: [],
      active: true
    }
  },
  methods: {
    addLocation () {
      let formData = new FormData()
      formData.append('name', this.name)
      formData.append('code', this.code)
      formData.append('codeSystemType', 'serviceTypes')
      axios.post(backendServer + '/FR/addCodeSystem', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        this.alertSuccess = true
        this.alertMsg = 'Service type added successfully!'
        this.$refs.form.reset()
      }).catch((err) => {
        this.alertFail = true
        this.alertMsg = 'Failed to add service type!'
        console.log(err)
      })
    },
    getServiceType () {
      axios.get('/FR/getCodeSystem', { params: { codeSystemType: 'serviceTypes' } }).then((response) => {
        this.serviceTypeConcept = response.data
      }).catch((err) => {
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
    this.getCodeSystem('serviceTypes', (err, response) => {
      if (!err) {
        this.serviceTypeConcept = response
      }
    })
    this.getCodeSystem('serviceCategories', (err, response) => {
      if (!err) {
        this.serviceCategoryConcept = response
      }
    })
    this.getCodeSystem('specialties', (err, response) => {
      if (!err) {
        this.specialtyConcept = response
      }
    })
  }
}
</script>