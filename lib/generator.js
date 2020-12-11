const fs = require('fs')

/** Class representing the sling model generator */
class Generator {
    /**
        * Constructs the generator
        * @param {string} source - the source
        * @param {string} dest - the destination
        * @param {string} info - the info
    */
    constructor(source, dest, info) {
        this.src = source;
        this.dst = dest;
        this.data = info;
    }
}

/**
    * Substitutes all the values into the template
    * @param {string} srcData - the source data string
    * @param {string} generator - the generator object
    * @return {string} the template
*/
function makeInitial(srcData, generator) {
    let definitions = generator.data.definitions[generator.data.modelName];
    let properties = definitions.properties;
    var data = {
        imports: getImports(properties),
        ...generator.data
    }
    var template = srcData.replace(/{{.*?}}/g, function(str, p1, offset, s) {
        var key = str.trim().slice(2,str.trim().length-2).trim()
        var ret = data[key]
        if(!ret) {
            console.log('missing property:', key)
            ret = '!!!'+key+'!!'
        }
        return ret
    })

    return template
}

function getImports(properties) {
    for(var propName in properties) {
        var props = properties[propName]
        var annotate = props['x-annotate']
        if (propName !== 'children' && props['x-source'] == 'inject' && annotate) {
            for(var annotatePropName in annotate) {
                if (annotate[annotatePropName] === "imagesize") {
                    return 'import com.peregrine.model.api.ImageInfo;\n' + 
                        'import java.awt.Dimension;\n';
                }
            }
        }
    }

    return ''
}

/**
    * Used in the gen function and applies all of the inject properties
    * @param {string} properties - the properties from the model JSON
    * @return {string} the inject string block
*/
function genNames(properties) {
    inject = ''
    for(var prop in properties) {
        var propName = prop;
        if (propName !== 'children') {
            var props = properties[propName]
            if(props['x-source'] == 'inject') {
                inject += '\t/* '+JSON.stringify(props)+' */\n'
                inject += '\t@Inject\n'
                if(props['x-sourceName']) {
                    inject += '\t@Named(value ="'+props['x-sourceName']+'")\n'
                }
                if(props['x-default'] === "" || props['x-default']) {
                    inject += '\t@Default(values ="'+props['x-default']+'")\n'
                }
                if(props['x-form-type'] === ('collection')) {
                    if (Object.keys(props['properties']).length > 1 || props['x-form-multifield'] === "true" || props['x-form-multifield'] === true) {
                        inject += '\tprivate List<IComponent> '
                    } else {
                        inject += '\tprivate String[] '
                    }
                }  else {
                    inject += '\tprivate String '
                }
                inject += propName
                inject += ';'
                inject += '\n'
                inject += '\n'
                var annotate = props['x-annotate']
                if (annotate) {
                    inject += genNamesAnnotates(propName, annotate)
                }
            } else if(props['x-form-type'] === ('reference')) {
                inject += genNames(props.properties)
            }
        }
    }
    return inject
}

function genNamesAnnotates(ownerName, values) {
    var result = ''
    for(var name in values) {
        if (values[name] === "imagesize") {
            result += '\t@Inject\n'
            result += `\t@ImageInfo(name="${ownerName}")\n`
            result += `\tprivate Dimension ${name};\n\n`
        }
    }

    return result
}

