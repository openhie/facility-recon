<template>
  <FacilitiesReport
    action='request'
    requestType='update'
    requestCategory='updateRequest'
  ></FacilitiesReport>
</template>
<script>
import FacilitiesReport from './FacilitiesReport'
export default {
  components: {
    'FacilitiesReport': FacilitiesReport
  }
}
</script>