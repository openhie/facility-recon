<template>
  <FacilitiesReport
    action='request'
    requestType='add'
    requestCategory='requestsList'
  ></FacilitiesReport>
</template>
<script>
import FacilitiesReport from './FacilitiesReport'
export default {
  props: ['action', 'requestType', 'requestCategory'],
  components: {
    'FacilitiesReport': FacilitiesReport
  }
}
</script>