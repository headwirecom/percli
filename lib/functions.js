function bind(el, attr, val) {
    el.removeAttr(attr)
    el.attr('v-bind:'+attr, val)
}
const f = {

    bindPath: function($) {
        bind($, 'data-per-path', 'model.path')
    },

    makePositionRelativeInAuthor: function($) {
        bind($, 'style', "'position: relative;'")
    },

    addPlaceholders: function($) {
        $.prepend('<pagerender-vue-components-placeholder v-bind:model="{ path: model.path, component: model.component, location: \'before\' }"></pagerender-vue-components-placeholder>')
        $.append('<pagerender-vue-components-placeholder v-bind:model="{ path: model.path, component: model.component, location: \'after\' }"></pagerender-vue-components-placeholder>')
    },

    mapField($, name) {
        $.html(`{{model.${name}}}`)
    },

    mapRichField($, name) {
        $.attr('v-html', 'model.'+name)
        $.html('')
    },

    bindAttribute($, attr, value) {
        bind($, attr, 'model.'+value)
    },


    addChildren($) {
        $.append(
`<template v-for="child in model.children">
    <component v-bind:is="child.component" v-bind:model="child"></component>
</template>`)
    },

    createDialog(from) {
        var dialog = { fields: [] }
        var fields = dialog.fields

        for(var key in from.properties) {
            var field =from.properties[key]
            if(!field['x-form-ignore']) {
                var fieldType = field['x-form-type'] ? field['x-form-type'] : field.type
                var placeholder = field['x-form-placeholder'] ? field['x-form-placeholder'] : key
                var label = field['x-form-label'] ? field['x-form-label'] : key

                const fieldConverter = this['fc_'+fieldType]
                if(fieldConverter) {
                    fieldConverter(field, fields)
                } else {
                    fields.push( { type: 'input', inputType: 'text' })
                    console.log('unsupported field type', fieldType)
                }

                // switch(fieldType) {
                //     case 'string':
                //         fields.push( { type: 'input', inputType: 'text' })
                //         break
                //     case 'pathbrowser':
                //         fields.push( {
                //             type: "pathbrowser",
                //             browserRoot: "/content/assets"
                //         })
                //         break
                //     case 'texteditor':
                //         fields.push( {
                //             type: "texteditor",
                //             rows: 10
                //         })
                //         break
                //     default:
                //         fields.push( { type: 'input', inputType: 'text' })
                //         console.log('unsupported field type', fieldType)
                //         break
                // }
                fields[fields.length -1].placeholder = placeholder
                fields[fields.length -1].label       = label
                fields[fields.length -1].model       = key
            }
        }
        return dialog
    },

    fc_string(field, fields) {
        fields.push( { type: 'input', inputType: 'text' })
    },

    fc_pathbrowser(field, fields) {
        fields.push( {
            type: "pathbrowser",
            browserRoot: "/content/assets"
        })
    },

    fc_texteditor(field, fields) {
        fields.push( {
            type: "texteditor",
            rows: 10
        })
    },

    fc_spectrum(field, fields) {
        fields.push( {
            type: 'spectrum',
            colorOptions: {
                preferredFormat: 'hex'
            }
        })
    },

    fc_collection(field, fields) {
        const subFields = f['createDialog'](field)
        fields.push( {
            type: 'collection',
            multifield: subFields.fields.length > 1,
            fields: subFields.fields
        })
    },

    fc_listselection(field, fields) {
        fields.push( {
            type: 'listselection',
            values: field['x-form-values']
        })
    }
}

module.exports = f