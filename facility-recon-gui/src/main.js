// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import Vuetify from 'vuetify'
import Vuelidate from 'vuelidate'
import 'vuetify/dist/vuetify.min.css'
import axios from 'axios'
import {
  store
} from './store/store'
import i18n from './i18n'
const backendServer = process.env.BACKEND_SERVER

Vue.use(Vuelidate)
Vue.use(Vuetify, {
  theme: {
    primary: '#3F51B5',
    secondary: '#7986CB',
    accent: '#9c27b0',
    error: '#f44336',
    warning: '#ffeb3b',
    info: '#2196f3',
    success: '#4caf50'
  }
})

Vue.config.productionTip = false

export const eventBus = new Vue()
/* eslint-disable no-new */
// get general config of App and pass it to the App component as props
let defaultGenerConfig = JSON.stringify(store.state.config.generalConfig)
axios.get(backendServer + '/getGeneralConfig?defaultGenerConfig=' + defaultGenerConfig).then(genConfig => {
  if (!genConfig) {
    genConfig.data = {}
  }
  new Vue({
    el: '#app',
    router,
    store,

    components: {
      App
    },
    data () {
      return {
        config: genConfig.data
      }
    },

    i18n,
    template: '<App :generalConfig="config" />'
  })
})
