<template>
  <v-container grid-list-xs>
    <v-dialog
      v-model="datasetLimit"
      scrollable
      persistent
      :overlay="false"
      max-width="770px"
      transition="dialog-transition"
    >
      <v-card>
        <v-toolbar
          color="error"
          dark
        >
          <v-toolbar-title>
            <v-icon>info</v-icon> Datasets limit Warning
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon
            dark
            @click.native="datasetLimit = false"
          >
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          You cant add more datasets as you have reached the datasets limit, contact system administrator for help
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            @click.native="datasetLimit = false"
          >Ok</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script>
export default {
  props: ['datasetLimitWarn'],
  computed: {
    datasetLimit: {
      get () {
        return this.datasetLimitWarn
      },
      set (newVal) {
        this.$emit('limitWarnStateChange', newVal)
      }
    }
  }
}
</script>
