<template>
  <CreateFacility
    action='request'
    requestType='add'
  ></CreateFacility>
</template>
<script>
import CreateFacility from './CreateFacility'
export default {
  components: {
    'CreateFacility': CreateFacility
  }
}
</script>