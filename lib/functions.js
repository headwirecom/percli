/**
    * Binds an attribute to the model property
    * @param {string} $ - the element
    * @param {string} attr - the attribute
    * @param {string} value - the value
    * @param {boolean} remove - when true, it will remove the current attribute form the element
*/
function bind(el, attr, val, remove = true) {
    if (remove) {
        el.removeAttr(attr)
    }

    if (attr) {
        el.attr(`v-bind:${attr}`, val);
    } else {
        el.attr('v-bind', val);
    }
}

/**
    * Adds the v-for attribute
    * @param {string} el - the element
    * @param {string} val - the field
*/
function forAttr(el, val, item = 'item', remove = true) {
    if (remove) {
        el.nextAll().remove()
    }

    el.attr('v-for', `(${item}, i) in ${val}`)
	el.attr(':key', `${item}.path || i`)
}

/**
    * Adds the v-if attribute
    * @param {string} el - the element
    * @param {string} expr - the expression
*/
function ifAttr(el, expr) {
    el.attr('v-if', expr)
}

/**
    * Adds the v-else-if attribute
    * @param {string} el - the element
    * @param {string} expr - the expression
*/
function elseIfAttr(el, expr) {
    el.attr('v-else-if', expr)
}

/**
    * Adds a v-bind:style' to the provided element. The name is the css name, val is the model object, and ext is the extension if needed(optional)
    * @param {string} el - the element
    * @param {string} name - the css name
    * @param {string} val - the model object
    * @param {string} ext - the extension(optional)
*/
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

let model = null
function mapIsRichProperty($, pathOrName, propertyName) {
    let properties = model.definitions
    if (!properties) return
    let propNames = Object.getOwnPropertyNames(properties)
    if (propNames.length == 0) return
    properties = properties[propNames[0]]
    if (!properties) return
    properties = properties.properties
    if (!properties) return

    let index = pathOrName.indexOf('.')
    properties = properties[index < 0 ? pathOrName : pathOrName.substring(index + 1)]
    if (!properties) return
    if (propertyName) {
        properties = properties.properties
        if (!properties) return
        properties = properties[propertyName]
        if (!properties) return
    }

    const type = properties['x-form-type']
    if (type == 'texteditor') {
        $.attr('data-per-inline-is-rich', 'true')
    } else if (type == 'text') {
        $.attr('data-per-inline-is-rich', 'false')
    }
}

