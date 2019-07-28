# percli - cli tool for peregrine cms

### about peregrine-cms

peregrine-cms is an API first headless content management system with a 
beautiful head built with VueJS

For more information about this project go to http://www.peregrine-cms.com/

We are currently in an alpha development phase

### about percli

`percli` is a command line tool to accomplish general tasks that arise when 
working

### prerequisits

the following tools need to be installed and accessible for percli to be able to work

- Java8 for sling9, java8,11+ for sling11 
- Maven3.2+ to use percli compile
- NodeJS 10.16.0 (LTS)

### install percli
```
npm install percli -g
```

### install peregrine-cms
```
percli server install --sling 11
```
_note_: `--sling 11` or `-s 11` will force the install to use the sling 11 version of peregrine. This can be
omitted. If not present, percli will install peregrine with sling9. Sling9 however is an older version of sling
and the default of `percli server install` will soon move to sling 11.  

### start an already installed peregrine-cms instance

```
percli server start
```
