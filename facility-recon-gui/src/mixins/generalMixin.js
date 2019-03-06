export const generalMixin = {
  methods: {
    toTitleCase (str) {
      return str.toLowerCase().split(' ').map(word => word.replace(word[0], word[0].toUpperCase())).join('')
    },
    translateDataHeader (source, level) {
      if (!this.$store.state.config.userConfig.reconciliation.useCSVHeader) {
        return 'Level ' + level
      }
      if (this.$store.state.levelMapping[source]) {
        let levelValue = this.$store.state.levelMapping[source]['level' + level]
        if (levelValue && levelValue !== 'null' && levelValue !== 'undefined' && levelValue !== 'false') {
          return levelValue
        } else {
          return this.$store.state.levelMapping[source]['facility']
        }
      } else {
        return 'Level ' + level
      }
    },
    getDatasourceOwner () {
      let dtSrc1 = this.$store.state.dataSources.find((dtSrc) => {
        return dtSrc._id === this.$store.state.activePair.source1.id
      })
      let dtSrc2 = this.$store.state.dataSources.find((dtSrc) => {
        return dtSrc._id === this.$store.state.activePair.source2.id
      })
      return {
        source1Owner: dtSrc1.userID._id,
        source2Owner: dtSrc2.userID._id
      }
    }
  }
}
