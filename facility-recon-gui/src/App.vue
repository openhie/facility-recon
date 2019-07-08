<template>
  <v-app>
    <v-toolbar
      color="primary"
      dark
      app
    >
      <v-toolbar-title v-text="title"></v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-items v-if="$store.state.auth.token || $store.state.config.generalConfig.authDisabled">
        <v-btn
          flat
          :href="dhisLink"
          v-if='dhisLink'
        >
          <img src="./assets/dhis2.png" />
        </v-btn>
        <v-menu
          open-on-hover
          bottom
          offset-y
          v-if='!$store.state.denyAccess'
        >
          <v-btn
            slot="activator"
            flat
          >
            <v-icon>sync</v-icon>{{ $t('App.menu.dataSourcesParent.msg')}}
          </v-btn>
          <v-list>
            <v-list-tile to="AddDataSources">
              <v-list-tile-title>
                <v-icon>compare_arrows</v-icon>{{ $t('App.menu.addDataSources.msg')}}
              </v-list-tile-title>
            </v-list-tile>
            <v-list-tile to="ViewDataSources">
              <v-list-tile-title>
                <v-icon>list</v-icon>{{ $t('App.menu.viewDataSources.msg')}}
              </v-list-tile-title>
            </v-list-tile>
          </v-list>
        </v-menu>
        <v-tooltip bottom>
          <v-btn
            to="view"
            flat
            v-if='!$store.state.denyAccess'
            slot="activator"
            :disabled="Object.keys($store.state.activePair.source1).length === 0"
          >
            <v-icon>list</v-icon>{{ $t('App.menu.view.msg')}}
          </v-btn>
          <span>{{ $t('App.menu.view.tooltip') }}</span>
        </v-tooltip>
        <v-menu
          open-on-hover
          bottom
          offset-y
          v-if='!$store.state.denyAccess'
        >
          <v-btn
            slot="activator"
            flat
          >
            <v-icon>find_in_page</v-icon>{{ $t('App.menu.recoParent.msg')}}
          </v-btn>
          <v-list>
            <v-tooltip top>
              <v-list-tile
                to="dataSourcesPair"
                slot="activator"
                v-if="$store.state.dataSources.length > 1 || $store.state.dataSourcePairs.length > 0"
              >
                <v-list-tile-title>
                  <v-icon>compare_arrows</v-icon>{{ $t('App.menu.createPair.msg')}}
                </v-list-tile-title>
              </v-list-tile>
              <v-list-tile
                to="dataSourcesPair"
                slot="activator"
                disabled
                v-else
              >
                <v-list-tile-title>
                  <v-icon>compare_arrows</v-icon>{{ $t('App.menu.createPair.msg')}}
                </v-list-tile-title>
              </v-list-tile>
              <span>{{ $t('App.menu.createPair.tooltip')}}</span>
            </v-tooltip>
            <v-tooltip top>
              <v-list-tile
                to="scores"
                slot="activator"
                disabled
                v-if='Object.keys($store.state.activePair.source1).length === 0'
              >
                <v-list-tile-title>
                  <v-icon>find_in_page</v-icon>{{ $t('App.menu.reconcile.msg') }}
                </v-list-tile-title>
              </v-list-tile>
              <v-list-tile
                to="scores"
                slot="activator"
                v-else
              >
                <v-list-tile-title>
                  <v-icon>find_in_page</v-icon>{{ $t('App.menu.reconcile.msg') }}
                </v-list-tile-title>
              </v-list-tile>
              <span>{{ $t('App.menu.reconcile.tooltip') }}</span>
            </v-tooltip>
            <v-tooltip bottom>
              <v-list-tile
                to="recoStatus"
                slot="activator"
                disabled
                v-if='Object.keys($store.state.activePair.source1).length === 0'
              >
                <v-list-tile-title>
                  <v-icon>dashboard</v-icon> {{ $t('App.menu.recoStatus.msg') }}
                </v-list-tile-title>
              </v-list-tile>
              <v-list-tile
                to="recoStatus"
                slot="activator"
                v-else
              >
                <v-list-tile-title>
                  <v-icon>dashboard</v-icon> {{ $t('App.menu.recoStatus.msg') }}
                </v-list-tile-title>
              </v-list-tile>
              <span>{{ $t('App.menu.recoStatus.tooltip') }}</span>
            </v-tooltip>
            <v-tooltip bottom>
              <v-list-tile
                to="dbAdmin"
                slot="activator"
              >
                <v-list-tile-title>
                  <v-icon>archive</v-icon> {{ $t('App.menu.archive.msg') }}
                </v-list-tile-title>
              </v-list-tile>
              <span>{{ $t('App.menu.archive.tooltip') }}</span>
            </v-tooltip>
          </v-list>
        </v-menu>
        <v-menu
          open-on-hover
          bottom
          offset-y
          v-if='!$store.state.denyAccess'
        >
          <v-btn
            slot="activator"
            flat
          >
            <v-icon>perm_identity</v-icon>{{ $t('App.menu.account.msg')}}
          </v-btn>
          <v-list>
            <v-tooltip top>
              <v-list-tile
                to="addUser"
                slot="activator"
                v-if='$store.state.auth.role === "Admin"'
              >
                <v-list-tile-title>
                  <v-icon>perm_identity</v-icon>{{ $t('App.menu.addUser.msg')}}
                </v-list-tile-title>
              </v-list-tile>
              <span>{{ $t('App.menu.addUser.tooltip')}}</span>
            </v-tooltip>
            <v-tooltip bottom>
              <v-list-tile
                to="usersList"
                slot="activator"
                v-if='$store.state.auth.role === "Admin"'
              >
                <v-list-tile-title>
                  <v-icon>perm_identity</v-icon>{{ $t('App.menu.usersList.msg')}}
                </v-list-tile-title>
              </v-list-tile>
              <span>{{ $t('App.menu.usersList.tooltip')}}</span>
            </v-tooltip>
            <v-list-tile to="changePassword">
              <v-list-tile-title>
                <v-icon>perm_identity</v-icon>{{ $t('App.menu.changePassword.msg')}}
              </v-list-tile-title>
            </v-list-tile>
          </v-list>
        </v-menu>
        <v-btn
          flat
          to="configure"
          v-if='!$store.state.denyAccess'
        >
          <v-icon>settings</v-icon> {{ $t('App.menu.configure.msg') }}
        </v-btn>
        <v-btn
          flat
          to="logout"
          v-if='!$store.state.denyAccess && !$store.state.config.generalConfig.authDisabled'
        >
          <v-icon>logout</v-icon> {{ $t('App.menu.logout.msg') }}
        </v-btn>
      </v-toolbar-items>
      <v-spacer></v-spacer>
      <v-toolbar-items>

      </v-toolbar-items>
    </v-toolbar>
    <v-content>
      <v-dialog
        v-model="$store.state.dynamicProgress"
        persistent
        width="300"
      >
        <v-card
          color="primary"
          dark
        >
          <v-card-text>
            {{$store.state.progressTitle}}
            <v-progress-linear
              indeterminate
              color="white"
              class="mb-0"
            ></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog
        persistent
        v-model="$store.state.dialogError"
        max-width="500px"
      >
        <v-card>
          <v-toolbar
            :color="$store.state.errorColor"
            dark
          >
            <v-toolbar-title>
              {{$store.state.errorTitle}}
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn
              icon
              dark
              @click.native="$store.state.dialogError = false"
            >
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-text>
            {{$store.state.errorDescription}}
          </v-card-text>
          <v-card-actions>
            <v-btn
              color="primary"
              @click.native="closeDialogError"
            >Ok</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="$store.state.initializingApp"
        persistent
        width="300"
      >
        <v-card
          color="primary"
          dark
        >
          <v-card-text>
            {{ $t('App.initApp') }}
            <v-progress-linear
              indeterminate
              color="white"
              class="mb-0"
            ></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-layout
        row
        wrap
      >
        <v-flex xs6>
          <template v-if="Object.keys($store.state.activePair.source1).length > 0 && !$store.state.denyAccess">
            {{ $t('App.source') }} 1: <b>{{$store.state.activePair.source1.name}}</b>, &nbsp; &nbsp; {{ $t('App.source') }} 2: <b>{{$store.state.activePair.source2.name}}</b>,
            &nbsp; &nbsp; Recon Status: <v-icon
              small
              v-if="$store.state.recoStatus === 'in-progress'"
            >lock_open</v-icon>
            <v-icon
              small
              v-else
            >lock</v-icon> <b>{{$store.state.recoStatus}}</b>
          </template>
        </v-flex>
        <v-spacer></v-spacer>
        <v-flex xs1>
          <v-select
            :items="locales"
            v-model="locale"
          ></v-select>
        </v-flex>
      </v-layout>
      <router-view />
    </v-content>
    <v-footer
      dark
      color="primary"
      :fixed="fixed"
      app
    >

    </v-footer>
  </v-app>
