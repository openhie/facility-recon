<template>
  <v-container fluid>
    <v-card
      class="pt-4 mx-auto"
      flat
      max-width="1000"
    >
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
                    <v-tooltip top>
                      <v-select
                        multiple
                        multi-line
                        item-text="display"
                        item-value="code"
                        :items="serviceCategoriesConcept"
                        v-model="serviceCategories"
                        label="Service Category"
                        slot="activator"
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
                      <span>Broad category of service being performed or delivered</span>
                    </v-tooltip>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-tooltip top>
                      <v-select
                        multiple
                        multi-line
                        item-text="display"
                        item-value="code"
                        :items="serviceTypesConcept"
                        v-model="serviceTypes"
                        label="Service Type"
                        slot="activator"
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
                      <span>Type of service that may be delivered or performed</span>
                    </v-tooltip>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-tooltip top>
                      <v-select
                        multiple
                        multi-line
                        item-text="display"
                        item-value="code"
                        :items="referralMethodsConcept"
                        v-model="referralMethods"
                        label="Referral Methods"
                        slot="activator"
                      >
                        <template v-slot:selection="{ item, index }">
                          <v-chip v-if="index < 2">
                            <span>{{ item.display }}</span>
                          </v-chip>
                          <span
                            v-if="index === 2"
                            class="grey--text caption"
                          >(+{{ referralMethods.length - 2 }} others)</span>
                        </template>
                      </v-select>
                      <span>Ways that the service accepts referrals</span>
                    </v-tooltip>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-tooltip top>
                      <v-select
                        multiple
                        multi-line
                        item-text="display"
                        item-value="code"
                        :items="specialtiesConcept"
                        v-model="specialties"
                        label="Specialties"
                        slot="activator"
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
                      <span>Specialties handled by the HealthcareService</span>
                    </v-tooltip>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-tooltip top>
                      <v-select
                        multiple
                        multi-line
                        item-text="display"
                        item-value="code"
                        :items="serviceEligibilitiesConcept"
                        v-model="serviceEligibilities"
                        label="Service Eligibility"
                        slot="activator"
                      >
                        <template v-slot:selection="{ item, index }">
                          <v-chip v-if="index < 2">
                            <span>{{ item.display }}</span>
                          </v-chip>
                          <span
                            v-if="index === 2"
                            class="grey--text caption"
                          >(+{{ serviceEligibilities.length - 2 }} others)</span>
                        </template>
                      </v-select>
                      <span>Specific eligibility requirements required to use the service</span>
                    </v-tooltip>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-tooltip top>
                      <v-select
                        multiple
                        multi-line
                        item-text="display"
                        item-value="code"
                        :items="languagesConcept"
                        v-model="languages"
                        label="Communication Language"
                        slot="activator"
                      >
                        <template v-slot:selection="{ item, index }">
                          <v-chip v-if="index < 2">
                            <span>{{ item.display }}</span>
                          </v-chip>
                          <span
                            v-if="index === 2"
                            class="grey--text caption"
                          >(+{{ languages.length - 2 }} others)</span>
                        </template>
                      </v-select>
                      <span>The language that this service is offered in</span>
                    </v-tooltip>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-tooltip top>
                      <v-select
                        multiple
                        multi-line
                        item-text="display"
                        item-value="code"
                        :items="programsConcept"
                        v-model="programs"
                        label="Programs"
                        slot="activator"
                      >
                        <template v-slot:selection="{ item, index }">
                          <v-chip v-if="index < 2">
                            <span>{{ item.display }}</span>
                          </v-chip>
                          <span
                            v-if="index === 2"
                            class="grey--text caption"
                          >(+{{ programs.length - 2 }} others)</span>
                        </template>
                      </v-select>
                      <span>Programs that this service is applicable to</span>
                    </v-tooltip>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-tooltip top>
                      <v-select
                        multiple
                        multi-line
                        item-text="display"
                        item-value="code"
                        :items="serviceCharacteristicsConcept"
                        v-model="serviceCharacteristics"
                        label="Characteristics"
                        slot="activator"
                      >
                        <template v-slot:selection="{ item, index }">
                          <v-chip v-if="index < 2">
                            <span>{{ item.display }}</span>
                          </v-chip>
                          <span
                            v-if="index === 2"
                            class="grey--text caption"
                          >(+{{ serviceCharacteristics.length - 2 }} others)</span>
                        </template>
                      </v-select>
                      <span>Collection of characteristics (attributes)</span>
                    </v-tooltip>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-tooltip top>
                  <v-select
                    multiple
                    multi-line
                    item-text="display"
                    item-value="code"
                    :items="serviceProvisionConditionsConcept"
                    v-model="serviceProvisionConditions"
                    label="Service Provision Conditions"
                    slot="activator"
                  >
                    <template v-slot:selection="{ item, index }">
                      <v-chip v-if="index < 2">
                        <span>{{ item.display }}</span>
                      </v-chip>
                      <span
                        v-if="index === 2"
                        class="grey--text caption"
                      >(+{{ serviceProvisionConditions.length - 2 }} others)</span>
                    </template>
                  </v-select>
                  <span>Conditions under which service is available/offered</span>
                </v-tooltip>
              </v-flex>
              <v-flex>
                Facility where service is provided
                <liquor-tree
                  v-if="locationHierarchy.length > 0"
                  :data="locationHierarchy"
                  :filter="searchLocation"
                  :options="{checkbox: true}"
                  @node:checked="locationSelected"
                  @node:unchecked="locationUnSelected"
                  ref="locationHierarchyRef"
                >
                  <div
                    slot-scope="{ node }"
                    class="node-container"
                  >
                    <div class="node-text">{{ node.text }}</div>
                  </div>
                </liquor-tree>
              </v-flex>
              <v-flex>
                <v-card>
                  <v-card-title primary-title>
                    Service time availability
                  </v-card-title>
                  <v-card-text>
                    <div
                      v-for='(avTime,key) in availableTime'
                      :key="key"
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
                              <v-select
                                multiple
                                multi-line
                                item-text="text"
                                item-value="value"
                                :items="days"
                                v-model="availableTime[key].mainFields.daysOfWeek"
                                label="Available days of the week"
                              >
                                <template v-slot:selection="{ item, index }">
                                  <v-chip>
                                    <span>{{ item.text }}</span>
                                  </v-chip>
                                </template>
                              </v-select>
                            </v-flex>
                            <v-spacer></v-spacer>
                            <v-flex xs5>
                              <v-switch
                                label="Always available (24 hr service)"
                                v-model="availableTime[key].mainFields.allDay"
                              ></v-switch>
                            </v-flex>
                          </v-layout>
                        </v-flex>
                        <v-flex v-if='!availableTime[key].mainFields.allDay'>
                          <div style="color: red">
                            {{timeRangeErrors[key]}}
                          </div>
                        </v-flex>
                        <v-flex>
                          <v-layout
                            row
                            wrap
                          >
                            <v-flex xs5>
                              <v-menu
                                ref="timeMenuStart"
                                v-model="availableTime[key].otherFields.timeMenuStart"
                                :close-on-content-click="false"
                                :nudge-right="40"
                                :return-value.sync="availableTime[key].mainFields.availableStartTime"
                                lazy
                                transition="scale-transition"
                                offset-y
                                full-width
                                max-width="290px"
                                min-width="290px"
                              >
                                <template v-slot:activator="{ on }">
                                  <v-text-field
                                    :disabled="availableTime[key].mainFields.allDay"
                                    v-model="availableTime[key].mainFields.availableStartTime"
                                    label="Available start time"
                                    prepend-icon="access_time"
                                    clearable
                                    @click:clear="clearStartTime(key)"
                                    readonly
                                    v-on="on"
                                  ></v-text-field>
                                </template>
                                <v-time-picker
                                  v-if="availableTime[key].otherFields.timeMenuStart"
                                  v-model="availableTime[key].mainFields.availableStartTime"
                                  format="24hr"
                                  full-width
                                  @click:minute="validateStartTime(key)"
                                ></v-time-picker>
                              </v-menu>
                            </v-flex>
                            <v-spacer></v-spacer>
                            <v-flex xs5>
                              <v-menu
                                ref="timeMenuEnd"
                                v-model="availableTime[key].otherFields.timeMenuEnd"
                                :close-on-content-click="false"
                                :nudge-right="40"
                                :return-value.sync="availableTime[key].mainFields.availableEndTime"
                                lazy
                                transition="scale-transition"
                                offset-y
                                full-width
                                max-width="290px"
                                min-width="290px"
                              >
                                <template v-slot:activator="{ on }">
                                  <v-text-field
                                    :disabled="availableTime[key].mainFields.allDay"
                                    v-model="availableTime[key].mainFields.availableEndTime"
                                    label="Available end time"
                                    prepend-icon="access_time"
                                    clearable
                                    @click:clear="clearEndTime(key)"
                                    readonly
                                    v-on="on"
                                  ></v-text-field>
                                </template>
                                <v-time-picker
                                  v-if="availableTime[key].otherFields.timeMenuEnd"
                                  v-model="availableTime[key].mainFields.availableEndTime"
                                  format="24hr"
                                  full-width
                                  @click:minute="validateEndTime(key)"
                                ></v-time-picker>
                              </v-menu>
                            </v-flex>
                          </v-layout>
                        </v-flex>
                      </v-layout>
                      <v-divider></v-divider>
                      <v-divider></v-divider>
                    </div>
                    <v-layout
                      row
                      wrap
                    >
                      <v-spacer></v-spacer>
                      <v-flex xs1>
                        <v-tooltip top>
                          <v-btn
                            icon
                            color="primary"
                            @click="addAvailableTime"
                            slot="activator"
                          >
                            <v-icon>add</v-icon>
                          </v-btn>
                          <span>Add more availability for this service</span>
                        </v-tooltip>
                      </v-flex>
                    </v-layout>
                  </v-card-text>
                </v-card>
              </v-flex>
              <v-divider></v-divider>
              <v-divider></v-divider>
              <v-flex>
                <v-card>
                  <v-card-title primary-title>
                    Service un availability
                  </v-card-title>
                  <v-card-text>
                    <div
                      v-for='(notAvTime,key) in notAvailable'
                      :key="key"
                    >
                      <v-layout
                        column
                        wrap
                      >
                        <v-flex>
                          <div style="color: red">
                            {{unavailabilityDescrErr[key]}}
                          </div>
                        </v-flex>
                        <v-flex>
                          <v-layout
                            row
                            wrap
                          >
                            <v-flex>
                              <v-tooltip top>
                                <v-text-field
                                  v-model="notAvailable[key].mainFields.description"
                                  label="Description"
                                  @input="validateUnavailabilityDescr(key)"
                                  id="id"
                                  slot="activator"
                                ></v-text-field>
                                <span>Reason presented to the user explaining why time not available</span>
                              </v-tooltip>
                            </v-flex>
                          </v-layout>
                        </v-flex>
                        <v-flex>
                          <div style="color: red">
                            {{dateRangeErrors[key]}}
                          </div>
                        </v-flex>
                        <v-flex>
                          <v-layout
                            row
                            wrap
                          >
                            <v-flex xs5>
                              <v-menu
                                ref="dateMenuStart"
                                v-model="notAvailable[key].otherFields.dateMenuStart"
                                :return-value.sync="notAvailable[key].mainFields.during.startDisplay"
                                :close-on-content-click="false"
                                full-width
                                max-width="290"
                              >
                                <template v-slot:activator="{ on }">
                                  <v-text-field
                                    :value="notAvailable[key].mainFields.during.startDisplay"
                                    clearable
                                    @click:clear="clearStartDate(key)"
                                    label="Start Date"
                                    readonly
                                    v-on="on"
                                  ></v-text-field>
                                </template>
                                <v-date-picker
                                  v-model="notAvailable[key].mainFields.during.start"
                                  @change="notAvailable[key].otherFields.dateMenuStart = false"
                                  @input="validateStartDate(key)"
                                ></v-date-picker>
                              </v-menu>
                            </v-flex>
                            <v-spacer></v-spacer>
                            <v-flex xs5>
                              <v-menu
                                ref="dateMenuEnd"
                                v-model="notAvailable[key].otherFields.dateMenuEnd"
                                :return-value.sync="notAvailable[key].mainFields.during.endDisplay"
                                :close-on-content-click="false"
                                full-width
                                max-width="290"
                              >
                                <template v-slot:activator="{ on }">
                                  <v-text-field
                                    :value="notAvailable[key].mainFields.during.endDisplay"
                                    clearable
                                    @click:clear="clearEndDate(key)"
                                    label="End Date"
                                    readonly
                                    v-on="on"
                                  ></v-text-field>
                                </template>
                                <v-date-picker
                                  v-model="notAvailable[key].mainFields.during.end"
                                  @change="notAvailable[key].otherFields.dateMenuEnd = false"
                                  @input="validateEndDate(key)"
                                ></v-date-picker>
                              </v-menu>
                            </v-flex>
                          </v-layout>
                        </v-flex>
                      </v-layout>
                      <v-divider></v-divider>
                      <v-divider></v-divider>
                    </div>
                    <v-layout
                      row
                      wrap
                    >
                      <v-spacer></v-spacer>
                      <v-flex xs1>
                        <v-tooltip top>
                          <v-btn
                            icon
                            color="primary"
                            @click="addUnavailableTime"
                            slot="activator"
                          >
                            <v-icon>add</v-icon>
                          </v-btn>
                          <span>Add more service un availability</span>
                        </v-tooltip>
                      </v-flex>
                    </v-layout>
                  </v-card-text>
                </v-card>
              </v-flex>
              <v-divider></v-divider>
              <v-divider></v-divider>
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
              <v-divider></v-divider>
              <v-divider></v-divider>
              <v-divider></v-divider>
              <v-flex>
                <v-tooltip top>
                  <v-textarea
                    outline
                    label="Comment about this service"
                    v-model="comment"
                    slot="activator"
                  >
                  </v-textarea>
                  <span>Additional description and/or any specific issues not covered elsewhere</span>
                </v-tooltip>
              </v-flex>
              <v-flex>
                <v-tooltip top>
                  <v-textarea
                    outline
                    label="Extra details about this service"
                    v-model="extraDetails"
                    slot="activator"
                  >
                  </v-textarea>
                  <span>Extra details about the service that can't be placed in the other fields</span>
                </v-tooltip>
              </v-flex>
              <v-flex>
                <v-tooltip top>
                  <label slot="activator">Photo for a service</label>
                  <input
                    type="file"
                    @change="previewImage"
                    accept="image/*"
                    slot="activator"
                  >
                  <span>Facilitates quick identification of the service</span>
                </v-tooltip>
                <div
                  class="image-preview"
                  v-if="imageData.length > 0"
                >
                  <img
                    class="preview"
                    :src="imageData"
                  >
                </div>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-tooltip top>
                      <v-switch
                        label="Appointment Required"
                        v-model="appointmentRequired"
                        slot="activator"
                      ></v-switch>
                      <span>If an appointment is required for access to this service</span>
                    </v-tooltip>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs2>
                    <v-switch
                      label="Active"
                      v-model="active"
                    ></v-switch>
                  </v-flex>
                </v-layout>
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
              @click="addService()"
              :disabled="$v.$invalid || ((hasTimeRangeErrors || hasDateRangeErrors || hasUnAvDescrErrors) && !availableTime.allDay)"
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
import LiquorTree from 'liquor-tree'
import moment from 'moment'
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
      dateRangeErrors: [],
      timeRangeErrors: [],
      unavailabilityDescrErr: [],
      name: '',
      code: '',
      comment: '',
      extraDetails: '',
      serviceTypes: [],
      serviceCharacteristics: [],
      serviceProvisionConditions: [],
      programs: [],
      languages: [],
      serviceCategories: [],
      specialties: [],
      referralMethods: [],
      serviceEligibilities: [],
      serviceTypesConcept: [],
      serviceCategoriesConcept: [],
      specialtiesConcept: [],
      referralMethodsConcept: [],
      serviceEligibilitiesConcept: [],
      languagesConcept: [],
      serviceCharacteristicsConcept: [],
      serviceProvisionConditionsConcept: [],
      programsConcept: [],
      locations: [],
      contact: {
        email: '',
        phone: '',
        fax: '',
        website: ''
      },
      availableTime: [{
        mainFields: {
          daysOfWeek: [],
          allDay: false,
          availableStartTime: '',
          availableEndTime: ''
        },
        otherFields: {
          timeMenuStart: false,
          timeMenuEnd: false
        }
      }],
      notAvailable: [{
        mainFields: {
          description: '',
          during: {
            start: '',
            end: '',
            startDisplay: '',
            endDisplay: ''
          }
        },
        otherFields: {
          dateMenuStart: false,
          dateMenuEnd: false
        }
      }],
      active: true,
      appointmentRequired: false,
      locationHierarchy: [],
      searchLocation: '',
      days: [{
        text: 'Monday',
        value: 'mon'
      }, {
        text: 'Tuesday',
        value: 'tue'
      }, {
        text: 'Wednesday',
        value: 'wed'
      }, {
        text: 'Thursday',
        value: 'thu'
      }, {
        text: 'Friday',
        value: 'fri'
      }, {
        text: 'Saturday',
        value: 'sat'
      }, {
        text: 'Sunday',
        value: 'sun'
      }],
      imageData: ''
    }
  },
  methods: {
    addAvailableTime () {
      this.availableTime.push({
        mainFields: {
          daysOfWeek: [],
          allDay: false,
          availableStartTime: '',
          availableEndTime: ''
        },
        otherFields: {
          timeMenuStart: false,
          timeMenuEnd: false
        }
      })
    },
    addUnavailableTime () {
      this.notAvailable.push({
        mainFields: {
          description: '',
          during: {
            start: '',
            end: '',
            startDisplay: '',
            endDisplay: ''
          }
        },
        otherFields: {
          dateMenuStart: false,
          dateMenuEnd: false
        }
      })
    },
    clearEndTime (key) {
      this.availableTime[key].mainFields.availableEndTime = ''
      this.validateStartTime(key)
    },
    clearStartTime (key) {
      this.availableTime[key].mainFields.availableStartTime = ''
      this.validateEndTime(key)
    },
    clearEndDate (key) {
      this.notAvailable[key].mainFields.during.end = ''
      this.notAvailable[key].mainFields.during.endDisplay = ''
      this.validateStartDate(key)
    },
    clearStartDate (key) {
      this.notAvailable[key].mainFields.during.start = ''
      this.notAvailable[key].mainFields.during.startDisplay = ''
      this.validateEndDate(key)
    },
    previewImage (event) {
      var input = event.target
      if (input.files && input.files[0]) {
        var reader = new FileReader()
        reader.onload = (e) => {
          this.imageData = e.target.result
        }
        reader.readAsDataURL(input.files[0])
      }
    },
    locationSelected (location) {
      if (location.data.locType === 'bu') {
        this.locations.push(location.id)
      }
    },
    locationUnSelected (location) {
      if (this.locations.indexOf(location.id) !== -1) {
        this.locations.splice(this.locations.indexOf(location.id), 1)
      }
    },
    addService () {
      let formData = new FormData()
      formData.append('name', this.name)
      formData.append('code', this.code)
      formData.append('category', JSON.stringify(this.serviceCategories))
      formData.append('type', JSON.stringify(this.serviceTypes))
      formData.append('referralMethod', JSON.stringify(this.referralMethods))
      formData.append('specialty', JSON.stringify(this.specialties))
      formData.append('eligibility', JSON.stringify(this.serviceEligibilities))
      formData.append('communication', JSON.stringify(this.languages))
      formData.append('program', JSON.stringify(this.programs))
      formData.append('characteristic', JSON.stringify(this.serviceCharacteristics))
      formData.append('serviceProvisionCode', JSON.stringify(this.serviceProvisionConditions))
      formData.append('location', JSON.stringify(this.locations))
      formData.append('comment', this.comment)
      formData.append('extraDetails', this.extraDetails)
      formData.append('photo', this.imageData)
      formData.append('availableTime', JSON.stringify(this.availableTime))
      formData.append('notAvailable', JSON.stringify(this.notAvailable))
      formData.append('telecom', JSON.stringify(this.contact))
      formData.append('appointmentRequired', this.appointmentRequired)
      formData.append('active', this.active)
      axios.post(backendServer + '/FR/addService', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        this.$store.state.alert.show = true
        this.$store.state.alert.width = '800px'
        this.$store.state.alert.msg = 'Service added successfully!'
        this.$store.state.alert.type = 'success'
        // increment component key to force component reload
        this.$store.state.baseRouterViewKey += 1
      }).catch((err) => {
        this.$store.state.alert.show = true
        this.$store.state.alert.width = '800px'
        this.$store.state.alert.msg = 'Failed to add service!'
        this.$store.state.alert.type = 'error'
        this.$store.state.baseRouterViewKey += 1
        console.log(err)
      })
    },
    validateEndTime (key) {
      this.$refs.timeMenuEnd[key].save(this.availableTime[key].mainFields.availableEndTime + ':00')
      this.timeRangeErrors.splice(key, 1, '')
      if (!this.availableTime[key].mainFields.availableStartTime && this.availableTime[key].mainFields.availableEndTime) {
        this.timeRangeErrors.splice(key, 1, 'Start time is missing')
        return false
      }
      if (!this.availableTime[key].mainFields.availableStartTime && !this.availableTime[key].mainFields.availableEndTime) {
        return
      }
      let time1 = this.availableTime[key].mainFields.availableStartTime.split(':')
      let startTimeObject = new Date()
      startTimeObject.setHours(time1[0], time1[1], '00')

      let time2 = this.availableTime[key].mainFields.availableEndTime.split(':')
      let endTimeObject = new Date()
      endTimeObject.setHours(time2[0], time2[1], '00')
      if (time2 <= time1) {
        this.timeRangeErrors.splice(key, 1, 'End time must be after start time')
      }
    },
    validateStartTime (key) {
      this.$refs.timeMenuStart[key].save(this.availableTime[key].mainFields.availableStartTime + ':00')
      this.timeRangeErrors.splice(key, 1, '')
      if (!this.availableTime[key].mainFields.availableEndTime && this.availableTime[key].mainFields.availableStartTime) {
        this.timeRangeErrors.splice(key, 1, 'End time is missing')
        return false
      }
      if (!this.availableTime[key].mainFields.availableStartTime && !this.availableTime[key].mainFields.availableEndTime) {
        return
      }
      let time1 = this.availableTime[key].mainFields.availableStartTime.split(':')
      let startTimeObject = new Date()
      startTimeObject.setHours(time1[0], time1[1], '00')

      let time2 = this.availableTime[key].mainFields.availableEndTime.split(':')
      let endTimeObject = new Date()
      endTimeObject.setHours(time2[0], time2[1], '00')
      if (time2 <= time1) {
        this.timeRangeErrors.splice(key, 1, 'End time must be after start time')
      }
    },
    validateStartDate (key) {
      this.dateRangeErrors.splice(key, 1, '')
      let date = moment(this.notAvailable[key].mainFields.during.start).format('Do MMMM YYYY')
      this.$refs.dateMenuStart[key].save(date)
      this.validateUnavailabilityDescr(key)
      if (!this.notAvailable[key].mainFields.during.end && this.notAvailable[key].mainFields.during.start) {
        this.dateRangeErrors.splice(key, 1, 'End date is missing')
        return false
      }
      if (this.notAvailable[key].mainFields.during.end < this.notAvailable[key].mainFields.during.start) {
        this.dateRangeErrors.splice(key, 1, 'End date must be after start date')
      }
    },
    validateEndDate (key) {
      this.dateRangeErrors.splice(key, 1, '')
      let date = moment(this.notAvailable[key].mainFields.during.end).format('Do MMMM YYYY')
      this.$refs.dateMenuEnd[key].save(date)
      this.validateUnavailabilityDescr(key)
      if (!this.notAvailable[key].mainFields.during.start && this.notAvailable[key].mainFields.during.end) {
        this.dateRangeErrors.splice(key, 1, 'Start date is missing')
        return false
      }
      if (this.notAvailable[key].mainFields.during.end < this.notAvailable[key].mainFields.during.start) {
        this.dateRangeErrors.splice(key, 1, 'End date must be after start date')
      }
    },
    validateUnavailabilityDescr (key) {
      this.unavailabilityDescrErr.splice(key, 1, '')
      if ((this.notAvailable[key].mainFields.during.start || this.notAvailable[key].mainFields.during.end) && !this.notAvailable[key].mainFields.description) {
        return this.unavailabilityDescrErr.splice(key, 1, 'Description is missing')
      }
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
    },
    hasTimeRangeErrors () {
      if (this.timeRangeErrors.length === 0) {
        return false
      }
      for (let error of this.timeRangeErrors) {
        if (error) {
          return true
        }
      }
      return false
    },
    hasDateRangeErrors () {
      if (this.dateRangeErrors.length === 0) {
        return false
      }
      for (let error of this.dateRangeErrors) {
        if (error) {
          return true
        }
      }
      return false
    },
    hasUnAvDescrErrors () {
      if (this.unavailabilityDescrErr.length === 0) {
        return false
      }
      for (let error of this.unavailabilityDescrErr) {
        if (error) {
          return true
        }
      }
      return false
    }
  },
  created () {
    this.getTree(true, (err, tree) => {
      if (!err) {
        this.locationHierarchy = tree
      }
    })
    this.getCodeSystem('serviceTypes', (err, response) => {
      if (!err) {
        this.serviceTypesConcept = response
      }
    })
    this.getCodeSystem('serviceCategories', (err, response) => {
      if (!err) {
        this.serviceCategoriesConcept = response
      }
    })
    this.getCodeSystem('specialties', (err, response) => {
      if (!err) {
        this.specialtiesConcept = response
      }
    })
    this.getCodeSystem('serviceEligibilities', (err, response) => {
      if (!err) {
        this.serviceEligibilitiesConcept = response
      }
    })
    this.getCodeSystem('languages', (err, response) => {
      if (!err) {
        this.languagesConcept = response
      }
    })
    this.getCodeSystem('referralMethods', (err, response) => {
      if (!err) {
        this.referralMethodsConcept = response
      }
    })
    this.getCodeSystem('programs', (err, response) => {
      if (!err) {
        this.programsConcept = response
      }
    })
    this.getCodeSystem('serviceCharacteristics', (err, response) => {
      if (!err) {
        this.serviceCharacteristicsConcept = response
      }
    })
    this.getCodeSystem('serviceProvisionConditions', (err, response) => {
      if (!err) {
        this.serviceProvisionConditionsConcept = response
      }
    })
  },
  components: {
    'liquor-tree': LiquorTree
  }
}
</script>
<style scoped>
.file-upload-form,
.image-preview {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  padding: 20px;
}
img.preview {
  width: 200px;
  background-color: white;
  border: 1px solid #ddd;
  padding: 5px;
}
</style>