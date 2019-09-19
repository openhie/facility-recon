<template>
  <FacilitiesReport
    :action='action'
    :requestType='requestType'
    :requestCategory='requestCategory'
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