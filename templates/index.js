const path = require('path')

module.exports = {

    getPath() {
        return path.join(__filename, '..')
    },

    getStubVueComponent() {
        return ``+
`<template>
    <div v-bind:data-per-path="model.path" v-html="model.text">
    </div>
</template>

<script>
    export default {
        props: ['model']
    }
</script>

`
    },

    getStubVueContainer() {
        return ``+
`<template>
    <div v-bind:data-per-path="model.path">
        <pagerender-vue-components-placeholder v-bind:model="{ path: model.path, component: model.component, location: 'before' }"></pagerender-vue-components-placeholder>
        <template v-for="child in model.children">
            <component v-bind:is="child.component" v-bind:model="child"></component>
        </template>
        <pagerender-vue-components-placeholder v-bind:model="{ path: model.path, component: model.component, location: 'after' }"></pagerender-vue-components-placeholder>
    </div>
</template>

<script>
    export default {
        props: ['model']
    }
</script>

`
    },

    getStubHTML() {
        return `<div></div>`
    },
    getStubModelComponent(name) {
        return ``+
`{
  "definitions": {
    "${name}": {
      "type": "object",
      "x-type": "component",
      "properties": {
        "text": {
          "type": "string",
          "x-source": "inject",
          "x-form-type": "texteditor"
        }
      }
    }
  }
}`
    },

    getStubModelContainer(name) {
        return ``+
`{
    "definitions": {
        "${name}": {
            "type": "object",
            "x-type": "container",
            "properties": {
            }
        }
    }
}`
    },

    getStubContentXML(name) {
        return ``+
`<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:sling="http://sling.apache.org/jcr/sling/1.0" xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          jcr:primaryType="per:Component"
          jcr:title="${name}"
          />`
    }
}