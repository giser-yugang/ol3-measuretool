/**
 * OpenLayers 3 MeasureTool Control.
 * See [the examples](./examples) for usage.
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object} opt_options Control options, extends olx.control.ControlOptions adding:
 *                              **`tipLabel`** `String` - the button tooltip.
 */
ol.control.MeasureTool = function(opt_options) {

  var options = opt_options || {};

  this.sphereradius = options.sphereradius ?
    options.sphereradius : 6378137;

  this.mapListeners = [];

  // hiddenclass
  this.hiddenClassName = 'ol-control MeasureTool';
  if (ol.control.MeasureTool.isTouchDevice_()) {
      this.hiddenClassName += ' touch';
  }
  // shownClass
  this.shownClassName = this.hiddenClassName + ' shown';

  var element = document.createElement('div');
  element.className = this.hiddenClassName;

  this.panel = document.createElement('ul');
  element.appendChild(this.panel);

  var ulheader = document.createElement('li');
  this.panel.appendChild(ulheader);

  var inputMeasure = document.createElement('input');
  inputMeasure.type = "button";
  ulheader.appendChild(inputMeasure);

  var ulbody = document.createElement('li');
  this.panel.appendChild(ulbody);

  var html = '';
  html += '<ul class="ulbody">';
  html += '<li><input type="button" value="Line"></li>';
  html += '<li><input type="button" value="Area"></li>';
  html += '<li><input type="checkbox" value="no"></li>';
  html += '</ul>';
  ulbody.innerHTML = html;

  var this_ = this;

  inputMeasure.onmouseover = function(e) {
    this_.showPanel();
  };
  inputMeasure.onclick = function(e) {
      e = e || window.event;
      this_.showPanel();
      e.preventDefault();
  };

  var lis = ulbody.getElementsByTagName("li");

  this.source = new ol.source.Vector();
  this.vector = new ol.layer.Vector({
    source: this.source,
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      }),
      stroke: new ol.style.Stroke({
        color: '#ffcc33',
        width: 2
      }),
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
          color: '#ffcc33'
        })
      })
    })
  });

  //type length or area
  var typeSelect={};
  //Line start
  lis[0].onclick = function(e) {
    typeSelect.value = 'length';
    typeSelect.check = lis[2].getElementsByTagName("input")[0].checked;
    this_.mapmeasure(typeSelect);
  };
  //Area start
  lis[1].onclick = function(e) {
    typeSelect.value = 'area';
    typeSelect.check = lis[2].getElementsByTagName("input")[0].checked;
    this_.mapmeasure(typeSelect);
  };

  this_.panel.onmouseout = function(e) {
      e = e || window.event;
      if (!this_.panel.contains(e.toElement || e.relatedTarget)) {
          this_.hidePanel();
      }
  };

  ol.control.Control.call(this, {
      element: element,
  });

};

ol.inherits(ol.control.MeasureTool, ol.control.Control);