/**
    * Used in the gen function and applies all of the getter methods. Has additional functionality to retain any custom getter methods
    * @param {string} properties - the properties from the model JSON
    * @param {string} customGetters - the custom getters block
    * @return {string} the getters string block
*/
function genGetters(properties, customGetters) {
    inject = ''
    for(var prop in properties) {
        var propName = prop;
        var getterName = propName.charAt(0).toUpperCase()+propName.slice(1)
        if (propName !== 'children' && (customGetters === null || !customGetters.includes('public String get' + getterName + '()'))) {
            var props = properties[propName]
            if(props['x-source'] == 'inject') {
                inject += '\t/* '+JSON.stringify(props)+' */\n'
                if(props['x-form-type'] === ('collection')) {
                     if (Object.keys(props['properties']).length > 1 || props['x-form-multifield'] === "true" || props['x-form-multifield'] === true) {
                        inject += '\tpublic List<IComponent> get'
                    } else {
                        inject += '\tpublic String[] get'
                    }
                } else {
                    inject += '\tpublic String get'
                }
                inject += getterName + '() {\n'
                inject += '\t\treturn '+propName+';\n'
                inject += '\t}'
                inject += '\n'
                inject += '\n'
                var annotate = props['x-annotate']
                if (annotate) {
                    inject += genGettersAnnotates(annotate)
                }
            } else if(props['x-form-type'] === ('reference')) {
                inject += genGetters(props.properties, customGetters)
            }
        }
    }
    return inject
}

function genGettersAnnotates(values) {
    var result = ''
    for(var name in values) {
        if (values[name] === "imagesize") {
            result += `\tpublic Dimension get${name.charAt(0).toUpperCase()}${name.slice(1)}() {\n`
            result += `\t\treturn ${values};\n`
            result += '\t}\n\n'
        }
    }

    return result
}

/**
    * Loads in the sling model template and fills in the data, inject, and getters content to make the components model
    * @param {string} generator - the generator object
*/
function gen(generator) {

    // load the template
    var srcData = fs.readFileSync(generator.src).toString()

    // now substitute all the values we know into the template
    srcData = makeInitial(srcData, generator)

    // if the generated file does not exist yet, create it with the template we just created
    if(!fs.existsSync(generator.dst)) {
        console.log('initial run for', generator.dst)
        fs.writeFileSync(generator.dst, srcData)
    }

    // read the current file in the file system
    var dstCurrent = fs.readFileSync(generator.dst).toString()

    //retrieve the custom getters block from the current file
    var customGetters = dstCurrent.match(/\/\/GEN\[:CUSTOMGETTERS[\s\S]*?\/\/GEN\]/g)
    if (customGetters !== null) {
        customGetters = customGetters[0]
    }

    // get all //GEN[: //GEN] content from the template and store it in a fragments list
    var fragments = new Array()
    srcData.replace(/\/\/GEN\[[\s\S]*?\/\/GEN\]/g, function(str) {
        var name = ('name',str.match(/\/\/GEN\[:.*/)[0])
        fragments[name] = str
        return str
    })

    let definitions = generator.data.definitions[generator.data.modelName];
    let properties = definitions.properties;
    for(key in fragments) {
        var name = key.split(':')[1]
        var inject = ''

        if('DATA' === name) {
            inject = JSON.stringify(generator.data, true, 2)
        } else if('INJECT' === name) {
            inject = genNames(properties)
        } else if('GETTERS' === name) {
            inject = genGetters(properties, customGetters)
        }

        fragments[key] = fragments[key].replace('//GEN]', inject+'\n//GEN]')
    }

    // now replace the old fragments with the new fragments in the destination file
    dstCurrent = dstCurrent.replace(/\/\/GEN\[[\s\S]*?\/\/GEN\]/g, function(str, offset, s) {
        var name = ('name',str.match(/\/\/GEN\[:.*/)[0])
        if ('CUSTOMGETTERS' === name.split(':')[1]) {
            return customGetters
        } else {
            return fragments[name]
        }
    })

    // and write the file back to the file system
    try {
        const original = fs.readFileSync(generator.dst).toString()
        // only write file if not different from original
        if(original.valueOf() !== dstCurrent.valueOf()) {
            fs.writeFileSync(generator.dst, dstCurrent)
        }
    } catch(error) {
        fs.writeFileSync(generator.dst, dstCurrent)
    }
}

module.exports = {
    /**
        * Generates the sling model for the component based on the provided data
        * @param {string} src - the source
        * @param {string} dst - the destination
        * @param {string} data - the data
    */
    generate: function(src, dst, data) {
        gen(new Generator(src, dst, data))
    }
}