<template>
  <v-container fluid>
    <v-dialog
      v-if="viewDialog"
      persistent
      v-model="viewDialog"
      transition="scale-transition"
      max-width="950px"
    >
      <v-toolbar
        color="primary"
        dark
      >
        <v-spacer></v-spacer>
        <v-icon
          @click="closeViewDialog"
          style="cursor: pointer"
        >close</v-icon>
      </v-toolbar>
      <v-card>
        <v-card-text>
          <v-switch
            label="Expand All"
            v-model="expand"
            @change="expandAll"
          ></v-switch>
          <v-expansion-panel
            expand
            v-model="panel"
          >
            <v-layout column>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Name</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>{{service.name}}</v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Code</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>{{service.identifier | displayId}}</v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Active</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <template v-if="service.active">
                            Yes
                          </template>
                          <template v-else>
                            No
                          </template>
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Appointment Required</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <template v-if="service.appointment">
                            Yes
                          </template>
                          <template v-else>
                            No
                          </template>
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Service Time Availability</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <template v-for="(availableTime, id) in service.availableTime">
                            Days of the week: {{availableTime.daysOfWeek | translateDays}} <br>
                            Available All Day:
                            <label
                              v-if="availableTime.allDay"
                              :key="'allDayYes'+id"
                            >
                              Yes
                            </label>
                            <label
                              :key="'allDayNo'+id"
                              v-else
                            >
                              No
                            </label><br>
                            <label
                              v-if="availableTime.availableStartTime"
                              :key="'startTime'+id"
                            >
                              Available Start Time: {{availableTime.availableStartTime}} <br>
                            </label>
                            <label
                              v-if="availableTime.availableEndTime"
                              :key="'endTime'+id"
                            >
                              Available End Time: {{availableTime.availableEndTime}} <br>
                            </label>
                            <v-divider></v-divider>
                          </template>
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Service Unavailability</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <template v-for="(notAvailable, id) in service.notAvailable">
                            Description: {{notAvailable.description}} <br>
                            <label
                              v-if="notAvailable.during && (notAvailable.during.start || notAvailable.during.end)"
                              :key="'unavailable'+id"
                            >
                              Dates Unavailable: {{notAvailable.during.start | formatDate}} to {{notAvailable.during.end | formatDate}}
                            </label>
                            <v-divider :key="'unAvDivider'+id"></v-divider>
                          </template>
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Service Types</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <label v-html="formatCodeableConcept(service.type)" />
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Service Category</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <label v-html="formatCodeableConcept(service.category)" />
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-expansion-panel-content>
                  <template v-slot:header>
                    <div>Facilities Offering Service</div>
                  </template>
                  <v-card class="grey lighten-3">
                    <v-card-text>
                      <template v-for="location in service.location">
                        {{location.name}}<br>
                      </template>
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-content>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Required Specialty</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <label v-html="formatCodeableConcept(service.specialty)" />
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Eligibility</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <label v-html="formatCodeableConcept(service.eligibility)" />
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Contacts</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <template v-for="(telecom,id) in service.telecom">
                            <label
                              v-if="telecom.system === 'url'"
                              :key="id"
                            >website</label>
                            <label
                              v-else
                              :key="id"
                            >{{telecom.system}}</label>
                            : {{telecom.value}} <br>
                          </template>
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Communication Language</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <label v-html="formatCodeableConcept(service.communication)" />
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Service Provision Conditions</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <label v-html="formatCodeableConcept(service.serviceProvisionCode)" />
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Referral Methods</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <label v-html="formatCodeableConcept(service.referralMethod)" />
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-layout
                  row
                  wrap
                >
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Characteristics</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <label v-html="formatCodeableConcept(service.characteristic)" />
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                  <v-spacer></v-spacer>
                  <v-flex xs5>
                    <v-expansion-panel-content>
                      <template v-slot:header>
                        <div>Programs</div>
                      </template>
                      <v-card class="grey lighten-3">
                        <v-card-text>
                          <label v-html="formatCodeableConcept(service.program)" />
                        </v-card-text>
                      </v-card>
                    </v-expansion-panel-content>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex>
                <v-expansion-panel-content>
                  <template v-slot:header>
                    <div>Comments</div>
                  </template>
                  <v-card class="grey lighten-3">
                    <v-card-text>
                      {{service.comment}}
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-content>
              </v-flex>
              <v-flex>
                <v-expansion-panel-content>
                  <template v-slot:header>
                    <div>Extra Details</div>
                  </template>
                  <v-card class="grey lighten-3">
                    <v-card-text>
                      {{service.extraDetails}}
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-content>
              </v-flex>
              <v-flex>
                <v-expansion-panel-content>
                  <template v-slot:header>
                    <div>Photo</div>
                  </template>
                  <v-card>
                    <v-card-text>
                      <img :src="service.photo" />
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-content>
              </v-flex>
            </v-layout>
          </v-expansion-panel>
        </v-card-text>
      </v-card>
      <!-- <v-data-table
        :items="serviceHeader"
        :expand="expand"
        item-key="name"
        hide-actions
      >
        <template v-slot:items="props">
          <tr @click="props.expanded = !props.expanded">
            <td>{{ props.item.name }}</td>
          </tr>
        </template>
        <template v-slot:expand="props">
          <v-card
            flat
            color="primary"
          >
            <v-card-text>
              <template v-if="props.item.value === 'name'">
                {{service.name}}
              </template>
              <template v-if="props.item.value === 'code'">
                {{service.identifier | displayId}}
              </template>
              <template v-if="props.item.value === 'facility'">
                <template v-for="location in service.location">
                  {{location.name}}<br>
                </template>
              </template>
              <template v-if="props.item.value === 'active'">
                <template v-if="service.active">
                  Yes
                </template>
                <template v-else>
                  No
                </template>
              </template>
              <template v-if="props.item.value === 'appointment'">
                <template v-if="service.appointment">
                  Yes
                </template>
                <template v-else>
                  No
                </template>
              </template>
              <template v-if="props.item.value === 'type'">
                <label v-html="formatCodeableConcept(service.type)" />
              </template>
              <template v-if="props.item.value === 'category'">
                <label v-html="formatCodeableConcept(service.category)" />
              </template>
              <template v-if="props.item.value === 'specialty'">
                <label v-html="formatCodeableConcept(service.specialty)" />
              </template>
              <template v-if="props.item.value === 'availableTime'">
                <template v-for="(availableTime, id) in service.availableTime">
                  Days of the week: {{availableTime.daysOfWeek | translateDays}} <br>
                  Available All Day:
                  <label
                    v-if="availableTime.allDay"
                    :key="'allDayYes'+id"
                  >
                    Yes
                  </label>
                  <label
                    :key="'allDayNo'+id"
                    v-else
                  >
                    No
                  </label><br>
                  <label
                    v-if="availableTime.availableStartTime"
                    :key="'startTime'+id"
                  >
                    Available Start Time: {{availableTime.availableStartTime}} <br>
                  </label>
                  <label
                    v-if="availableTime.availableEndTime"
                    :key="'endTime'+id"
                  >
                    Available End Time: {{availableTime.availableEndTime}} <br>
                  </label>
                  <v-divider></v-divider>
                </template>
              </template>
              <template v-if="props.item.value === 'notAvailable'">
                <template v-for="(notAvailable, id) in service.notAvailable">
                  Description: {{notAvailable.description}} <br>
                  <label
                    v-if="notAvailable.during && (notAvailable.during.start || notAvailable.during.end)"
                    :key="'unavailable'+id"
                  >
                    Dates Unavailable: {{notAvailable.during.start | formatDate}} to {{notAvailable.during.end | formatDate}}
                  </label>
                  <v-divider :key="'unAvDivider'+id"></v-divider>
                </template>
              </template>
              <template v-if="props.item.value === 'telecom'">
                <template v-for="(telecom,id) in service.telecom">
                  <label
                    v-if="telecom.system === 'url'"
                    :key="id"
                  >website</label>
                  <label
                    v-else
                    :key="id"
                  >{{telecom.system}}</label>
                  : {{telecom.value}} <br>
                </template>
              </template>
              <template v-if="props.item.value === 'serviceProvisionCode'">
                <label v-html="formatCodeableConcept(service.serviceProvisionCode)" />
              </template>
              <template v-if="props.item.value === 'eligibility'">
                <label v-html="formatCodeableConcept(service.eligibility)" />
              </template>
              <template v-if="props.item.value === 'referralMethod'">
                <label v-html="formatCodeableConcept(service.referralMethod)" />
              </template>
              <template v-if="props.item.value === 'communication'">
                <label v-html="formatCodeableConcept(service.communication)" />
              </template>
              <template v-if="props.item.value === 'program'">
                <label v-html="formatCodeableConcept(service.program)" />
              </template>
              <template v-if="props.item.value === 'characteristics'">
                <label v-html="formatCodeableConcept(service.characteristic)" />
              </template>
              <template v-if="props.item.value === 'comments'">
                {{service.comment}}
              </template>
              <template v-if="props.item.value === 'details'">
                {{service.extraDetails}}
              </template>
            </v-card-text>
          </v-card>
        </template>
      </v-data-table>
      <v-card>
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
                <v-flex xs4>
                  Name
                </v-flex>
                <v-flex xs5>
                  {{service.name}}
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Code
                </v-flex>
                <v-flex xs5>
                  {{service.identifier | displayId}}
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Facilities Offering Service
                </v-flex>
                <v-flex xs5>
                  <template v-for="location in service.location">
                    {{location.name}}<br>
                  </template>
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Active
                </v-flex>
                <v-flex xs5>
                  <template v-if="service.active">
                    Yes
                  </template>
                  <template v-else>
                    No
                  </template>
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Appointment Required
                </v-flex>
                <v-flex xs5>
                  <template v-if="service.appointment">
                    Yes
                  </template>
                  <template v-else>
                    No
                  </template>
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Service Types
                </v-flex>
                <v-flex xs5>
                  <label v-html="formatCodeableConcept(service.type)" />
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Service Categories
                </v-flex>
                <v-flex xs5>
                  <label v-html="formatCodeableConcept(service.category)" />
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Required Specialty
                </v-flex>
                <v-flex xs5>
                  <label v-html="formatCodeableConcept(service.specialty)" />
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Service Time Availability
                </v-flex>
                <v-flex xs7>
                  <template v-for="(availableTime, id) in service.availableTime">
                    Days of the week: {{availableTime.daysOfWeek | translateDays}} <br>
                    Available All Day:
                    <label
                      v-if="availableTime.allDay"
                      :key="'allDayYes'+id"
                    >
                      Yes
                    </label>
                    <label
                      :key="'allDayNo'+id"
                      v-else
                    >
                      No
                    </label><br>
                    <label
                      v-if="availableTime.availableStartTime"
                      :key="'startTime'+id"
                    >
                      Available Start Time: {{availableTime.availableStartTime}} <br>
                    </label>
                    <label
                      v-if="availableTime.availableEndTime"
                      :key="'endTime'+id"
                    >
                      Available End Time: {{availableTime.availableEndTime}} <br>
                    </label>
                    <v-divider></v-divider>
                  </template>
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Service Unavailability
                </v-flex>
                <v-flex xs7>
                  <template v-for="(notAvailable, id) in service.notAvailable">
                    Description: {{notAvailable.description}} <br>
                    <label
                      v-if="notAvailable.during && (notAvailable.during.start || notAvailable.during.end)"
                      :key="'unavailable'+id"
                    >
                      Dates Unavailable: {{notAvailable.during.start | formatDate}} to {{notAvailable.during.end | formatDate}}
                    </label>
                    <v-divider :key="'unAvDivider'+id"></v-divider>
                  </template>
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Contacts
                </v-flex>
                <v-flex xs5>
                  <template v-for="(telecom,id) in service.telecom">
                    <label
                      v-if="telecom.system === 'url'"
                      :key="id"
                    >website</label>
                    <label
                      v-else
                      :key="id"
                    >{{telecom.system}}</label>
                    : {{telecom.value}} <br>
                  </template>
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Service Provision Conditions
                </v-flex>
                <v-flex xs5>
                  <label v-html="formatCodeableConcept(service.serviceProvisionCode)" />
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Eligibility
                </v-flex>
                <v-flex xs5>
                  <label v-html="formatCodeableConcept(service.eligibility)" />
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Referral Methods
                </v-flex>
                <v-flex xs5>
                  <label v-html="formatCodeableConcept(service.referralMethod)" />
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Communication Language
                </v-flex>
                <v-flex xs5>
                  <label v-html="formatCodeableConcept(service.communication)" />
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Program
                </v-flex>
                <v-flex xs5>
                  <label v-html="formatCodeableConcept(service.program)" />
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Characteristics
                </v-flex>
                <v-flex xs5>
                  <label v-html="formatCodeableConcept(service.characteristic)" />
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Comments
                </v-flex>
                <v-flex xs5>
                  {{service.comment}}
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Extra Details
                </v-flex>
                <v-flex xs5>
                  {{service.extraDetails}}
                </v-flex>
              </v-layout>
            </v-flex>
            <v-flex>
              <v-layout
                row
                wrap
              >
                <v-flex xs4>
                  Photo
                </v-flex>
                <v-flex xs5>
                  <img :src="service.photo" />
                </v-flex>
              </v-layout>
            </v-flex>
          </v-layout>
        </v-card-text>
      </v-card> -->
    </v-dialog>
    <v-card
      max-width="1200px"
      class="mx-auto"
    >
      <v-card-title class="indigo white--text headline">
        <v-layout
          row
          wrap
        >
          <v-flex>
            Services List
          </v-flex>
          <v-spacer></v-spacer>
          <v-flex>
            <v-text-field
              v-model="searchServices"
              append-icon="search"
              label="Search Service"
              single-line
              hide-details
            ></v-text-field>
          </v-flex>
        </v-layout>
      </v-card-title>
      <v-scroll-y-transition mode="out-in">
        <v-card flat>
          <v-card-text>
            <v-data-table
              :loading="loadingServices"
              :headers="servicesHeaders"
              :items="services"
              :search="searchServices"
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
                    @click="view(props.item.id)"
                  >
                    <v-icon>list</v-icon>
                  </v-btn>
                </td>
                <td>{{props.item.name}}</td>
                <td>{{props.item.code}}</td>
                <td>{{props.item.type.join(',') | limitCharacters}}</td>
                <td>{{props.item.locations}}</td>
                <td>{{props.item.active}}</td>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-scroll-y-transition>
    </v-card>
  </v-container>
