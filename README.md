![](https://raw.githubusercontent.com/purplecalm/alien/master/alien.png)
===

## Require
  * rsync (http://rsync.samba.org/)

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
│ ├─┬scripts
│ │ └──...
│ └─┬styles
│   └──...
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
│ ├─┬scripts
│ │ └──...
│ └─┬styles
│   └──...
└─.config
```

### min
minify exports files

(File .config) e.g
```javascript
{
	"exports": [
		"scripts/index.js",
		"styles/index.css"
	]
}
```

before run min, make sure the project is working directory
```bash
$ alien min
```

result
```
project
├─┬prd(product directory)
│ ├─┬scripts
│ │ └──index@bc23723a6ebdd528a774264d37173293.js
│ └─┬styles
│   └──index@db47495f5329bd6a6df53228034d4746.css
├─┬ver(versions directory)
│ ├─┬scripts
│ │ └──index@ver.js (bc23723a6ebdd528a774264d37173293)
│ └─┬styles
│   └──index@ver.css (db47495f5329bd6a6df53228034d4746)
├─┬src
│ ├─┬scripts
│ │ └──...
│ └─┬styles
│   └──...
└─.config
```

### sync
sync all package to target server

*make sure you installed rsync* (find it here http://rsync.samba.org/)

set dev environment in .config
(File .config) e.g
```javascript
{
	"dev": {
		"host": "127.0.0.1",
		"path": "/home/q/www/project/"
	}
}
```

before run sync
  * make sure the project is working directory
  * make sure you packed your project before
```bash
$ alien sync
```
we also run pack and sync together
```bash
$ alien pack && alien sync
```

### help
```
Aha!
```