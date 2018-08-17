<template>
  <v-container fluid>
    <v-layout row wrap>
      <v-spacer></v-spacer>
      <v-flex xs2>
        <v-subheader>Select Source</v-subheader>
      </v-flex>
      <v-flex xs2>
        <v-select :items="dataSources" item-text='text' item-value='value' @change="sourceSelected" />
      </v-flex>
      <v-spacer></v-spacer>
    </v-layout>
    <v-layout>
      <v-flex>
        <component :is="selectedComponent" />
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import FacilityReconUpload from './DataSync/FacilityReconUpload'
import FacilityReconDHIS from './DataSync/FacilityReconDHIS'
export default {
  data () {
    return {
      selectedComponent: '',
      dataSources: [
        { text: 'Upload', value: 'upload' },
        { text: 'DHIS2', value: 'dhis' },
        { text: 'FHIR Server', value: 'fhir' }
      ]
    }
  },
  methods: {
    sourceSelected (selection) {
      if (selection === 'upload') {
        this.selectedComponent = 'FacilityReconUpload'
      } else if (selection === 'dhis') {
        this.selectedComponent = 'FacilityReconDHIS'
      }
    }
  },
  components: {
    'FacilityReconUpload': FacilityReconUpload,
    'FacilityReconDHIS': FacilityReconDHIS
  }
}
</script>