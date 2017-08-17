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
            inject = ''
            for(var prop in data.properties) {
                var propName = prop;
                var props = data.properties[propName]
                if(props['x-source'] == 'inject') {
                    inject += '\t/* '+JSON.stringify(props)+' */\n'
                    inject += '\t@Inject\n'
                    if(props['x-sourceName']) {
                        inject += '@Named(value ="'+props['x-sourceName']+'")\n'
                    }
                    inject += '\tprivate String '
                    inject += propName
                    inject += ';'
                    inject += '\n'
                    inject += '\n'
                }
            }
        } else if('GETTERS' === name) {
            inject = ''
            for(var prop in data.properties) {
                var propName = prop;
                var props = data.properties[propName]
                if(props['x-source'] !== 'ignore') {
                    inject += '\t/* '+JSON.stringify(props)+' */\n'
                    inject += '\tpublic String get'
                    inject += propName.charAt(0).toUpperCase()+propName.slice(1) + '() {\n'
                    inject += '\t\treturn '+propName+';\n'
                    inject += '\t}'
                    inject += '\n'
                    inject += '\n'
                }
            }
        }

        fragments[key] = fragments[key].replace('//GEN]', inject+'\n//GEN]')
    }

    // read the current file in the file system
    var dstCurrent = fs.readFileSync(generator.dst).toString()

    // now replace the old fragments with the new fragments in the destination file
    dstCurrent = dstCurrent.replace(/\/\/GEN\[[\s\S]*?\/\/GEN\]/g, function(str, offset, s) {
        var name = ('name',str.match(/\/\/GEN\[:.*/)[0])
        return fragments[name]
    })

    // and write the file back to the file system
    try {
        const original = fs.readFileSync(generator.dst).toString()
        // only write file if not different from original
        if(original !== dstCurrent) {
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