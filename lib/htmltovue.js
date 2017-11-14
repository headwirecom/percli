const maven = require('maven')
const fs    = require('fs-extra')
const path  = require('path')
const html = require('html')
const cheerio = require('cheerio')

const templates = require('../templates/index.js')
const generator = require('../lib/generator.js')
const functions = require('../lib/functions.js')


function htmltovueAll(container, compile, deploy, dialog, model, vue, category) {
    if (!category) {
        category = 'fragments'
    }
    const components = fs.readdirSync('./'+category)
    for(let i = 0; i < components.length; i++) {
        if(fs.lstatSync('./'+category+'/'+components[i]).isDirectory())
        htmltovue(components[i], container, compile, deploy, dialog, model, vue, category)
    }
    if(compile) {
        const p = require('child_process')
        const cmd = p.execSync('mvn clean install -PautoInstallPackage', {stdio:[0,1,2]})
    }

}

function htmltovue(name, container, compile, deploy, dialog, model, vue, category) {

    var convertAll = false
    if (!dialog && !model && !vue) {
        convertAll = true
    }
    var convertDialog = true
    var convertModel = true
    var convertVue = true
    if (!convertAll && !dialog) {
        convertDialog = false;
    }
    if (!convertAll && !model) {
        convertModel = false;
    }
    if (!convertAll && !vue) {
        convertVue = false;
    }
    if (!category) {
        category = 'fragments'
    }
    var isobject = false
    var appCategory = 'components'
    if (category === 'objects') {
        appCategory = 'objects'
        isobject = true
    }
    console.log()
    const functionsAugmentPath = path.join(process.cwd(), category, 'functions.js')
    if(fs.existsSync(functionsAugmentPath)) {
        const functionsAugment = require(functionsAugmentPath)
        functionsAugment(functions)
    }

    const componentName = name.toLowerCase()
    const ComponentName = componentName.charAt(0).toUpperCase() + componentName.slice(1)

    console.log('updating vue template for', componentName)

    const settings = JSON.parse(fs.readFileSync('./.properties/settings.json').toString())

    const projectName = settings.appname

    let templatePath = templates.getPath()
    let projectPath = process.cwd()
    // should check that we are in the root of the project
    // console.log('template  path:',templatePath)
    // console.log('project   path:',projectPath)

    let componentPath = path.join(projectPath, './'+category+'/'+componentName)
    // console.log('component path:',componentPath)

    let blockGenerator = path.join(projectPath, './'+category, componentName,'blockgenerator')
    if(fs.existsSync(blockGenerator) || fs.existsSync(blockGenerator+'.txt')) {
        console.log('generation of component blocked as per '+blockGenerator+' file')
    } else {

        let uiAppsComponentPath = path.join(projectPath, './ui.apps/src/main/content/jcr_root/apps/', projectName, appCategory, componentName)
        let coreModelsPath = path.join(projectPath, './core/src/main/java/com', projectName, 'models')

        if (!isobject) {
            const html2vue = require(path.join(componentPath, 'htmltovue.js'))
            const $ = cheerio.load(fs.readFileSync(path.join(componentPath, 'template.html')))
            const el = ($('body').children().first())
            html2vue.convert(el, functions)
            const code = $.html($('body').children().first())

            const out = html.prettyPrint('<template>'+code+'</template>', {indent_size: 2, unformatted: []})

            const templateVue = fs.readFileSync(path.join(componentPath, 'template.vue')).toString()
            const newTemplateVue = templateVue.replace(/^<template>[\s\S]*^<\/template>/m, out).replace(/&apos;/g, '\'')
            if ((convertVue && templateVue.valueOf() !== newTemplateVue.valueOf()) || (convertVue && !fs.existsSync(path.join(uiAppsComponentPath, 'template.vue')))) {
                fs.writeFileSync(path.join(componentPath, 'template.vue'), newTemplateVue)

                // copy template.vue file to component
                fs.writeFileSync(path.join(uiAppsComponentPath, 'template.vue')  , fs.readFileSync(path.join(componentPath, 'template.vue')).toString())
            }

            //Sample json conversion
            var sampleFiles = []
            var int = 0
            fs.readdirSync(componentPath).forEach(file => {
              if (file.includes('sample')) {
                sampleFiles[int] = file
                int = int + 1
              }
            })
            if (sampleFiles.length > 1) {
                functions.createVersionedContentXML(sampleFiles, componentPath, uiAppsComponentPath)
            } else if (sampleFiles.length === 1) {
                functions.createContentXML(sampleFiles[0], componentPath, uiAppsComponentPath)
            }

        }
        let def = JSON.parse(fs.readFileSync(path.join(componentPath, 'model.json')).toString())
        //console.log(def.definitions[ComponentName])
        //const integratedDef = functions.integrateReferences(def.definitions[ComponentName]);
        var $RefParser = require('json-schema-ref-parser');

        $RefParser.dereference(def, function(err, schema) {
          if (err) {
            console.error(err);
          }
          else {
            // `schema` is just a normal JavaScript object that contains your entire JSON Schema,
            // including referenced files, combined into a single object
            //console.log(schema.definitions[ComponentName])
            def = schema
            // make dialog.json for component
            var newDialog = JSON.stringify(functions.createDialog(def.definitions[ComponentName]), true, 2)
            var oldDialog = ''
            if (fs.existsSync(path.join(uiAppsComponentPath, 'dialog.json'))) {
                oldDialog = fs.readFileSync(path.join(uiAppsComponentPath, 'dialog.json')).toString()
            }
            if (convertDialog && oldDialog.valueOf() !== newDialog.valueOf()) {
                fs.writeFileSync(path.join(uiAppsComponentPath, 'dialog.json'), newDialog)
            }

            // make model for component
            fs.mkdirsSync(coreModelsPath)
            def.name = ComponentName
            def.componentPath = projectName + '/'+appCategory+'/' + componentName
            def.package = 'com.'+projectName+'.models'
            def.modelName = ComponentName
            def.classNameParent = 'AbstractComponent'
            if(container) def.classNameParent = 'Container'
            if (convertModel) {
                generator.generate(path.join(templates.getPath(),'model.java.template.java'), path.join(coreModelsPath, ComponentName + 'Model.java'), def)
            }

            if(compile) {
                console.log('force compile of component')
                process.chdir('ui.apps')
                const p = require('child_process')
                const cmd = p.execSync('npm run build '+componentName, {stdio:[0,1,2]})
                if(deploy) {
                    console.log('force upload of component')
                    const slang = require('../lib/slang')
                    slang.setOptions({
                        port: 8080,
                        host: 'localhost'
                    })

                    const appName = JSON.parse(fs.readFileSync('../.properties/settings.json')).appname
                    console.log(appName)

                    process.chdir('target/classes')
                    slang.up('etc/felibs/'+appName+'/js.txt').then(function(status) {
                        console.log('success',status)
                    }).catch(function(status, err) {
                        console.error('error', status, err)
                    });
                    slang.up('etc/felibs/'+appName+'/css.txt').then(function(status) {
                        console.log('success',status)
                    }).catch(function(status, err) {
                        console.error('error', status, err)
                    });
                    slang.up('etc/felibs/'+appName+'/js/'+appName+'Components'+componentName.charAt(0).toUpperCase()+componentName.substring(1)+'.js').then(function(status) {
                        console.log('success',status)
                    }).catch(function(status, err) {
                        console.error('error', status, err)
                    });
                }
            }
          }
        });
    }
}

module.exports = {
    htmltovue: htmltovue,
    htmltovueAll: htmltovueAll
}
