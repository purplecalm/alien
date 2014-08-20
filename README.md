Alien
===

## Require
  * rsync

## Installation
```bash
$ npm install alien -g
```

## Quick Start
before we run the commands of alien, we should have a project first

### create a project
(directory structure)
```
project
├─┬src
│ ├──scripts
│ └──styles
└─.config
```
you can checkout (https://github.com/purplecalm/alien.git) to get a test case

### start a server
before start server, make sure the working directory contains project
```bash
$ alien server
```

server has three modes, [SRC|DEV|PRD]
  * SRC: source mode, return every file, esay to debug
  * DEV: package mode, return files' package
  * PRD: product mode, return minified code

```bash
$ alien server -m DEV
```

### pack
packing exports files

(File .config) e.g
```javascript
{
	"exports": [
		"scripts/index.js",
		"styles/index.css"
	]
}
```

run
before run pack, make sure the project is working directory
```bash
$ alien pack
```

result
```
project
├─┬dev(package directory)
│ ├─┬scripts
│ │ └──index@dev.js
│ └─┬styles
│   └──index@dev.css
├─┬src
│ ├──scripts
│ └──styles
└─.config
```