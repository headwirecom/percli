function bind(el, attr, val, remove = true) {
    if (remove) {
        el.removeAttr(attr)
    }
    el.attr('v-bind:'+attr, val)
}
function forAttr(el, val) {
    el.nextAll().remove()
    el.attr('v-for','(item,i) in '+ val)
	el.attr(':key','i')
}
function ifAttr(el, expr) {
    el.attr('v-if', expr)
}
function elseIfAttr(el, expr) {
    el.attr('v-else-if', expr)
}
function bindStyle(el, name, val, ext) {
    el.removeAttr('style')
    var originalAttr = el.attr('v-bind:style')
    if (originalAttr) {
        originalAttr = originalAttr.replace(/\`/g, '');
    } else {
        originalAttr = '';
    }

    if (ext) {
        el.attr('v-bind:style', '`'+ originalAttr + name + ':${'+ val + '}' + ext + ';`')
    } else {
        el.attr('v-bind:style', '`'+ originalAttr + name + ':${'+ val + '};`')
    }
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
        $.html(`{{${name}}}`)
    },

    mapRichField($, name) {
        $.attr('v-html', name)
        $.html('')
    },

    bindAttribute($, attr, value, remove) {
        bind($, attr, value, remove)
    },

	wrap: function($, name) {
	    $.wrap(`<${name}>`)
    },

    replace: function($, element) {
	    $.replaceWith(element)
    },

	addIf($, expr) {
		ifAttr($, expr)
	},

	addElseIf($, expr) {
		elseIfAttr($, expr)
	},

	addElse($) {
		$.attr('v-else',true)
	},

    addFor($, value) {
		forAttr($, value)
	},

    addStyle($, name, val, ext) {
        bindStyle($, name, val, ext)
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
                var visible = field['x-form-visible']
                var hint = field['x-form-hint']
                var required = field['x-form-required']
                var validator = field['x-form-validator']
                var defaultProp = field['x-form-default']
                var min = field['x-form-min']
                var max = field['x-form-max']
                var families = field['x-form-families']
                if (fieldType === 'reference') {
                    var references =  f['createDialog'](field)
                    for(var refkey in references.fields) {
                        fields.push(references.fields[refkey])
                    }
                } else {
                    const fieldConverter = this['fc_'+fieldType]
                    if(fieldConverter) {
                        fieldConverter(field, fields)
                    } else {
                        fields.push( { type: 'input', inputType: 'text' })
                        console.log('unsupported field type', fieldType)
                    }

                    fields[fields.length -1].placeholder = placeholder
                    fields[fields.length -1].label       = label
                    fields[fields.length -1].model       = key
                    if (visible) {
                        fields[fields.length -1].visible = visible
                    }
                    if (hint) {
                        fields[fields.length -1].hint = hint
                    }
                    if (required) {
                        fields[fields.length -1].required = required
                    }
                    if (validator) {
                        fields[fields.length -1].validator = validator
                    }
                    if (defaultProp) {
                        fields[fields.length -1].default = defaultProp
                    }
                    if (min) {
                        fields[fields.length -1].min = min
                    }
                    if (max) {
                        fields[fields.length -1].max = max
                    }
                    if (families) {
                        fields[fields.length -1].families = families
                    }
                }
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

    fc_textarea(field, fields) {
        fields.push( {
            type: "material-textarea",
            rows: 10,
            max: 500
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
        if (subFields.fields.length > 1) {
            fields.push( {
                type: 'collection',
                multifield: true,
                fieldLabel: [field['x-form-fieldLabel'] ? field['x-form-fieldLabel'] : subFields.fields[0]['model'],'value'],
                fields: subFields.fields
            })
        } else {
            fields.push( {
            type: 'collection',
            multifield: field['x-form-multifield'] ? field['x-form-multifield'] : false,
            fields: subFields.fields
        })
        }
    },

    fc_listselection(field, fields) {
        fields.push( {
            type: 'listselection',
            values: field['x-form-values']
        })
    },

    fc_materialswitch(field, fields) {
        fields.push( {
            type: "materialswitch",
            textOn: "yes",
            textOff: "no",
            valueOn: "true",
            valueOff: "false"
        })
    },

    fc_materialcheckbox(field, fields) {
        fields.push( {
            type: "material-checkbox",
            valueOn: "true",
            valueOff: "false"
        })
    },

    fc_input(field, fields) {
        fields.push( {
            type: "input",
            inputType: field['x-form-inputType']
        })
    },

    fc_text(field, fields) {
        fields.push( {
            type: "input",
            inputType: "text"
        })
    },

    fc_color(field, fields) {
        fields.push( {
            type: "input",
            inputType: "color"
        })
    },

    fc_number(field, fields) {
        fields.push( {
            type: "input",
            inputType: "number"
        })
    },

    fc_url(field, fields) {
        fields.push( {
            type: "input",
            inputType: "url"
        })
    },

    fc_tel(field, fields) {
        fields.push( {
            type: "input",
            inputType: "tel"
        })
    },

    fc_range(field, fields) {
        fields.push( {
            type: "input",
            inputType: "range"
        })
    },

    fc_materialradio(field, fields) {
        const subFields = f['createNameValues'](field)
        fields.push( {
            type: "material-radios",
            values: subFields.fields
        })
    },

    fc_materialselect(field, fields) {
        const subFields = f['createNameValues'](field)
        fields.push( {
            type: "material-select",
            values: subFields.fields
        })
    },

    fc_materialchecklist(field, fields) {
        const subFields = f['createNameValues'](field)
        fields.push( {
            type: "material-checklist",
            values: subFields.fields,
            listBox: false,
            multi: true,
            multiSelect: true
        })
    },

    fc_materialdatepicker(field, fields) {
        fields.push( {
            type: "material-datepicker",
        })
    },

    fc_materialtimepicker(field, fields) {
        fields.push( {
            type: "material-timepicker",
        })
    },

    fc_materialdatetime(field, fields) {
        fields.push( {
            type: "material-datetime",
        })
    },

    fc_iconbrowser(field, fields) {
        fields.push( {
            type: "iconbrowser",
        })
    },

    fc_ref(field, fields) {
        fields.push( { $ref: field['x-form-ref'] })
    },

    createNameValues(from) {
        var nameValues = { fields: [] }
        var fields = nameValues.fields

        for(var key in from.properties) {
            var field =from.properties[key]
            if(!field['x-form-ignore']) {
                var name = field['x-form-name'] ? field['x-form-name'] : key
                var value = field['x-form-value'] ? field['x-form-value'] : key
                fields.push( {
                    name: name,
                    value: value
                })
            }
        }
        return nameValues
    }
}
module.exports = f