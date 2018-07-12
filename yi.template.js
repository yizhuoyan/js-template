(function (window,document) {
    "use strict";
    /**
     *
     *
     * @param {String} nameAndArgs 方法声明为xxx(a,b)
     * @param {String} templateHtml 字符串模板
     */
    var TemplateFunction =window.TemplateFunction= function (nameAndArgs, templateHtml) {
        //方法声明格式为xxx或xxx(a,b)
        this.nameAndArgs = nameAndArgs;
        //模板字符串
        this.templateSource = templateHtml;
        //模板方法名称
        this.functionName=null;
        //模板方法参数
        this.functionArgumentNames=null;
        //模板方法体
        this.body = [];
        //生成方法引用
        this.functionReference=null;

        privateMethod.init.apply(this);
    };
    //私有方法
    var privateMethod = {
        init: function () {
            //解析
            var result = staticMethod.parseFunctionNameAndArgumentNames(this.nameAndArgs);
            this.functionName = result[0];
            this.functionArgumentNames = result[1];
        }
    };
    //方法中的
    TemplateFunction.helper={
        print:function(s,escape/*=true*/){
            if(s===null||s===undefined)return '';
            escape=escape||true;
            if(escape) {
                return String(s).replace(/[<>&]/g, function (c) {
                    return {'<': '&lt;', '>': '&gt;', '&': '&amp;'}[c]
                })
            }
            return String(s);

        },
        checked:function (b) {
            return b?"checked":"";
        },
        selected:function (b) {
            return b?"selected":"";
        }
    };
    /**
     * 公开方法
     */
    TemplateFunction.prototype = {
        //构建模板方法
        build: function () {

            var out = this.body;
            //添加工具方法
            out.push("var helper=window.TemplateFunction.helper;");
            out.push("var $=helper.print;");
            out.push("var $checked=helper.checked;");
            out.push("var $selected=helper.selected;");
            out.push("var _='';\n");
            //添加try-finally保证模板方法返回值
            out.push("try{\n");
            out.push("\n");
            //构建方法体
            staticMethod.parse(this.templateSource, out);
            //添加finally保证模板方法返回值
            out.push("\n}catch(e){console.log(e)}finally{return _;}");

            var funBody = out.join("");
            var args = this.functionArgumentNames;
            try {
                //创建方法
                var f = args ? new Function(args, funBody) : new Function(funBody);
                this.functionReference=f;
                return f;
            } catch (e) {
                console.log(e);
                console.log(funBody);
            }
        },
        export: function (ctx) {
            ctx = ctx || window;
            if (!this.functionReference) {
                this.build();
            }
            ctx[this.functionName] = this.functionReference;
        }
    };

    var staticMethod = {
        parseFunctionNameAndArgumentNames: function (funName) {
            var begin = funName.indexOf("(");
            if (begin === -1) {
                return [funName, null];
            } else {
                return [funName.substring(0, begin), funName.substring(begin + 1, funName.lastIndexOf(")"))];
            }
        },
        parse: function (template, out) {
            /*
             × 不使用正则，原因如下：
             * 1)正则效率相对较低
             * 2)正则很难支持表达式嵌套(主要是我不会)，如$($(....));
             */
            var handleJs = staticMethod.parseJs;
            var handleHtml = staticMethod.parseHtml;
            var handleHtmlExp = staticMethod.parseHtmlExp;
            var handleJsExp=staticMethod.parseJsExp;
            var jsBegin = -1;
            var expBegin = -1;
            var htmlBegin = 0;
            var jsExpBegin=-1;
            var nestingExp = 0;
            for (var i = 0, z = template.length, c; i < z; i++) {
                switch (c = template.charAt(i)) {
                    case '<':
                        //may be js block
                        if (template.charAt(i + 1) === '-') {//yes we got a js block
                            //handle the previous content
                            if (htmlBegin !== i) {
                                handleHtml(template.substring(htmlBegin, i), out);
                            }
                            jsBegin = i + 2;
                            //jump the '-'
                            i++;
                        }
                        break;
                    case '-':
                        //may be js block end
                        if (template.charAt(i + 1) === '>') {
                            if (jsBegin > 0) {
                                handleJs(template.substring(jsBegin, i), out);
                                jsBegin = -1;
                                htmlBegin = i + 2;
                                //jump the '>'
                                i++;
                            }
                        }
                        break;
                    case '$':
                        //may be exp
                        if (template.charAt(i + 1) === '(') {
                            //handle the previous content
                            if (htmlBegin !== i) {
                                //in the js block
                                if(jsBegin>0){
                                    jsExpBegin=i+2;
                                    handleJs(template.substring(jsBegin,i),out);
                                    jsBegin=-1;
                                }else {
                                    expBegin = i + 2;
                                    handleHtml(template.substring(htmlBegin, i), out);
                                }
                            }

                            //jump the '('
                            i++;
                        }
                        break;
                    case '(':
                        //nesting exp
                        if (expBegin > 0||jsExpBegin>0) {
                            nestingExp++;
                        }
                        break;
                    case ')':
                        if (expBegin > 0) {
                            if (nestingExp > 0) {
                                nestingExp--;
                            } else {
                                //exp end
                                handleHtmlExp(template.substring(expBegin, i), out);
                                expBegin = -1;
                                htmlBegin = i + 1;
                            }
                        }else if(jsExpBegin>0){
                            if (nestingExp > 0) {
                                nestingExp--;
                            } else {
                                handleJsExp(template.substring(jsExpBegin, i), out);
                                jsExpBegin=-1;
                                jsBegin=i+1;
                            }
                        }
                        break;

                }
            }
            //如果最后还有html代码
            if (htmlBegin<template.length) {
                handleHtml(template.substr(htmlBegin), out);
            }
        },
        parseJs: function (code, out) {
            out.push(code);
        },
        parseHtmlExp: function (exp,out) {
            out.push("_+=$(" + exp + ");");
        },
        parseJsExp:function (exp,out) {
            out.push("_+=$(" + exp + ")");
        },
        parseHtml: function (html, out) {
            //不处理空白字符
            if ((html = html.trim()).length === 0) {
                return;
            }

            //双引号转义
            html = html.replace(/"/g, '\\"');
            //换行符分割
            var lines = html.split(/\r?\n/);
            if (lines.length > 0) {
                var i = 0, z = lines.length - 1;
                while (i < z) {
                    //一行一行输出,每行多输出一个换行
                    out.push('_+="' + lines[i++] + '";\n');
                }
                out.push('_+="' + lines[z] + '";');
            }
        }

    };


    //通过<script type="text/tempate">标签构建模板方法
    var templates = document.querySelectorAll("script[type='text/template']");
    Array.prototype.forEach.call(templates, function (t) {
        var templateHTML = t.innerHTML;
        var name = t.getAttribute("name");
        if (!name) {
            name = t.id;
        }
        var tf = new TemplateFunction(name, templateHTML);
        //直接把模板id暴露为window下方法
        tf.export(window);
    });
})(window, document);
