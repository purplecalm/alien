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