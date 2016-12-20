# ol3-measuretool
Measuretool for OpenLayers 3（ol3测量工具）

##描述

基于Openlayers3所做的自定义控件，支持测量距离（line）和测量面积（area）以及geodesic测量

* 加载css和js文件后直接引用即可

* JavaScript原生编写

![image](https://github.com/giser-yugang/ol3-measuretool/blob/master/prtsc.jpg)

##引用方式：

```javascript 
  
var MeasureTool = new ol.control.MeasureTool({
  sphereradius : 6378137,//sphereradius
});
map.addControl(MeasureTool);
  
```

###*注意*：

1. geodesic测量的球体半径默认为6378137，使用时可根据不同情况在初始化时传入参数；

2. checkbox选中为使用geodesic测量，未选中为不使用geodesic测量，默认为未选中。
