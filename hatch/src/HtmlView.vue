<template>
  <div style="width: 800px; height: 100%;">
      <div>
          <a href="">html</a> | <a href="">source</a>
      </div>
      <iframe style="width: 800px; height: 400px;" v-bind:src="'data:text/html,' + htmlEncoded"></iframe>
      <pre style="max-width: 800px; overflow: scroll;">{{html}}
      </pre>
  </div>
</template>

<script>

    export default {
        props: ['code'],
        name: 'HhtmlView',
      data () {
        return {
            pre: '<head><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.2/css/bootstrap.min.css" integrity="sha384-PsH8R72JQ3SOdhVi3uxftmaW6Vc51MKb0q5P2rRUpPvrszuE4W1povHYgTpBfshb" crossorigin="anonymous"></head>',
            html: this.code,
            post: ''
          }
      }, computed: {
            htmlEncoded() {
                return  encodeURIComponent(this.pre + this.html + this.post)
            }
        }
    }
</script>

<style>
</style>