ol.control.MeasureTool.prototype.mapmeasure = function(typeSelect) {
  var source = this.source;
  var vector = this.vector;
  var wgs84Sphere = new ol.Sphere(this.sphereradius);

  var sketch;
  var helpTooltipElement;
  var measureTooltipElement;
  var measureTooltip;

  var map = this.getMap();
  map.addLayer(vector);

  map.getViewport().addEventListener('mouseout', function() {
    helpTooltipElement.classList.add('hidden');
  });

  var draw; // global so we can remove it later

  var formatLength = function(line) {
    var length;
    if (typeSelect.check) {
      var coordinates = line.getCoordinates();
      length = 0;
      var sourceProj = map.getView().getProjection();
      for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
        var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326');
        var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
        length += wgs84Sphere.haversineDistance(c1, c2);
      }
    } else {
      var sourceProj = map.getView().getProjection();
      var geom = /** @type {ol.geom.Polygon} */(line.clone().transform(
          sourceProj, 'EPSG:3857'));
      length = Math.round(geom.getLength() * 100) / 100;
      // length = Math.round(line.getLength() * 100) / 100;
    }
    var output;
    if (length > 100) {
      output = (Math.round(length / 1000 * 100) / 100) +
          ' ' + 'km';
    } else {
      output = (Math.round(length * 100) / 100) +
          ' ' + 'm';
    }
    return output;
  };

  var formatArea = function(polygon) {
    if (typeSelect.check) {
      var sourceProj = map.getView().getProjection();
      var geom = /** @type {ol.geom.Polygon} */(polygon.clone().transform(
          sourceProj, 'EPSG:4326'));
      var coordinates = geom.getLinearRing(0).getCoordinates();
      area = Math.abs(wgs84Sphere.geodesicArea(coordinates));
    } else {
      var sourceProj = map.getView().getProjection();
      var geom = /** @type {ol.geom.Polygon} */(polygon.clone().transform(
          sourceProj, 'EPSG:3857'));
      area = geom.getArea();
      // area = polygon.getArea();
    }
    var output;
    if (area > 10000) {
      output = (Math.round(area / 1000000 * 100) / 100) +
          ' ' + 'km<sup>2</sup>';
    } else {
      output = (Math.round(area * 100) / 100) +
          ' ' + 'm<sup>2</sup>';
    }
    return output;
  };

  var popupcloser = document.createElement('a');
  popupcloser.href = 'javascript:void(0);';
  popupcloser.classList.add('ol-popup-closer');

  function addInteraction() {
    var type = (typeSelect.value == 'area' ? 'Polygon' : 'LineString');
    draw = new ol.interaction.Draw({
      source: source,
      type: /** @type {ol.geom.GeometryType} */ (type),
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
          color: 'rgba(0, 0, 0, 0.5)',
          lineDash: [10, 10],
          width: 2
        }),
        image: new ol.style.Circle({
          radius: 5,
          stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 0, 0.7)'
          }),
          fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
          })
        })
      })
    });
    map.addInteraction(draw);

    createMeasureTooltip();
    createHelpTooltip();

    var listener;
    draw.on('drawstart',
      function(evt) {
        // set sketch
        sketch = evt.feature;

        /** @type {ol.Coordinate|undefined} */
        var tooltipCoord = evt.coordinate;

        listener = sketch.getGeometry().on('change', function(evt) {
          try {
            var geom = evt.target;
            var output;
            if (geom instanceof ol.geom.Polygon) {
              output = formatArea(geom);
              tooltipCoord = geom.getInteriorPoint().getCoordinates();
            } else if (geom instanceof ol.geom.LineString) {
              output = formatLength(geom);
              tooltipCoord = geom.getLastCoordinate();
            }
            measureTooltipElement.innerHTML = output;
            measureTooltip.setPosition(tooltipCoord);
          } catch (e) {
            map.removeInteraction(draw);
          } finally {
          }

        });
      }, this);

    draw.on('drawend',
        function() {
          measureTooltipElement.appendChild(popupcloser);
          measureTooltipElement.className = 'tooltip tooltip-static';
          measureTooltip.setOffset([0, -7]);
          // unset sketch
          sketch = null;
          // unset tooltip so that a new one can be created
          measureTooltipElement = null;
          createMeasureTooltip();
          ol.Observable.unByKey(listener);
          //end
          map.removeInteraction(draw);
          // map.getInteractions().item(1).setActive(false);
        }, this);
  }

  function createHelpTooltip() {
    if (helpTooltipElement) {
      helpTooltipElement.parentNode.removeChild(helpTooltipElement);
    }
    helpTooltipElement = document.createElement('div');
    helpTooltipElement.className = 'tooltip hidden';
  }
  function createMeasureTooltip() {
    if (measureTooltipElement) {
      measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'tooltip tooltip-measure';
    measureTooltip = new ol.Overlay({
      element: measureTooltipElement,
      offset: [0, -15],
      positioning: 'bottom-center'
    });
    map.addOverlay(measureTooltip);
  }

  //clear
  popupcloser.onclick = function(e) {
    map.getOverlays().clear();
    vector.getSource().clear();
    // map.removeLayer(vector);
  };

  addInteraction();
};

/**
 * Show the MeasureTool.
 */
ol.control.MeasureTool.prototype.showPanel = function() {
    if (this.element.className != this.shownClassName) {
        this.element.className = this.shownClassName;
    }
};

/**
 * Hide the MeasureTool.
 */
ol.control.MeasureTool.prototype.hidePanel = function() {
    if (this.element.className != this.hiddenClassName) {
        this.element.className = this.hiddenClassName;
    }
};

/**
 * Set the map instance the control is associated with.
 * @param {ol.Map} map The map instance.
 */
ol.control.MeasureTool.prototype.setMap = function(map) {
    // Clean up listeners associated with the previous map
    for (var i = 0, key; i < this.mapListeners.length; i++) {
        this.getMap().unByKey(this.mapListeners[i]);
    }
    this.mapListeners.length = 0;
    // Wire up listeners etc. and store reference to new map
    ol.control.Control.prototype.setMap.call(this, map);
    if (map) {
        var this_ = this;
        this.mapListeners.push(map.on('pointerdown', function() {
            this_.hidePanel();
        }));
    }
};

/**
 * Generate a UUID
 * @returns {String} UUID
 *
 * Adapted from http://stackoverflow.com/a/2117523/526860
 */
ol.control.MeasureTool.uuid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

/**
* @private
* @desc Apply workaround to enable scrolling of overflowing content within an
* element. Adapted from https://gist.github.com/chrismbarr/4107472
*/
ol.control.MeasureTool.enableTouchScroll_ = function(elm) {
   if(ol.control.MeasureTool.isTouchDevice_()){
       var scrollStartPos = 0;
       elm.addEventListener("touchstart", function(event) {
           scrollStartPos = this.scrollTop + event.touches[0].pageY;
       }, false);
       elm.addEventListener("touchmove", function(event) {
           this.scrollTop = scrollStartPos - event.touches[0].pageY;
       }, false);
   }
};

/**
 * @private
 * @desc Determine if the current browser supports touch events. Adapted from
 * https://gist.github.com/chrismbarr/4107472
 */
ol.control.MeasureTool.isTouchDevice_ = function() {
    try {
        document.createEvent("TouchEvent");
        return true;
    } catch(e) {
        return false;
    }
};
