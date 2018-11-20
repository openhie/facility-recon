<template>
  
</template>
<script>
import VueCookies from 'vue-cookies'
export default {
  mounted () {
    this.$store.state.token = ''
    VueCookies.remove('token')
    this.$router.push('login')
  }
}
</script>

