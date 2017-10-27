<template>
  <div id="app">
      <div class="container">
          <html-view class="source" v-bind:code="source">source</html-view>
          <div class="script" >script<textarea v-model="code" style="width: 100%; height: 200px;"></textarea><button v-on:click="changed">update</button>Model<textarea v-model="textmodel" style="width: 100%; height: 200px;"></textarea></div>
          <div class="output">output:<out v-bind:model="model"></out></div>
      </div>
  </div>
</template>

<script>
import cheerio from 'cheerio'
    window.$data = {
        msg: 'hatch - convert from html to your scripting language',
        code: 'function hatch($) { console.log($) }',
        textmodel: '{"msg": "test" }',
        source: `<div class="jumbotron">
  <h1 class="display-3">Hello, world!</h1>
  <p class="lead">This is a simple hero unit, a simple jumbotron-style component for calling extra attention to featured content or information.</p>
  <hr class="my-4">
  <p>It uses utility classes for typography and spacing to space content out within the larger container.</p>
  <p class="lead">
    <a class="btn btn-primary btn-lg" href="#" role="button">Learn more</a>
  </p>
</div>`
    }
    window.$data.model = JSON.parse(window.$data.textmodel)

    import Vue from 'vue'
    Vue.component('out', {
        template: window.$data.source,
        computed: {
            model() {
                return window.$data.model
            }
        }
    })


    import htmlView from './HtmlView.vue'

export default {
  name: 'app',
  data () {
    return window.$data
  },
    components: { htmlView },
    methods: {
      changed() {
          window.$data.model = JSON.parse(window.$data.textmodel)

          const dom = cheerio.load(window.$data.source)
          const command = (window.$data.code + '\n' + "hatch(dom)")
          eval(command)
          console.log(dom.html())
          Vue.component('out', {
              template: dom.html(),
              computed: {
                  model() {
                      return window.$data.model
                  }
              }
          })
          this.$forceUpdate()
      }
    }
}
</script>

<style>
    #app {
      font-family: 'Avenir', Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      color: #2c3e50;
    }
    .container {
        display: flex;
    }

    .script, .source, .output {
        flex: 1 100%;
    }


</style>
