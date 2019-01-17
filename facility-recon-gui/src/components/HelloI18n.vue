<template>
<div>
  <label for="locale">locale</label>
  <select v-model="locale">
    <option>en</option>
    <option>fr</option>
  </select>
  <h1>test</h1>
  <p>{{ $t('hello') }}</p>
</div>
</template>

<script>
export default {
  name: 'HelloI18n',
  data () { return { locale: 'en' } },
  watch: {
    locale (val) {
      this.$i18n.locale = val
    }
  }
}
</script>
