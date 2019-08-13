import Vue from 'vue'
import Router from 'vue-router'
import Login from '@/components/Login.vue'
import Signup from '@/components/Signup.vue'
import Configure from '@/components/Configure.vue'
import Logout from '@/components/Logout.vue'
import UsersList from '@/components/UsersList.vue'
import AddUser from '@/components/AddUser.vue'
import ChangePassword from '@/components/ChangePassword.vue'
import FacilityReconView from '@/components/FacilityReconView'
import FacilityReconScores from '@/components/FacilityReconScores'
import FacilityRecoStatus from '@/components/FacilityRecoStatus'
import FacilityReconDbAdmin from '@/components/FacilityReconDbAdmin'
import AddDataSources from '@/components/DataSources/AddDataSources'
import ViewDataSources from '@/components/DataSources/ViewDataSources'
import DataSourcesPair from '@/components/DataSourcesPair/FacilityReconDataSourcePair'
import DHIS2Auth from '@/components/disabledAuth/DHIS2Auth'
import AddJurisdiction from '@/components/FacilityRegistry/AddJurisdiction'
import AddFacility from '@/components/FacilityRegistry/AddFacility'
import VueCookies from 'vue-cookies'
import {
  store
} from '../store/store.js'

Vue.use(Router)

let router = new Router({
  routes: [{
    path: '/',
    name: 'FacilityReconHome',
    component: FacilityReconScores
  },
  {
    path: '/addUser',
    name: 'AddUser',
    component: AddUser
  },
  {
    path: '/UsersList',
    name: 'UsersList',
    component: UsersList
  },
  {
    path: '/ChangePassword',
    name: 'ChangePassword',
    component: ChangePassword
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: 'dhis2Auth',
    name: 'DHIS2Auth',
    component: DHIS2Auth
  },
  {
    path: '/Signup',
    name: 'Signup',
    component: Signup
  },
  {
    path: '/Configure',
    name: 'Configure',
    component: Configure
  },
  {
    path: '/logout',
    name: 'Logout',
    component: Logout
  },
  {
    path: '/ViewDataSources',
    name: 'ViewDataSources',
    component: ViewDataSources
  },
  {
    path: '/AddDataSources',
    name: 'AddDataSources',
    component: AddDataSources
  },
  {
    path: '/dataSourcesPair',
    name: 'DataSourcesPair',
    component: DataSourcesPair
  },
  {
    path: '/view',
    name: 'FacilityReconView',
    component: FacilityReconView
  },
  {
    path: '/scores',
    name: 'FacilityReconScores',
    component: FacilityReconScores
  },
  {
    path: '/recoStatus',
    name: 'FacilityRecoStatus',
    component: FacilityRecoStatus
  },
  {
    path: '/dbAdmin',
    name: 'FacilityReconDbAdmin',
    component: FacilityReconDbAdmin
  },
  {
    path: '/AddJurisdiction',
    name: 'AddJurisdiction',
    component: AddJurisdiction
  },
  {
    path: '/AddFacility',
    name: 'AddFacility',
    component: AddFacility
  }
  ]
})

router.beforeEach((to, from, next) => {
  if (!store.state.auth.token &&
    (!VueCookies.get('token') || VueCookies.get('token') === 'null' || !VueCookies.get('userID') || VueCookies.get('userID') === 'null')
  ) {
    if (to.path !== '/Login' && to.path !== '/Signup' && !store.state.config.generalConfig.authDisabled) {
      next({
        path: '/Login'
      })
    } else {
      return next()
    }
  } else {
    next()
  }
})

export default router