const f = {

    /**
        * Adds an attribute `data-per-path` to the surrounding html tag of the component and is used by the editor in pcms to correctly identify editable components
        * @param {string} $ - the element
    */
    bindPath: function($) {
        bind($, 'data-per-path', 'model.path')
    },

    /**
        * Adds an inline style to the provided element making the position relative
        * @param {string} $ - the element
    */
    makePositionRelativeInAuthor: function($) {
        bind($, 'style', "'position: relative;'")
    },

    /**
        * If the component is a Container (can have child components) then this method should be used to insert the
        *  boilerplate placeholders for the editor to allow other components to be dragged into this component at the start of at the end
        * @param {string} $ - the element
    */
    addPlaceholders: function($) {
        $.prepend('<pagerendervue-components-placeholder v-if="model.children.length === 0" v-bind:model="{ path: model.path, component: model.component + \': drop component here\', location: \'into\' }" class="per-drop-target-empty"></pagerendervue-components-placeholder>')
        $.prepend('<pagerendervue-components-placeholder v-if="(model.fromTemplate && model.children.length > 0 && model.children[0].fromTemplate) ? false: model.children.length > 0" v-bind:model="{ path: model.path, component: model.component, location: \'before\' }"></pagerendervue-components-placeholder>')
        $.append('<pagerendervue-components-placeholder v-if="(model.fromTemplate && model.children.length > 0 && model.children[0].fromTemplate) ? false: model.children.length > 0" v-bind:model="{ path: model.path, component: model.component, location: \'after\' }"></pagerendervue-components-placeholder>')
    },

    /**
        * Adds the component template that allows components to be included within.
        * @param {string} $ - the element
    */
    addChildren($) {
        $.append(
            `<template v-for="(child, i) in model.children">
    <component v-bind:key="child.path || i" v-bind:is="child.component" v-bind:model="child"></component>
</template>`)
    },

    /**
        * Maps (or binds) a field from the model to this element. The inner html of the provided tag in $ is replaced with {{model.<name>)}}.
        * Note: using this method will escape all special characters in the output of the property
        * @param {string} $ - the element
        * @param {string} name - the name of the field
        * @param {string} inlineName - the name of the field for repeatable inline editables or false to disable inline edit
        * @param {string} inlineChildName - the name of the variable for inline repeatables
    */
    mapField($, name, inlineName, inlineChildName) {
        $.html(`{{${name}}}`)
        if(inlineName === undefined) {
            $.attr('data-per-inline', name)
        } else {
            if(inlineName === false) {
                // no need to do anything, we do not want this field to be inline editable
            } else {
                $.attr('v-bind:data-per-inline', '`'+inlineName+'.${i}.'+inlineChildName+'`')
            }
        }
    },

    /**
        * Allows for html tags to be rendered (used if the content is provided through the texteditor for example).
        * In the vuejs implementation this maps to an attribute v-html="model.<name>"
        * @param {string} $ - the element
        * @param {string} name - the name of the field
        * @param {string} inlineName - the name of the field for repeatable inline editables or false to disable inline edit
        * @param {string} inlineChildName - the name of the variable for inline repeatables
    */
    mapRichField($, name, inlineName, inlineChildName) {
        $.attr('v-html', name)
        if(inlineName === undefined) {
            $.attr('v-bind:data-per-inline', '`'+name+'`')
        } else {
            if(inlineName === false) {
                // no need to do anything, we do not want this field to be inline editable
            } else {
                $.attr('v-bind:data-per-inline', '`'+inlineName+'.${i}.'+inlineChildName+'`')
            }
        }
        $.html(``)
    },

    /**
        * Allows for html tags to be rendered (used if the content is provided through the texteditor for example).
        * In the vuejs implementation this maps to an attribute v-html="model.<name>"
        * It also enables the inline editing feature.
        * @param {string} $ - the element
        * @param {string} name - the name of the field
    */
    mapInlineRichField($, pathOrName, propertyName, itemName = 'item') {
        let name, fullPath
        let pathProperty = 'data-per-inline-property'
        if (propertyName) {
            name = `${itemName}.${propertyName}`
            pathProperty = `v-bind:${pathProperty}`
            fullPath = `\`${pathOrName}.\${i}.${propertyName}\``
        } else {
            name = pathOrName
            fullPath = name
        }

        this.mapRichField($, name)
        $.attr(pathProperty, fullPath)

        if (model) {
            mapIsRichProperty($, pathOrName, propertyName)
        }
    },

    /**
        * Binds an attribute to the model property
        * @param {string} $ - the element
        * @param {string} attr - the attribute
        * @param {string} value - the value
        * @param {boolean} remove - when true, it will remove the current attribute form the element
    */
    bindAttribute($, attr, value, remove) {
        bind($, attr, value, remove)
    },

    /**
        * Binds an event to the model property
        * @param {string} $ - the element
        * @param {string} attr - the event
        * @param {string} value - the value
    */
    bindEvent($, event, value) {
        $.attr('v-on:'+event, value)
    },

    /**
        * Wraps a path string with that will then wrap the output vue with '$helper.pathToUrl()'.
        * This function will automatically add the '.html' extension to the link if it needs one
        * @param {string} value - the value to wrap around
        * @return {string} the wrapped value
    */
    pathToUrl(value) {
        return '$helper.pathToUrl('+value+')'
    },

    /**
        * Wraps a new element around the provided one. The name is the element name
        * @param {string} $ - the element
        * @param {string} name - the name of the field
    */
	wrap: function($, name) {
	    $.wrap(`<${name}>`)
    },

    /**
        * Replaces the entire provided element with the defined one
        * @param {string} $ - the element
        * @param {string} element - the html element to replace with
    */
    replace: function($, element) {
	    $.replaceWith(element)
    },

    /**
        * Adds a 'v-if' to the provided element. The 'expr' is the conditional expression
        * @param {string} $ - the element
        * @param {string} expr - the conditional expression for the if statement
    */
	addIf($, expr) {
		ifAttr($, expr)
	},

    /**
        * Adds a 'v-else-if' to the provided element. The 'expr' is the conditional expression
        * @param {string} $ - the element
        * @param {string} expr - the conditional expression for the if statement
    */
	addElseIf($, expr) {
		elseIfAttr($, expr)
	},

    /**
        * Adds a 'v-else' to the provided element
        * @param {string} $ - the element
    */
	addElse($) {
		$.attr('v-else', '')
	},

    /**
        * Adds a 'v-for' to the provided element. The value parameter is the model object that will be passed in.
        * The items of the for loop will be named 'item'
        * @param {string} $ - the element
        * @param {string} name - the name of the field
        * @param {string} item - the name of the item(defaults to item)
        * @param {boolean} remove - true/false to remove the sibling elements(defaults to true)
    */
    addFor($, name, item, remove) {
		forAttr($, name, item, remove)
	},

    /**
        * Adds a v-bind:style' to the provided element. The name is the css name, val is the model object, and ext is the extension if needed(optional)
        * @param {string} $ - the element
        * @param {string} name - the css name
        * @param {string} val - the model object
        * @param {string} ext - the extension(optional)
    */
    addStyle($, name, val, ext) {
        bindStyle($, name, val, ext)
    },

    /**
        * Converts a model.json string into the appropriate dialog.json. Checks for all the custom 'x-form' fields made
        * and adds to the dialog in as the correct property
        * @param {string} from - the model.json string
        * @return {string} the dialog.json string
    */
    createDialog(from) {
        var dialog = { fields: [] }
        var fields = dialog.fields

        for(var key in from.properties) {
            var field =from.properties[key]
            if(!field['x-form-ignore']) {
                var fieldType = field['x-form-type'] || field.type
                var placeholder = field['x-form-placeholder'] || key
                var label = field['x-form-label'] || key
                var visible = field['x-form-visible']
                var hint = field['x-form-hint']
                var required = field['x-form-required']
                var validator = field['x-form-validator']
                var defaultProp = field['x-form-default']
                var min = field['x-form-min']
                var max = field['x-form-max']
                var group = field['x-form-group']
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
                    if (min !== 'undefined') {
                        fields[fields.length -1].min = min
                    }
                    if (max) {
                        fields[fields.length -1].max = max
                    }
                    if (families) {
                        fields[fields.length -1].families = families
                    }
                    if (group) {
                        fields[fields.length -1].x_form_group = group
                    }
                }
            }
        }
        return dialog
    },

    /**
        * Pushes the text field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_string(field, fields) {
        fields.push( { type: 'input', inputType: 'text' })
    },

    /**
        * Pushes the pathbrowser field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_pathbrowser(field, fields) {
        let browserRoot = field['x-form-browserRoot']
        if (!browserRoot) {
            browserRoot = "/content"
        }
        let withLink = field['x-form-withLink']
        if (withLink === true || withLink === false) {
            fields.push( {
                type: "pathbrowser",
                browserRoot: browserRoot,
                browserOptions: { withLink: withLink}
            })
        } else {
            fields.push( {
                type: "pathbrowser",
                browserRoot: browserRoot
            })
        }
    },

    /**
        * Pushes the text editor field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_texteditor(field, fields) {
        fields.push( {
            type: "texteditor",
            rows: 10
        })
    },

    /**
        * Pushes the text area field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_textarea(field, fields) {
        let rows = field['x-form-rows']
        if (!rows) {
            rows = 10
        }
        fields.push( {
            type: "material-textarea",
            rows: rows,
            max: 500
        })
    },

    /**
        * Pushes the spectrum field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_spectrum(field, fields) {
        fields.push( {
            type: 'spectrum',
            colorOptions: {
                preferredFormat: 'hex'
            }
        })
    },

    /**
        * Pushes the collection field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_collection(field, fields) {
        const subFields = f['createDialog'](field)
        let fieldLabel = field['x-form-fieldLabel']
        if (fieldLabel && fieldLabel.length === 0) {
            fieldLabel = ''
        } else if (fieldLabel) {
            fieldLabel = [fieldLabel,'value']
        } else {
            fieldLabel = [subFields.fields[0]['model'],'value']
        }
        if (subFields.fields.length > 1) {
            fields.push( {
                type: 'collection',
                multifield: true,
                fieldLabel: fieldLabel,
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

    /**
        * Pushes the list selection field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_listselection(field, fields) {
        fields.push( {
            type: 'listselection',
            values: field['x-form-values']
        })
    },

    /**
        * Pushes the material switch field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_materialswitch(field, fields) {
        let textOn = field['x-form-textOn']
        if (!textOn) {
            textOn = 'yes'
        }
        let textOff = field['x-form-textOff']
        if (!textOff) {
            textOff = 'no'
        }
        fields.push( {
            type: "materialswitch",
            textOn: textOn,
            textOff: textOff,
            valueOn: "true",
            valueOff: "false"
        })
    },

    /**
        * Pushes the material checkbox field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_materialcheckbox(field, fields) {
        fields.push( {
            type: "material-checkbox",
            valueOn: "true",
            valueOff: "false"
        })
    },

    /**
        * Pushes the material range field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_materialrange(field, fields) {
        fields.push( {
            type: "material-range"
        })
    },

    /**
        * Pushes the input field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_input(field, fields) {
        fields.push( {
            type: "input",
            inputType: field['x-form-inputType']
        })
    },

    /**
        * Pushes the text field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_text(field, fields) {
        fields.push( {
            type: "input",
            inputType: "text"
        })
    },

    /**
        * Pushes the color field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_color(field, fields) {
        fields.push( {
            type: "input",
            inputType: "color"
        })
    },

    /**
        * Pushes the number field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_number(field, fields) {
        fields.push( {
            type: "input",
            inputType: "number"
        })
    },

    /**
        * Pushes the url field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_url(field, fields) {
        fields.push( {
            type: "input",
            inputType: "url"
        })
    },

    /**
        * Pushes the telephone field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_tel(field, fields) {
        fields.push( {
            type: "input",
            inputType: "tel"
        })
    },

    /**
        * Pushes the range field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_range(field, fields) {
        fields.push( {
            type: "input",
            inputType: "range"
        })
    },

    /**
        * Pushes the material radio field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_materialradio(field, fields) {
        const subFields = f['createNameValues'](field)
        fields.push( {
            type: "material-radios",
            values: subFields.fields
        })
    },

    /**
        * Pushes the material select field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_materialselect(field, fields) {
        const subFields = f['createNameValues'](field)
        if(field['x-form-from']) {
            fields.push({
                type: "material-select",
                valuesFrom: field['x-form-from']
            })
        } else {
            fields.push( {
                type: "material-select",
                values: subFields.fields
            })
        }
    },

    /**
        * Pushes the material checklist field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_materialchecklist(field, fields) {
        const subFields = f['createNameValues'](field)
        fields.push( {
            type: "material-checklist",
            values: subFields.fields,
            listBox: true
        })
    },

    /**
        * Pushes the material date picker field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_materialdatepicker(field, fields) {
        fields.push( {
            type: "material-datepicker",
        })
    },

    /**
        * Pushes the material time picker field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_materialtimepicker(field, fields) {
        fields.push( {
            type: "material-timepicker",
        })
    },

    /**
        * Pushes the material date time field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_materialdatetime(field, fields) {
        fields.push( {
            type: "material-datetime",
        })
    },

    /**
        * Pushes the icon browser field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_iconbrowser(field, fields) {
        fields.push( {
            type: "iconbrowser",
        })
    },

    /**
        * Pushes the $ref field into the dialog JSON
        * @param {string} field - the field from the model JSON
        * @param {string} fields - the dialog JSON fields array
    */
    fc_ref(field, fields) {
        fields.push( { $ref: field['x-form-ref'] })
    },

    /**
        * Converts the name/values from the model.json for the material selection subfields
        * @param {string} from - the JSON string containing the name/value fields
    */
    createNameValues(from) {
        var nameValues = { fields: [] }
        var fields = nameValues.fields

        for(var key in from.properties) {
            var field =from.properties[key]
            if(!field['x-form-ignore']) {
                var name = field['x-form-name'] ? field['x-form-name'] : key
                var value = field['x-form-value'] ? field['x-form-value'] : ""
                fields.push( {
                    name: name,
                    value: value
                })
            }
        }
        return nameValues
    },

    /**
        * Create the .content.xml file for the component using the sample.json file.
        * This will set up default values for a component when being first dragged into a page
        * @param {string} file - the file name of the sample.json to read in
        * @param {string} componentPath - the path to the component fragment
        * @param {string} uiAppsComponentPath - the path to the ui.apps component location
    */
    createContentXML(file, componentPath, uiAppsComponentPath) {
        var fs = require('fs')
        var path  = require('path')
        var builder = require('xmlbuilder')
        var sampleFile = JSON.parse(fs.readFileSync(path.join(componentPath, file)).toString())
        var title = sampleFile.title
        var group = sampleFile.group
        var xml = builder.create({
            'jcr:root': {
                '@xmlns:sling':'http://sling.apache.org/jcr/sling/1.0',
                '@xmlns:jcr':'http://www.jcp.org/jcr/1.0',
                '@xmlns:nt':'http://www.jcp.org/jcr/nt/1.0',
                '@jcr:primaryType':'per:Component',
                '@jcr:title':title,
                '@group':group
            }}, { encoding: 'utf-8' })
        f['createContent'](xml, sampleFile)

        var xmlString = xml.end({
          pretty: true,
          indent: '  ',
          newline: '\n',
          allowEmpty: false,
          spacebeforeslash: ''
        })
        fs.writeFileSync(path.join(uiAppsComponentPath, '.content.xml'), xmlString)

    },

    /**
        * Create the .content.xml file for the component using the sample JSON.
        * This will set up default values for a component when being first dragged into a page.
        * Multiple versions will be created for every sample JSON file which will create multiple defaults
        * @param {string} sampleFiles - the sample JSON files to read in
        * @param {string} componentPath - the path to the component fragment
        * @param {string} uiAppsComponentPath - the path to the ui.apps component location
    */
    createVersionedContentXML(sampleFiles, componentPath, uiAppsComponentPath) {

        // move the sample.json to the first position
        const sampleIndex = sampleFiles.findIndex(name => name === 'sample.json')
        if(sampleIndex > 0) {
            sampleFiles.splice(sampleIndex, 1)
            sampleFiles.unshift('sample.json')
        }

        var title = sampleFiles[0].title
        var version = 1
        var fs = require('fs')
        var path  = require('path')
        var builder = require('xmlbuilder')
        var xml = builder.create({
            'jcr:root': {
                '@xmlns:sling':'http://sling.apache.org/jcr/sling/1.0',
                '@xmlns:jcr':'http://www.jcp.org/jcr/1.0',
                '@xmlns:nt':'http://www.jcp.org/jcr/nt/1.0',
                '@jcr:primaryType':'per:Component'
            }}, { encoding: 'utf-8' })
        var content = xml.ele('jcr:content').att('jcr:primaryType','nt:unstructured')
        content.att('__variations','true')
        for (index in sampleFiles) {
            sampleFile = JSON.parse(fs.readFileSync(path.join(componentPath, sampleFiles[index])).toString())
            if (sampleFiles[index] === 'sample.json') {
                title = sampleFile.title
            }
            f['createVersionedContent'](content, sampleFile, sampleFiles[index].split('.')[0])
            version = version + 1
        }
        xml.att('jcr:title', title)

        var xmlString = xml.end({
          pretty: true,
          indent: '  ',
          newline: '\n',
          allowEmpty: false,
          spacebeforeslash: ''
        })
        fs.writeFileSync(path.join(uiAppsComponentPath, '.content.xml'), xmlString)

    },

    /**
        * Creates the jcr:content from the sample file model object
        * @param {string} xml - the content.xml root
        * @param {string} sampleFile - the sample json file
        * return {string} returns the xml with the added content
    */
    createContent(xml, sampleFile) {
        var content = xml.ele('jcr:content')
        content.att('jcr:primaryType','nt:unstructured')
        for(var key in sampleFile.model) {
            var value = sampleFile.model[key]
            if (Array.isArray(value)) {
                var collection = content.ele(key).att('jcr:primaryType','nt:unstructured')
                for(var i = 0; i < value.length; i++) {
                    var children = collection.ele(key+i).att('jcr:primaryType','nt:unstructured')
                    for (childKey in value[i]) {
                        if(value[i][childKey].startsWith('{'))
                            children.att(childkey, '\\' + value[i][childKey])
                        else
                            children.att(childKey, value[i][childKey])
                    }
                }
            } else {
                content.att(key,value)
            }
        }
        return xml
    },

    /**
        * Creates the version and jcr:content for the provided version from the sample file model object
        * @param {string} xml - the content.xml root
        * @param {string} sampleFile - the sample json file
        * @param {string} version the version name for the element
        * return {string} returns the xml with the added content
    */
    createVersionedContent(xml, sampleFile, version) {
        var title = sampleFile.title
        var group = sampleFile.group
        var version = xml.ele(version).att('jcr:primaryType','nt:unstructured')
        version.att('title',title)
        version.att('group',group)
        var versionContent = version.ele('jcr:content').att('jcr:primaryType','nt:unstructured')

        for(var key in sampleFile.model) {
            var value = sampleFile.model[key]
            if (Array.isArray(value)) {
                var collection = versionContent.ele(key).att('jcr:primaryType','nt:unstructured')
                for(var i = 0; i < value.length; i++) {
                    var children = collection.ele(key+i).att('jcr:primaryType','nt:unstructured')
                    for (childKey in value[i]) {
                        if(value[i][childKey].startsWith('{'))
                            children.att(childkey, '\\' + value[i][childKey])
                        else
                            children.att(childKey, value[i][childKey])
                    }
                }
            } else {
                if(value.toString().startsWith('{'))
                    versionContent.att(key,'\\' + value)
                else
                    versionContent.att(key, value)
            }
        }
        return xml
    }
}

module.exports = Object.assign(function(m) {
    model = m
    return f
}, f)
