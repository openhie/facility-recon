import Vue from 'vue'
import Router from 'vue-router'
import FacilityReconUpload from '@/components/DataSync/FacilityReconUpload'
import Login from '@/components/Login.vue'
import Logout from '@/components/Logout.vue'
import AddUser from '@/components/AddUser.vue'
import FacilityReconView from '@/components/FacilityReconView'
import FacilityReconScores from '@/components/FacilityReconScores'
import FacilityRecoStatus from '@/components/FacilityRecoStatus'
import FacilityReconDbAdmin from '@/components/FacilityReconDbAdmin'
import FacilityReconDataSync from '@/components/DataSync/FacilityReconDataSync'
import FacilityReconDataSourcePair from '@/components/DataSources/FacilityReconDataSourcePair'
import {store} from '../store/store.js'
import VueCookies from 'vue-cookies'

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
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/logout',
    name: 'Logout',
    component: Logout
  },
  {
    path: '/upload',
    name: 'FacilityReconUpload',
    component: FacilityReconUpload
  },
  {
    path: '/dataSync',
    name: 'FacilityReconDataSync',
    component: FacilityReconDataSync
  },
  {
    path: '/dataSourcePair',
    name: 'FacilityReconDataSourcePair',
    component: FacilityReconDataSourcePair
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
  }
  ]
})

router.beforeEach((to, from, next) => {
  if (!store.state.auth.token && !VueCookies.get('token')) {
    if (to.path !== '/Login') {
      next({
        path: '/Login'
      })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
