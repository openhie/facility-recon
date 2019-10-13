<template>
  <FacilitiesReport
    action='request'
    requestType='update'
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