<template>
  <ul id="menu">
    <li class="parent"><a href="#">
        <v-icon>spellcheck</v-icon> {{$t('App.menu.facilityRecon.msg')}}
      </a>
      <ul class="child">
        <li class="parent">
          <a
            href="#"
            style="margin-left: 15px"
          >
            <v-icon
              color="black"
              left
            >sync</v-icon>{{ $t('App.menu.dataSourcesParent.msg')}} <v-icon
              color="black"
              small
              class="menuArrow"
            >play_arrow</v-icon>
          </a>
          <ul class="child">
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  to="AddDataSources"
                  slot="activator"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >cloud_upload</v-icon>
                    {{ $t('App.menu.addDataSources.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.addDataSources.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  to="ViewDataSources"
                  slot="activator"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >list</v-icon>{{ $t('App.menu.viewDataSources.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.viewDataSources.tooltip')}}</span>
              </v-tooltip>
            </v-list>
          </ul>
        </li>
        <v-list :class="{ disabledMenu: Object.keys($store.state.activePair.source1).length===0,lastMenu: true }">
          <v-tooltip right>
            <v-list-tile
              slot="activator"
              to="view"
              color="white"
              :disabled="Object.keys($store.state.activePair.source1).length===0"
            >
              <v-list-tile-title class="menuText">
                <v-icon
                  left
                  color="black"
                >list</v-icon>{{ $t('App.menu.view.msg')}}
              </v-list-tile-title>
            </v-list-tile>
            <span>{{ $t('App.menu.view.tooltip') }}</span>
          </v-tooltip>
        </v-list>
        <li class="parent">
          <a
            href="#"
            style="margin-left: 15px"
          >
            <v-icon
              left
              color="black"
            >compare_arrows</v-icon>{{ $t('App.menu.reconcile.msg')}} <v-icon
              color="black"
              small
              class="menuArrow"
            >play_arrow</v-icon>
          </a>
          <ul class="child">
            <v-list :class="{ disabledMenu: $store.state.dataSources.length <= 1 || $store.state.dataSourcePairs.length <= 0,lastMenu: true }">
              <v-tooltip right>
                <v-list-tile
                  to="dataSourcesPair"
                  slot="activator"
                  :disabled="$store.state.dataSources.length <= 1 || $store.state.dataSourcePairs.length <= 0"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >filter_2</v-icon>{{ $t('App.menu.createPair.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.createPair.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list :class="{ disabledMenu: Object.keys($store.state.activePair.source1).length === 0,lastMenu: true }">
              <v-tooltip right>
                <v-list-tile
                  to="scores"
                  slot="activator"
                  :disabled='Object.keys($store.state.activePair.source1).length === 0'
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >find_in_page</v-icon>{{ $t('App.menu.reconcile.msg') }}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.reconcile.tooltip') }}</span>
              </v-tooltip>
            </v-list>
            <v-list :class="{ disabledMenu: Object.keys($store.state.activePair.source1).length===0,lastMenu: true }">
              <v-tooltip right>
                <v-list-tile
                  to="recoStatus"
                  slot="activator"
                  :disabled='Object.keys($store.state.activePair.source1).length === 0'
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >dashboard</v-icon> {{ $t('App.menu.recoStatus.msg') }}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.recoStatus.tooltip') }}</span>
              </v-tooltip>
            </v-list>
          </ul>
        </li>
      </ul>
    </li>
    <li class="parent">
      <a href="#">
        <v-icon>location_on</v-icon>{{ $t('App.menu.facilityRegistry.msg')}}
      </a>
      <ul class="child">
        <v-list
          class="lastMenu"
          v-if="tasksVerification.canAdd('AddJurisdiction')"
        >
          <v-tooltip right>
            <v-list-tile
              to="AddJurisdiction"
              slot="activator"
            >
              <v-list-tile-title class="menuText">
                <v-icon
                  left
                  color="black"
                >home_work</v-icon>{{ $t('App.menu.addJurisdiction.msg')}}
              </v-list-tile-title>
            </v-list-tile>
            <span>{{ $t('App.menu.addJurisdiction.tooltip')}}</span>
          </v-tooltip>
        </v-list>
        <v-list
          class="lastMenu"
          v-if="tasksVerification.canAdd('AddFacility')"
        >
          <v-tooltip right>
            <v-list-tile
              to="AddFacility"
              slot="activator"
            >
              <v-list-tile-title class="menuText">
                <v-icon
                  left
                  color="black"
                >house</v-icon>{{ $t('App.menu.addFacility.msg')}}
              </v-list-tile-title>
            </v-list-tile>
            <span>{{ $t('App.menu.addFacility.tooltip')}}</span>
          </v-tooltip>
        </v-list>
        <v-list
          class="lastMenu"
          v-if="tasksVerification.canAdd('AddService')"
        >
          <v-tooltip right>
            <v-list-tile
              to="AddService"
              slot="activator"
            >
              <v-list-tile-title class="menuText">
                <v-icon
                  left
                  color="black"
                >room_service</v-icon>{{ $t('App.menu.addService.msg')}}
              </v-list-tile-title>
            </v-list-tile>
            <span>{{ $t('App.menu.addService.tooltip')}}</span>
          </v-tooltip>
        </v-list>
        <li
          class="parent"
          v-if="tasksVerification.canAdd('AddCodeSystem')"
        >
          <a
            href="#"
            style="margin-left: 15px"
          >
            <v-icon
              left
              color="black"
            >add</v-icon>
            {{ $t('App.menu.healthServiceTerminologies.msg')}}
            <v-icon
              color="black"
              small
              class="menuArrow"
            >play_arrow</v-icon>
          </a>
          <ul class="child">
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  to="/AddCodeSystem?type=serviceCategories&displayText=Service Categorie"
                  slot="activator"
                  v-if="tasksVerification.canAdd('AddCodeSystem')"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >add</v-icon>{{ $t('App.menu.addServiceCategory.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.addServiceCategory.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  to="/AddCodeSystem?type=serviceTypes&displayText=Service Type"
                  slot="activator"
                  v-if="tasksVerification.canAdd('AddCodeSystem')"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >add</v-icon>{{ $t('App.menu.addServiceType.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.addServiceType.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  to="/AddCodeSystem?type=specialties&displayText=Specialty"
                  slot="activator"
                  v-if="tasksVerification.canAdd('AddCodeSystem')"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >add</v-icon>{{ $t('App.menu.addServiceSpecialty.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.addServiceSpecialty.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  to="/AddCodeSystem?type=serviceEligibilities&displayText=Service Eligibility"
                  slot="activator"
                  v-if="tasksVerification.canAdd('AddCodeSystem')"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >add</v-icon>{{ $t('App.menu.addServiceEligibility.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.addServiceEligibility.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  to="/AddCodeSystem?type=languages&displayText=Language"
                  slot="activator"
                  v-if="tasksVerification.canAdd('AddCodeSystem')"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >add</v-icon>{{ $t('App.menu.addLanguage.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.addLanguage.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  to="/AddCodeSystem?type=referralMethods&displayText=Referral Methods"
                  slot="activator"
                  v-if="tasksVerification.canAdd('AddCodeSystem')"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >add</v-icon>{{ $t('App.menu.addReferralMethod.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.addReferralMethod.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  to="/AddCodeSystem?type=programs&displayText=Program"
                  slot="activator"
                  v-if="tasksVerification.canAdd('AddCodeSystem')"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >add</v-icon>{{ $t('App.menu.addProgram.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.addProgram.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  to="/AddCodeSystem?type=serviceCharacteristics&displayText=Service Characteristics"
                  slot="activator"
                  v-if="tasksVerification.canAdd('AddCodeSystem')"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >add</v-icon>{{ $t('App.menu.addCharacteristic.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.addCharacteristic.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  to="/AddCodeSystem?type=serviceProvisionConditions&displayText=Service Provision Condition"
                  slot="activator"
                  v-if="tasksVerification.canAdd('AddCodeSystem')"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >add</v-icon>{{ $t('App.menu.addServiceProvisionCondition.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.addServiceProvisionCondition.tooltip')}}</span>
              </v-tooltip>
            </v-list>
          </ul>
        </li>
        <li class="parent">
          <a href="#">
            <v-icon
              left
              color="black"
            >call_made</v-icon>
            {{ $t('App.menu.facilityRequests.msg')}}
            <v-icon
              color="black"
              small
              class="menuArrow"
            >play_arrow</v-icon>
          </a>
          <ul class="child">
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  v-if="tasksVerification.canAdd('RequestBuildingAddition')"
                  to="RequestBuildingAddition"
                  slot="activator"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >call_made</v-icon>{{ $t('App.menu.requestNewFacility.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.requestNewFacility.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list class="lastMenu">
              <v-tooltip right>
                <v-list-tile
                  v-if="tasksVerification.canAdd('RequestUpdateBuildingDetails')"
                  to="RequestUpdateBuildingDetails"
                  slot="activator"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >call_made</v-icon>{{ $t('App.menu.requestUpdateFacility.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.requestUpdateFacility.tooltip')}}</span>
              </v-tooltip>
            </v-list>
          </ul>
        </li>

        <li class="parent">
          <a href="#">
            <v-icon
              left
              color="black"
            >list</v-icon>
            {{ $t('App.menu.facilityRegReports.msg')}}
            <v-icon
              color="black"
              small
              class="menuArrow"
            >play_arrow</v-icon>
          </a>
          <ul class="child">
            <v-list
              class="lastMenu"
              v-if="tasksVerification.canView('FacilitiesReport')"
            >
              <v-list-tile to="FacilitiesReport">
                <v-list-tile-title class="menuText">
                  <v-icon
                    left
                    color="black"
                  >list</v-icon>{{ $t('App.menu.facilitiesReport.msg')}}
                </v-list-tile-title>
              </v-list-tile>
            </v-list>
            <v-list
              class="lastMenu"
              v-if="tasksVerification.canView('NewFacilitiesRequestsReport')"
            >
              <v-tooltip right>
                <v-list-tile
                  to="NewFacilitiesRequestsReport"
                  slot="activator"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >list</v-icon>{{ $t('App.menu.newFacilitiesRequestsReport.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.newFacilitiesRequestsReport.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list
              class="lastMenu"
              v-if="tasksVerification.canView('FacilitiesUpdateRequestsReport')"
            >
              <v-tooltip right>
                <v-list-tile
                  to="FacilitiesUpdateRequestsReport"
                  slot="activator"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >list</v-icon>{{ $t('App.menu.facilitiesUpdateRequestsReport.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.facilitiesUpdateRequestsReport.tooltip')}}</span>
              </v-tooltip>
            </v-list>
            <v-list
              class="lastMenu"
              v-if="tasksVerification.canView('ServicesReport')"
            >
              <v-list-tile to="ServicesReport">
                <v-list-tile-title class="menuText">
                  <v-icon
                    left
                    color="black"
                  >list</v-icon>{{ $t('App.menu.servicesReport.msg')}}
                </v-list-tile-title>
              </v-list-tile>
            </v-list>
            <v-list
              class="lastMenu"
              v-if="tasksVerification.canView('FacilitiesReport')"
            >
              <v-tooltip right>
                <v-list-tile
                  to="History"
                  slot="activator"
                >
                  <v-list-tile-title class="menuText">
                    <v-icon
                      left
                      color="black"
                    >list</v-icon>{{ $t('App.menu.historyReport.msg')}}
                  </v-list-tile-title>
                </v-list-tile>
                <span>{{ $t('App.menu.historyReport.tooltip')}}</span>
              </v-tooltip>
            </v-list>
          </ul>
        </li>
      </ul>
    </li>
    <li class="parent">
      <a href="#">
        <v-icon>perm_identity</v-icon>{{ $t('App.menu.account.msg')}}
      </a>
      <ul class="child">
        <v-list class="lastMenu">
          <v-tooltip right>
            <v-list-tile
              to="addUser"
              slot="activator"
              v-if='$store.state.auth.role === "Admin"'
            >
              <v-list-tile-title class="menuText">
                <v-icon
                  left
                  color="black"
                >perm_identity</v-icon>{{ $t('App.menu.addUser.msg')}}
              </v-list-tile-title>
            </v-list-tile>
            <span>{{ $t('App.menu.addUser.tooltip')}}</span>
          </v-tooltip>
        </v-list>
        <v-list class="lastMenu">
          <v-tooltip right>
            <v-list-tile
              to="usersList"
              slot="activator"
              v-if='$store.state.auth.role === "Admin"'
            >
              <v-list-tile-title class="menuText">
                <v-icon
                  left
                  color="black"
                >perm_identity</v-icon>{{ $t('App.menu.usersList.msg')}}
              </v-list-tile-title>
            </v-list-tile>
            <span>{{ $t('App.menu.usersList.tooltip')}}</span>
          </v-tooltip>
        </v-list>
        <v-list class="lastMenu">
          <v-tooltip right>
            <v-list-tile
              to="rolesManagement"
              slot="activator"
              v-if='$store.state.auth.role === "Admin"'
            >
              <v-list-tile-title class="menuText">
                <v-icon
                  left
                  color="black"
                >perm_identity</v-icon>{{ $t('App.menu.rolesManagement.msg')}}
              </v-list-tile-title>
            </v-list-tile>
            <span>{{ $t('App.menu.rolesManagement.tooltip')}}</span>
          </v-tooltip>
        </v-list>
        <v-list class="lastMenu">
          <v-list-tile to="changePassword">
            <v-list-tile-title class="menuText">
              <v-icon
                left
                color="black"
              >perm_identity</v-icon>{{ $t('App.menu.changePassword.msg')}}
            </v-list-tile-title>
          </v-list-tile>
        </v-list>
      </ul>
    </li>
    <li class="parent">
      <v-list-tile
        to="configure"
        slot="activator"
        v-if='!$store.state.denyAccess'
        class="newClass"
      >
        <v-icon>settings</v-icon> {{ $t('App.menu.configure.msg') }}
      </v-list-tile>
    </li>
    <li class="parent">
      <v-list-tile
        to="logout"
        slot="activator"
        v-if='!$store.state.denyAccess && !$store.state.config.generalConfig.authDisabled'
        class="newClass"
      >
        <v-list-tile-title>
          <v-icon>logout</v-icon> {{ $t('App.menu.logout.msg') }}
        </v-list-tile-title>
      </v-list-tile>
    </li>
  </ul>
</template>
<script>
import {
  tasksVerification
} from '@/modules/tasksVerification'
export default {
  data () {
    return {
      tasksVerification: tasksVerification
    }
  }
}
</script>
<style scoped>
.parent {
  display: block;
  position: relative;
  float: left;
  line-height: 63px;
  border-right: #ccc 1px solid;
  font-size: 16px;
}

.newClass {
  margin: 8px;
  color: #ffffff;
  font-size: 12px;
}

.parent a {
  margin: 10px;
  color: #ffffff;
  text-decoration: none;
}

.parent:hover > ul {
  display: block;
  position: absolute;
}

.child {
  display: none;
  cursor: pointer;
}

.child li {
  background-color: white;
  line-height: 63px;
  border-bottom: #ccc 1px solid;
  border-right: #ccc 1px solid;
  width: 100%;
}

.child li a {
  color: #000000;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0px;
  min-width: 15em;
}

ul ul ul {
  left: 100%;
  top: 0;
  margin-left: 1px;
}

li:hover {
  background-color: #95b4ca;
}

.lastMenu:hover {
  background-color: #f0f0f0 !important;
}

.parent li:hover {
  background-color: #f0f0f0;
}

.expand {
  font-size: 12px;
  float: right;
  margin-right: 5px;
}

.lastMenu {
  background-color: white !important;
  border-right: #ccc 1px solid;
  border-bottom: #ccc 1px solid;
}

.menuText {
  color: black;
}

.menuArrow {
  float: right;
  margin-top: 25px;
}

.disabledMenu {
  cursor: auto;
}

.disabledMenu:hover {
  background-color: white !important;
}

a:active {
  color: red !important;
}
</style>