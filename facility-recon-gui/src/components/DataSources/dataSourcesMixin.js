import {
  eventBus
} from '../../main'
import axios from 'axios'
const backendServer = process.env.BACKEND_SERVER
export const dataSourcesMixin = {
  data () {
    return {
      name: '',
      host: '',
      username: '',
      password: '',
      sourceType: '',
      limitShareByOrgId: false,
      shareWithAll: false,
      shareToSameOrgid: true,
      invalidCharacters: ['"', '/', '\\', '.']
    }
  },
  methods: {
    sharingOptions () {
      if (this.shareWithAll) {
        this.shareToSameOrgid = false
      }
    },
    addDataSource (source) {
      let formData = new FormData()
      const clientId = this.$store.state.clientId
      formData.append('host', this.host)
      formData.append('sourceType', this.sourceType)
      formData.append('source', source)
      formData.append('orgId', this.$store.state.dhis.user.orgId)
      formData.append('shareToSameOrgid', this.shareToSameOrgid)
      formData.append('shareToAll', this.shareWithAll)
      formData.append('limitByUserLocation', this.limitShareByOrgId)
      formData.append('username', this.username)
      formData.append('password', this.password)
      formData.append('name', this.name)
      formData.append('clientId', clientId)
      formData.append('userID', this.$store.state.auth.userID)

      var serverExists = this.$store.state.dataSources.find((dataSource) => {
        return dataSource.host === this.host
      })
      axios.post(backendServer + '/addDataSource', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((response) => {
        eventBus.$emit('dataSourceSaved')
        eventBus.$emit('dataSourceAddedSuccessfully')
        eventBus.$emit('getDataSources')
        if (serverExists) {
          serverExists.name = this.name
          serverExists.username = this.username
          serverExists.password = response.data.password
          serverExists.sourceType = this.sourceType
        } else {
          this.$store.state.dataSources.push({
            name: this.name,
            host: this.host,
            sourceType: this.sourceType,
            source: 'syncServer',
            username: this.username,
            password: response.data.password
          })
        }
      }).catch((err) => {
        console.log(err)
        eventBus.$emit('remoteServerFailedAdd')
      })
    }
  }
}