</template>
<script>
import axios from 'axios'
import moment from 'moment'
const backendServer = process.env.BACKEND_SERVER
export default {
  data () {
    return {
      panel: [],
      expand: false,
      viewDialog: false,
      searchServices: '',
      services: [],
      service: {},
      loadingServices: false,
      servicesHeaders: [
        { sortable: false },
        { text: 'Name', value: 'name' },
        { text: 'Code', value: 'code' },
        { text: 'Service Types', value: 'type' },
        { text: 'Facilities Offering Service', value: 'locations' },
        { text: 'Active', value: 'active' }
      ],
      serviceHeader: [
        { name: 'Name', value: 'name' },
        { name: 'Code', value: 'code' },
        { name: 'Facilities Offering Service', value: 'facility' },
        { name: 'Active', value: 'active' },
        { name: 'Appointment Required', value: 'appointment' },
        { name: 'Service Types', value: 'type' },
        { name: 'Service Categories', value: 'category' },
        { name: 'Required Specialty', value: 'specialty' },
        { name: 'Service Time Availability', value: 'availableTime' },
        { name: 'Service Unavailability', value: 'notAvailable' },
        { name: 'Contacts', value: 'telecom' },
        { name: 'Service Provision Conditions', value: 'serviceProvisionCode' },
        { name: 'Eligibility', value: 'eligibility' },
        { name: 'Referral Methods', value: 'referralMethod' },
        { name: 'Communication Language', value: 'communication' },
        { name: 'Program', value: 'program' },
        { name: 'Characteristics', value: 'characteristics' },
        { name: 'Comments', value: 'comments' },
        { name: 'Extra Details', value: 'details' },
        { name: 'Photo', value: 'photo' }
      ]
    }
  },
  filters: {
    limitCharacters (value) {
      return value.substring(0, 40)
    },
    displayId (value) {
      if (!value) {
        return
      }
      let ids
      for (let val of value) {
        if (ids) {
          ids += ', ' + val.value
        } else {
          ids = val.value
        }
      }
      return ids
    },
    translateDays (value) {
      let days = []
      for (let val of value) {
        if (val === 'mon') {
          days.push('Monday')
        }
        if (val === 'tue') {
          days.push('Tuesday')
        }
        if (val === 'wed') {
          days.push('Wednesday')
        }
        if (val === 'thu') {
          days.push('Thursday')
        }
        if (val === 'fri') {
          days.push('Friday')
        }
        if (val === 'sat') {
          days.push('Saturday')
        }
        if (val === 'sun') {
          days.push('Sunday')
        }
      }
      return days.join(', ')
    },
    formatDate (value) {
      return moment(value).format('Do MMMM YYYY')
    }
  },
  methods: {
    expandAll (value) {
      if (this.expand) {
        this.panel = [...Array(20).keys()].map(_ => true)
      } else {
        this.panel = []
      }
    },
    formatCodeableConcept (concept) {
      if (!concept || !Array.isArray(concept)) {
        return ''
      }
      let display
      for (let val of concept) {
        let text
        if (val.hasOwnProperty('code')) {
          text = val.code.text
        } else {
          text = val.text
        }
        if (display) {
          display += '<br>' + text
        } else {
          display = text
        }
      }
      return display
    },
    getServices ({ getResource, id }, callback) {
      let params = {
        getResource,
        id
      }
      axios.get(backendServer + '/FR/getServices', { params }).then((services) => {
        return callback(services)
      }).catch((err) => {
        console.log(err)
      })
    },
    view (id) {
      this.getServices({ id, getResource: true }, (service) => {
        if (service.data && service.data.entry && service.data.entry.length > 0) {
          this.service = service.data.entry[0].resource
        }
        this.viewDialog = true
      })
    },
    closeViewDialog () {
      this.viewDialog = false
      this.expand = false
    }
  },
  created () {
    this.loadingServices = true
    this.getServices({}, (services) => {
      this.loadingServices = false
      this.services = services.data
    })
  }
}
</script>