# js-template
html轻量级模板引擎

# how to use

```html
<tbody id="dataFoundTableBody">
                <script type="text/template" name="dataFoundTableTemplate(rows)">
                    <-for(var i=0,r;i< rows.length;i++){r=rows[i];->
                         <tr>
                            <td>$(i+1)</td>
                            <td>
                                <a href="../check/view.html?$(r.id)">查看</a>
                            </td>
                            <td>$(r.account)</td>
                            <td>$(r.name)</td>
                            <td>$(r.status===1?"正常":"停用")</td>
                            <td>$(Date.format(r.lastLoginTime))</td>
                        </tr>
                     <-}->
                </script>
</tbody>
```  

1. 使用一对 **&lt;-** 和 **-&gt;** 来插入js代码，使用$()执行表达式，$本质是内置的一个方法，即你也可以在其中调用其他js方法，如:

```
 <td>$(Date.format(r.lastLoginTime))</td>
```

2. 使用<script type="text/template" >来插入模板
3. 在script标签上定义name或id属性来定义模板名称(模板名称为成为绑定到window上的一个方法)，如:
  
```
<script type="text/template" name="dataFoundTableTemplate(rows)">
```
其中rows为外部传入参数， 可以直接在模板中使用

4. 模板使用
  
```
  var data=...;
  var html=dataFoundTableTemplate(data);//直接使用模板名称作为方法名
  $("#dataFoundTableBody").html(html);
```

##写在最后

写模板本质上是在window对象上定义一个方法。方法体为模板的内容，&lt;-和-gt;中为js代码，其他地方为字符串输出。
  
  
