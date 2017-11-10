const fs = require('fs')

class Generator {
    constructor(source, dest, info) {
        this.src = source;
        this.dst = dest;
        this.data = info;
    }
}

function makeInitial(srcData, generator) {
    var template = srcData.replace(/{{.*?}}/g, function(str, p1, offset, s) {
        var key = str.trim().slice(2,str.trim().length-2).trim()
        var ret = generator.data[key]
        if(!ret) {
            console.log('missing property:', key)
            ret = '!!!'+key+'!!'
        }
        return ret
    })
    return template
}

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
                if(props['x-default']) {
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
            } else if(props['x-form-type'] === ('reference')) {
                inject += genNames(props.properties)
            }
        }
    }
    return inject
}

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
                console.log(props['x-form-multifield'])
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
            } else if(props['x-form-type'] === ('reference')) {
                inject += genGetters(props.properties, customGetters)
            }
        }
    }
    return inject
}

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

    for(key in fragments) {
        var name = key.split(':')[1]
        var inject = ''

        let data = generator.data.definitions[generator.data.modelName];
        if('DATA' === name) {
            inject = JSON.stringify(generator.data, true, 2)
        } else if('INJECT' === name) {
            inject = genNames(data.properties)
        } else if('GETTERS' === name) {
            inject = genGetters(data.properties, customGetters)
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

    generate: function(src, dst, data) {
        gen(new Generator(src, dst, data))
    }

}