function bind(el, attr, val) {
    el.removeAttr(attr)
    el.attr('v-bind:'+attr, val)
}
module.exports = {

    bindPath: function($) {
        bind($, 'data-per-path', 'model.path')
    },

    addPlaceholders: function($) {
        $.prepend('<pagerender-vue-components-placeholder v-bind:model="{ path: model.path, component: model.component, location: \'before\' }"></pagerender-vue-components-placeholder>')
        $.append('<pagerender-vue-components-placeholder v-bind:model="{ path: model.path, component: model.component, location: \'after\' }"></pagerender-vue-components-placeholder>')
    }
}