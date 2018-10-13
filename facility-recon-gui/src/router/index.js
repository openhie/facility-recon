import Vue from 'vue'
import Router from 'vue-router'
import FacilityReconUpload from '@/components/DataSync/FacilityReconUpload'
import FacilityReconView from '@/components/FacilityReconView'
import FacilityReconScores from '@/components/FacilityReconScores'
import FacilityRecoStatus from '@/components/FacilityRecoStatus'
import FacilityReconDbAdmin from '@/components/FacilityReconDbAdmin'
import FacilityReconDataSync from '@/components/DataSync/FacilityReconDataSync'
import FacilityReconDataSourcePair from '@/components/DataSources/FacilityReconDataSourcePair'

Vue.use(Router)

export default new Router({
  routes: [{
    path: '/',
    name: 'FacilityReconHome',
    component: FacilityReconScores
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
