<template>
  <v-app>
    <v-toolbar
      color="primary" dark
      app
    >
      <v-toolbar-title v-text="title"></v-toolbar-title>
      <v-toolbar-items>
        <v-btn to="/" flat>Home</v-btn>
        <v-btn to="upload" flat>Upload</v-btn>
        <v-btn to="view" flat>View</v-btn>
        <v-btn flat>Reconcile</v-btn>
      </v-toolbar-items>
    </v-toolbar>
    <v-content>
      <router-view/>
    </v-content>
    <v-footer dark color="primary" :fixed="fixed" app>
      <span>&copy; 2018</span>
    </v-footer>
  </v-app>
</template>

<script>
import axios from 'axios'
export default {
  data () {
    return {
      fixed: false,
      title: 'Facility Reconciliation'
    }
  },
  methods: {
    getOrgHierarchy(){
      //lZsCb6y0KDX Malawi
      axios.get('http://localhost:3000/hierarchy/PqlFzhuPcF1').then((hierarchy)=>{
        this.$store.state.datimHierarchy = hierarchy
      })
    }
  },  
  created() {
    this.getOrgHierarchy()
  },
  name: 'App'
}
</script>
