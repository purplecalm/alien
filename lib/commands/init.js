(function(){
    var $=require('../$');
    var fs=require('fs');
    var fstools=require('../fs');
    var syspath=require('path');
    var inquirer = require('inquirer');
    
    var beforeRun = function(){
        console.log();
        console.log("================== initialize project ================");
        console.log();
    }

    var afterRun = function(){
        console.log();                        
        console.log("================== initialize ok =====================");
        console.log(); 
    }

    var createDirectory = function(projectName){
        //建立项目目录
        fstools.mkdir(syspath.join(process.cwd(), projectName));
        fstools.mkdir(syspath.join(process.cwd(), projectName, "src"));
        fstools.mkdir(syspath.join(process.cwd(), projectName, "src", "scripts")); 
        fstools.mkdir(syspath.join(process.cwd(), projectName, "src", "styles"));                      
    }

    var createTemplate = function(directory){
        //生成build.mustache、index.js、index.css模版文件
        let buildContent = fs.readFileSync(syspath.join(__dirname, "../static/build.mustache.tpl"));
        let jsContent = fs.readFileSync(syspath.join(__dirname, "../static/index.js.tpl"));
        let cssContent = fs.readFileSync(syspath.join(__dirname, "../static/index.css.tpl")); 
        
        fs.writeFileSync(syspath.join(directory, "src", "scripts", "build.mustache"), buildContent);
        fs.writeFileSync(syspath.join(directory, "src", "scripts", "index.js"), jsContent);
        fs.writeFileSync(syspath.join(directory, "src", "styles", "css.js"), cssContent);
    }

    var writeConfig = function(directory, cfg){
        fs.writeFileSync(syspath.join(directory, ".config"), JSON.stringify(cfg, null, 4));
    }

    var createConfig = function(projectName){
        let cfg = JSON.parse(fs.readFileSync(syspath.join(__dirname, "../static/config.tpl")).toString());

                    inquirer.prompt({name : "name",
                                     message : "最终输出的入口html名称：[index.html]",
                                     default : "index.html",
                                    })
                            .then((answer) => {
                                cfg.html[0].name = answer.name;
                                return inquirer.prompt({name : "title",
                                                        message : "入口html默认title：[alien project title]",
                                                        default : "alien project title",
                                                }); 
                            })
                            .then((answer) => {
                                cfg.html[0].title = answer.title;
                                return inquirer.prompt({name : "domain",
                                                        message : "入口html引用js/css的对应域名：[static.project.com]",
                                                        default : "static.project.com",
                               });   
                            })
                            .then((answer) => {
                                cfg.html[0].domain = answer.domain;
                                writeConfig(syspath.join(process.cwd(), projectName), cfg);
                                createTemplate(syspath.join(process.cwd(), projectName));
                                afterRun();
                            });
    };

	$.extend(exports,{
		run: function(options){
            let projectName = String(options._[1]);
            beforeRun();
            createDirectory(projectName);
            createConfig(projectName);
        },
		
		usage: function(optimist){
			optimist.usage('  Usage: alien init [project-name]');
        },
        
        //必须只有一个projectName的参数名，多了少了都不行
        check: function(optimist){
            return optimist.argv._.length === 2 && optimist.argv._[1];
        },
		
		description: '初始化新的项目目录'
	});
	
}).call(this);