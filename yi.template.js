(function () {
    /**
     * @param {String} nameAndArgs 方法声明为xxx(a,b)
     * @param {String} templateSource 字符串模板
     */
    let TemplateFunction =window.TemplateFunction= function (nameAndArgs, templateSource) {
        //方法声明格式为xxx或xxx(a,b)
        this.nameAndArgs = nameAndArgs;
        //模板字符串
        this.templateSource = templateSource;
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
    let privateMethod = {
        init: function () {
            //解析
            let result = staticMethod.parseFunctionNameAndArgumentNames(this.nameAndArgs);
            this.functionName = result[0];
            this.functionArgumentNames = result[1];
        }
    };
    //方法中的
    TemplateFunction.helper={
        print:function(s,ds){
            if(s===null||s===undefined)return ds||'';
            return String(s);
        },
		escapePrint:function(s,ds){
			if(s===null||s===undefined)return ds||'';
			return String(s).replace(/[<>&]/g, function (c) {
				return {'<': '&lt;', '>': '&gt;', '&': '&amp;'}[c]
			})
		}
    };
    /**
     * 公开方法
     */
    TemplateFunction.prototype = {
        //构建模板方法
        build: function () {

            let out = this.body;
            //添加工具方法
            out.push("let helper=window.TemplateFunction.helper,");
            out.push("$=helper.print,");
            out.push("_='';\n");
            //添加try-finally保证模板方法返回值
            out.push("try{\n");
			
            //构建方法体
			out.parseCode = staticMethod.parseCode;
			out.parseText = staticMethod.parseText;
			out.parseExpInText = staticMethod.parseExpInText;
			out.parseExpInCode=staticMethod.parseExpInCode;
			out.parseTemplate=staticMethod.parseTemplate;
			
            out.parseTemplate(this.templateSource,0);
            //添加finally保证模板方法返回值
            out.push("\n}catch(e){console.log(e)}finally{return _;}");

            let funBody = out.join("");
            let args = this.functionArgumentNames;
            try {
                //创建方法
                let f = args ? new Function(args, funBody) : new Function(funBody);
                this.functionReference=f;
                return f;
            } catch (e) {
                console.log(e);
                console.log(funBody);
            }
        }
        
    };

    let staticMethod = {
        parseFunctionNameAndArgumentNames: function (funName) {
            let begin = funName.indexOf("(");
            if (begin === -1) {
                return [funName, null];
            } else {
                return [funName.substring(0, begin), funName.substring(begin + 1, funName.lastIndexOf(")"))];
            }
        },
		parseTemplate:function(template,begin){
			let textBeginIndex =-1;
			for (let i = begin, z = template.length,c; i < z; i++) {
			    c = template.charAt(i);
				if(c==='<'&&template.charAt(i + 1) === '-'){
					let codeBeginIndex = i + 2;
					let codeEndIndex=codeBeginIndex;
					//find the code end
					for(;codeEndIndex<z;codeEndIndex++){
						c=template.charAt(codeEndIndex);
						 if(c=== '-'&&template.charAt(codeEndIndex + 1) === '>') {
							 //handle the text
							 if (textBeginIndex>=0) {
								if(textBeginIndex!==i){
									this.parseText(template.substring(textBeginIndex, i));
									textBeginIndex=-1;
								}
							 }		
							 this.parseCode(template.substring(codeBeginIndex, codeEndIndex),0);
							 
							 return this.parseTemplate(template,codeEndIndex+2);
						 }	
					}
				}else if(c==='$'&&template.charAt(i + 1) === '('){
					let expBeginIndex = i + 2;
					let expEndIndex=expBeginIndex;
					let nestingExpCount=1;
					//find the code end
					for(;expEndIndex<z;expEndIndex++){
						c=template.charAt(expEndIndex);
						
						if(c==='$'&&template.charAt(expEndIndex + 1) === '(') {
							nestingExpCount++;
							console.log(nestingExpCount);
						}else if(c === ')') {
							nestingExpCount--;
							
							if(nestingExpCount<=0){
								//handle the text
								if (textBeginIndex>=0) {
									if(textBeginIndex!==i){
										this.parseText(template.substring(textBeginIndex, i));
										textBeginIndex=-1;
									}
								}	
								this.parseExpInText(template.substring(expBeginIndex, expEndIndex));
								this.parseTemplate(template,expEndIndex+1);
								return;
							}	
						}	
					}
				}else{
					if(textBeginIndex===-1){
						textBeginIndex=i;
					}
				}
			}//end for
		},
           
		parseCode: function (code,begin) {
			console.log(begin)
            let codeBeginIndex =-1;
            for (let i= begin, z = code.length,c; i < z; i++) {
                c = code.charAt(i);
				if(c==='$'&&code.charAt(i + 1) === '('){
					let expBeginIndex = i + 2;
					let expEndIndex=expBeginIndex;
					let nestingExpCount=1;
					//find the code end
					for(;expEndIndex<z;expEndIndex++){
						c=code.charAt(expEndIndex);
						if(c=== '$'&&code.charAt(expEndIndex + 1) === '(') {
							nestingExpCount++;							
						}else if(c === ')') {
							nestingExpCount--;
							if(nestingExpCount<=0){
								//handle the text
								if (codeBeginIndex>=0) {
									if(codeBeginIndex!==i){
										this.push(code.substring(codeBeginIndex, i));
										codeBeginIndex=-1;
									}
								}	
								this.parseExpInCode(code.substring(expBeginIndex, expEndIndex));
								return this.parseCode(code,expEndIndex+1);
							}	
						}	
					}
					
				}else{
					if(codeBeginIndex===-1){
						codeBeginIndex=i;
					}
				}
			}
			if (codeBeginIndex>=0) {
				this.push(code.substr(codeBeginIndex));
			}	
        },
		
        parseExpInText: function (exp) {
			console.log(exp);
            this.push("_+=$(" + exp + ");");
        },
        parseExpInCode:function (exp) {
            this.push("_+=$(" + exp + ")");
        },
        parseText: function (txt) {
            //双引号转义
            txt = txt.replace(/"/g, '\\"');
            //换行符分割
            const lines = txt.split(/\r?\n/);
            if (lines.length > 0) {
                let i = 0, z = lines.length - 1;
                while (i < z) {
                    //一行一行输出,每行多输出一个换行
                    this.push('_+="' + lines[i++] + '\\r\\n";\n');
                }
                this.push('_+="' + lines[z] + '";');
            }
        }

    };
	
	
    window.addEventListener("load",function(){
      //通过<script type="text/template">标签构建模板方法
        let templates = document.querySelectorAll("script[type='text/template']");
        Array.prototype.forEach.call(templates, function (t) {
            let templateHTML = t.innerHTML;
            let id = t.getAttribute("id");
            let tf = new TemplateFunction(id, templateHTML);
			//直接把模板id暴露为window下方法
			window[tf.functionName]=tf.build();
        });
    },false);
    
})(window, document);