</template>
<script>
import axios from 'axios'
import { scoresMixin } from './mixins/scoresMixin'
import { generalMixin } from './mixins/generalMixin'
import { dataSourcePairMixin } from './components/DataSourcesPair/dataSourcePairMixin'
import { eventBus } from './main'
import { uuid } from 'vue-uuid'
import VueCookies from 'vue-cookies'
const backendServer = process.env.BACKEND_SERVER

export default {
  mixins: [dataSourcePairMixin, scoresMixin, generalMixin],
  props: ['generalConfig'],
  data () {
    return {
      fixed: false,
      title: this.$t('App.title'),
      locale: 'en',
      locales: [
        { text: 'English', value: 'en' },
        { text: 'French', value: 'fr' }
      ],
      activeDataSourcePair: {}
    }
  },
  watch: {
    locale (val) {
      this.$i18n.locale = val
    }
  },
  methods: {
    closeDialogError () {
      this.$store.state.errorColor = 'primary'
      this.$store.state.dialogError = false
    },
    renderInitialPage () {
      let source1 = this.$store.state.activePair.source1.name
      let source2 = this.$store.state.activePair.source2.name
      if (
        (!source1 || !source2) &&
        (this.$store.state.dataSources.length > 1 ||
          this.$store.state.dataSourcePairs.length > 0)
      ) {
        this.$router.push({ name: 'DataSourcesPair' })
        return
      }
      if (!source1 || !source2) {
        this.$router.push({ name: 'AddDataSources' })
        return
      }
      source1 = this.toTitleCase(source1)
      source2 = this.toTitleCase(source2)

      let sourcesOwner = this.getDatasourceOwner()
      axios
        .get(
          backendServer +
          '/uploadAvailable/' +
          source1 +
          '/' +
          source2 +
          '/' +
          sourcesOwner.source1Owner +
          '/' +
          sourcesOwner.source2Owner
        )
        .then(results => {
          this.$store.state.initializingApp = false
          if (results.data.dataUploaded) {
            this.$store.state.recalculateScores = true
            this.$router.push({ name: 'FacilityReconScores' })
          } else {
            this.$router.push({ name: 'AddDataSources' })
          }
        })
        .catch(err => {
          console.log(err)
          this.$router.push({ name: 'AddDataSources' })
        })
    },
    getTotalLevels () {
      let source1 = this.$store.state.activePair.source1.name
      let source2 = this.$store.state.activePair.source2.name
      if (!source1 || !source2) {
        this.$store.state.totalSource1Levels = 5
        this.$store.state.totalSource2Levels = 5
        this.$store.state.initializingApp = false
        this.renderInitialPage()
        this.$store.state.recoLevel = 2
        this.getRecoStatus()
        return
      }
      source1 = this.toTitleCase(source1)
      source2 = this.toTitleCase(source2)
      let sourcesOwner = JSON.stringify(this.getDatasourceOwner())
      let sourcesLimitOrgId = JSON.stringify(this.getLimitOrgIdOnActivePair())
      axios
        .get(backendServer + '/countLevels/' + source1 + '/' + source2 + '/' + sourcesOwner + '/' + sourcesLimitOrgId)
        .then(levels => {
          this.$store.state.levelMapping.source1 = levels.data.levelMapping.levelMapping1
          this.$store.state.levelMapping.source2 = levels.data.levelMapping.levelMapping2
          this.$store.state.totalSource1Levels = levels.data.totalSource1Levels
          this.$store.state.totalSource2Levels = levels.data.totalSource2Levels
          this.$store.state.recoLevel = 2
          this.renderInitialPage()
          this.getRecoStatus()
        }).catch((err) => {
          console.log(err)
          this.$store.state.recoLevel = 2
          this.renderInitialPage()
          this.getRecoStatus()
        })
    },
    getRecoStatus () {
      if (
        Object.keys(this.$store.state.activePair.source1).length === 0 ||
        Object.keys(this.$store.state.activePair.source2).length === 0
      ) {
        return
      }
      let source1 = this.toTitleCase(this.$store.state.activePair.source1.name)
      let source2 = this.toTitleCase(this.$store.state.activePair.source2.name)
      let userID = this.$store.state.activePair.userID._id
      axios
        .get(
          backendServer +
          '/recoStatus/' +
          source1 +
          '/' +
          source2 +
          '/' +
          userID
        )
        .then(status => {
          if (status.data.status) {
            this.$store.state.recoStatus = status.data.status
          } else {
            axios
              .get(
                backendServer +
                '/markRecoUnDone/' +
                source1 +
                '/' +
                source2 +
                '/' +
                userID
              )
              .then(status => {
                if (status.data.status) {
                  this.$store.state.recoStatus = status.data.status
                }
              })
              .catch(err => {
                console.log(err.response.data.error)
              })
          }
        })
        .catch(err => {
          console.log(err.response.data.error)
        })
    },
    getDataSources () {
      this.$store.state.loadingServers = true
      this.$store.state.dataSources = []
      let userID = this.$store.state.auth.userID
      let role = this.$store.state.auth.role
      let orgId = this.$store.state.dhis.user.orgId
      axios
        .get(backendServer + '/getDataSources/' + userID + '/' + role + '/' + orgId)
        .then(response => {
          this.$store.state.loadingServers = false
          this.$store.state.dataSources = response.data.servers
          this.getDataSourcePair()
        })
        .catch(err => {
          this.$store.state.loadingServers = false
          console.log(JSON.stringify(err))
        })
    },
    getUserConfig () {
      let userID = this.$store.state.auth.userID
      axios
        .get(backendServer + '/getUserConfig/' + userID)
        .then(config => {
          if (config.data) {
            this.$store.state.config.userConfig = { ...this.$store.state.config.userConfig, ...config.data }
          }
          this.getGeneralConfig(() => {
            this.getDataSources()
          })
        })
        .catch(() => {
          this.getGeneralConfig(() => {
            this.getDataSources()
          })
        })
    },
    getDataSourcePair () {
      this.$store.state.activePair.source1 = {}
      this.$store.state.activePair.source2 = {}
      let userID = this.$store.state.auth.userID
      axios
        .get(backendServer + '/getDataSourcePair/' + userID + '/' + this.$store.state.dhis.user.orgId)
        .then(response => {
          this.$store.state.dataSourcePairs = response.data
          let activeSource = this.getActiveDataSourcePair()
          if (Object.keys(activeSource).length > 0) {
            this.$store.state.activePair.source1.id = activeSource.source1._id
            this.$store.state.activePair.source1.name = activeSource.source1.name
            this.$store.state.activePair.source1.userID = activeSource.source1.userID
            this.$store.state.activePair.source2.id = activeSource.source2._id
            this.$store.state.activePair.source2.name = activeSource.source2.name
            this.$store.state.activePair.source2.userID = activeSource.source2.userID
            this.$store.state.activePair._id = activeSource._id
            this.$store.state.activePair.shared = activeSource.shared
            this.$store.state.activePair.userID = activeSource.userID
          }
          this.autoActivateDatasourcePair((created) => {
            if (!created) {
              this.autoCreateDatasourcePair()
            }
          })
          this.getTotalLevels()
        })
        .catch(err => {
          console.log(JSON.stringify(err))
          this.$store.state.dialogError = true
          this.$store.state.errorTitle = 'Error'
          this.$store.state.errorDescription = 'An error occured while getting data source pairs, reload the app to retry'
          this.getTotalLevels()
        })
    },
    autoCreateDatasourcePair () {
      if (this.$store.state.config.generalConfig.reconciliation.singleDataSource) {
        if (Object.keys(this.$store.state.activePair.source1).length > 0) {
          return false
        }
        if (this.$store.state.dataSources.length > 2) {
          return false
        }
        let fixedSource2To = this.$store.state.config.generalConfig.reconciliation.fixSource2To
        let source1 = {}
        let source2 = {}
        for (let source of this.$store.state.dataSources) {
          if (source._id === fixedSource2To) {
            source2 = source
          } else {
            source1 = source
          }
        }
        if (Object.keys(source1).length === 0 || Object.keys(source2).length === 0) {
          return false
        }
        this.createDatasourcePair(source1, source2)
      }
    },
    autoActivateDatasourcePair (callback) {
      if (Object.keys(this.$store.state.activePair.source1).length > 0) {
        let val = false
        return callback(val)
      }
      if (this.$store.state.dataSourcePairs.length > 1 || this.$store.state.dataSourcePairs.length === 0) {
        let val = false
        return callback(val)
      }
      if (this.$store.state.dhis.user.orgId && this.$store.state.config.generalConfig.reconciliation.singlePair) {
        this.$store.state.dataSourcePairs.status = 'active'
        this.activeDataSourcePair = this.$store.state.dataSourcePairs[0]
        let val = true
        callback(val)
        this.activatePair()
      }
    }
  },
  computed: {
    dhisLink () {
      if (this.$store.state.dhis.user.orgId) {
        return window.location.protocol + '//' + window.location.hostname
      } else {
        return false
      }
    }
  },
  created () {
    this.$router.push({ name: 'AddDataSources' })
    this.$store.state.config.generalConfig = this.generalConfig
    if (VueCookies.get('token') && VueCookies.get('userID')) {
      this.$store.state.auth.token = VueCookies.get('token')
      this.$store.state.auth.userID = VueCookies.get('userID')
      this.$store.state.auth.username = VueCookies.get('username')
      this.$store.state.auth.role = VueCookies.get('role')
      this.$store.state.signupFields = VueCookies.get('signupFields')
      this.$store.state.customSignupFields = VueCookies.get(
        'customSignupFields'
      )
      if (!this.$store.state.config.generalConfig.authDisabled) {
        axios.get(backendServer + '/isTokenActive/').then(response => {
          // will come here only if the token is active
          this.$store.state.clientId = uuid.v4()
          this.$store.state.initializingApp = true
          this.$store.state.denyAccess = false
          this.getUserConfig()
        })
      } else {
        this.$router.push('login')
      }
    }

    eventBus.$on('refreshApp', () => {
      this.getDataSources()
    })
    eventBus.$on('recalculateScores', () => {
      this.$store.state.recalculateScores = true
      this.$router.push({ name: 'FacilityReconScores' })
    })
    eventBus.$on('getDataSources', () => {
      this.getDataSources()
    })
    eventBus.$on('getConfig', () => {
      this.getUserConfig()
    })
    eventBus.$on('getGeneralConfig', () => {
      this.getGeneralConfig()
    })
    eventBus.$on('getDataSourcePair', () => {
      this.getDataSourcePair()
    })
  },
  name: 'App'
}
</script>
