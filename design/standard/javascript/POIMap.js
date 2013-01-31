POIMap = function() {

}
POIMap.prototype = new XROWMap();

POIMap.prototype.constructor = POIMap;

POIMap.prototype.start = function(element) {
    this.init(element);//init parent Map 
    var styleMapOptions;
    this.markerLayer;
    this.popup;
    this.layerURL=[];
    this.map.layerLinkage=[];
    this.map.featureLinkage={};
    this.map.selectLayers=[];

    if (this.options.url != "false" || typeof(this.map.featureLayers) != 'undefined') {//if we have no url, render the default map

        this.markers.removeMarker(this.markers.markers[0]);// destroy Parent Marker
        for(var i in this.map.featureLayers)
        {
            switch(this.map.featureLayers[i].featureType)
            {
            case 'GeoRSS':
                if(this.map.featureLayers[i].layerAssets != undefined && this.map.featureLayers[i].layerAssets.src != undefined)
                {
                    styleMapOptions = {
                            graphicWidth : this.map.featureLayers[i].layerAssets.width,
                            graphicHeight : this.map.featureLayers[i].layerAssets.height,
                            graphicXOffset : this.map.featureLayers[i].layerAssets.xoffset,
                            graphicYOffset : this.map.featureLayers[i].layerAssets.yoffset,
                            externalGraphic : this.map.featureLayers[i].layerAssets.src,
                            pointRadius : "13",
                            cursor : 'pointer'
                        };
                }
                else
                {
                    styleMapOptions = {
                            graphicWidth : this.icon.size.w,
                            graphicHeight : this.icon.size.h,
                            graphicXOffset : this.icon.offset.x,
                            graphicYOffset : this.icon.offset.y,
                            externalGraphic : this.icon.url,
                            pointRadius : "13",
                            cursor : 'pointer'
                        };
                }
                this.styledPoint = new OpenLayers.StyleMap({
                    "default" : new OpenLayers.Style(styleMapOptions)});
                
                this.map.featureLayers[i].layer.addOptions({
                    format : OpenLayers.Format.GeoRSS,
                    styleMap : this.styledPoint
                });
                
                this.map.featureLayers[i].layer.featureType = this.map.featureLayers[i].featureType;
                this.map.selectLayers.push(this.map.featureLayers[i].layer);
                //add Linkage between contentobject an Feature on layer
                this.map.featureLayers[i].layer.events.register('featureadded', this.map.featureLayers[i].layer, function(event){
                    this.map.featureLinkage[$($(event.feature.attributes.description)[0]).data().id] = event.feature.geometry.id;
                });
              break;
            case 'GPX':
                that = this;
                $.ajaxSetup({
                    async: false
                    });
                $(".XROWMap").addClass("is_loading");
                $.get(""+this.map.GPXLayers[this.map.featureLayers[i].layer.id].url+"",{},function(xml){
                    that.map.featureLayers[i].layer.featureContent = {'attributes' : 
                                                                        {'description' : $(xml).find("item").find("description").text(), 
                                                                         'link': $(xml).find("item").find("link").text(),
                                                                         'title' : $(xml).find("item").find("title").text()
                                                                         }
                                                                      };
                    that.map.featureLayers[i].layer.featureURL = that.map.GPXLayers[that.map.featureLayers[i].layer.id].url;
                    that.map.featureLayers[i].layer.featureType = that.map.featureLayers[i].featureType;
                    startLonLat = new Proj4js.Point(that.map.GPXLayers[that.map.featureLayers[i].layer.id].start.lon, that.map.GPXLayers[that.map.featureLayers[i].layer.id].start.lat);
                    Proj4js.transform(new Proj4js.Proj(that.projection.projection), new Proj4js.Proj(that.projection.displayProjection), startLonLat);
                    that.map.featureLayers[i].layer.featurePoint = {'x' : startLonLat.x, 'y' : startLonLat.y};
                    $(".XROWMap").removeClass("is_loading");
                    });
                this.map.selectLayers.push(this.map.featureLayers[i].layer);
              break;
            case 'Shape':
                    if(typeof(this.layerURL[this.map.featureLayers[i].layer.url])!= 'object')
                    {
                        this.layerURL[this.map.featureLayers[i].layer.url] = new Array();
                    }
                    this.layerURL[this.map.featureLayers[i].layer.url][i] = this.map.featureLayers[i].layerName;
              break;
            }
//            this.map.featureLayers[i].layer.featureType = this.map.featureLayers[i].featureType;
//            this.map.selectLayers.push(this.map.featureLayers[i].layer);
            //add Linkage between contentobject an Feature on layer
//            this.map.featureLayers[i].layer.events.register('featureadded', this.map.featureLayers[i].layer, function(event){
//                this.map.featureLinkage[$($(event.feature.attributes.description)[0]).data().id] = event.feature.geometry.id;
//            });
        }
    }
    //@TODO: process getFeatureInfo only for the clicked Layer 
    for(var x in this.layerURL)
    {
        var tmp, map;
        map = this.map;
        tmp = this.layerURL[x];

        map.events.register('click', map, function(e) {
            xy = e.xy;
            params_new =
                {
                    REQUEST : "GetFeatureInfo",
                    EXCEPTIONS : "application/vnd.ogc.se_xml",
                    BBOX : map.getExtent().toBBOX(),
                    SERVICE : "WMS",
                    INFO_FORMAT : 'text/plain',
                    QUERY_LAYERS : tmp.join(', '),
                    FEATURE_COUNT : 100,
                    Layers : tmp.join(', '),
                    WIDTH : map.size.w,
                    HEIGHT : map.size.h,
                    format : 'image/png',
                    srs : map.layers[0].params.SRS
                };
                params_new.version = "1.1.1";
                params_new.x = parseInt(e.xy.x);
                params_new.y = parseInt(e.xy.y);
            OpenLayers.loadURL(
                    ""+x+"",
                    params_new, this, setHTML);
            OpenLayers.Event.stop(e);
        });
    }
    initPopups();
    this.map.render(element);
}

//all this stuff underneath here comes to MapUtils.js...later.
function initPopups()
{
    this.popupControl = new OpenLayers.Control.SelectFeature(
            this.map.map.selectLayers,
            {
                onSelect : function(feature) {
                    var description = "";
                    if(feature.layer.featureType == 'GPX')
                    {
                        this.pos = feature.geometry.components[feature.geometry.components.length/2];
                        if(typeof(this.pos) == 'undefined')
                        {
                            this.pos = feature.layer.featurePoint;
                        }
                        feature.attributes = feature.layer.featureContent.attributes;
                    }else
                    {
                        this.pos = feature.geometry;
                    }
                    
                    this.featureLonLat = new OpenLayers.LonLat(this.pos.x, this.pos.y);
                    this.map.setCenter(this.featureLonLat, 16);
                    
                    if(feature.attributes.description != 'No Description')
                    {
                        description = "<p>" + feature.attributes.description + "</p><br />";
                    }
                    
                    if (typeof this.popup != "undefined" && this.popup != null) {
                        this.map.removePopup(this.popup);
                    }
                    this.popup = new OpenLayers.Popup.FramedCloud("popup",
                            this.featureLonLat,
                            new OpenLayers.Size(200, 200), 
                            "<h2>" + feature.attributes.title + "</h2>" + description  + "<a href='" + feature.attributes.link + "' target='_blank'>mehr...</a>",
                            null, 
                            false
                        );
                    this.popup.calculateRelativePosition = function () {
                        return 'br';
                    }
                    this.map.addPopup(this.popup);
                    this.popup.events.register("click", this, popupDestroy);
                }
            });
    this.map.map.addControl(this.popupControl);
    this.popupControl.activate();
}


function setHTML(response) {
    var cat="", src="", leg="", linkinfo="", lines, vals, popup_info;

    if (response.responseText.indexOf('no features were found') == -1) {
        lines = response.responseText.split('\n');

        for (lcv = 0; lcv < (lines.length); lcv++) {
            vals = lines[lcv].replace(/^\s*/,'').replace(/\s*$/,'').replace(/ = /,"=").replace(/'/g,'').split('=');
            if (vals[1] == "") {
                vals[1] = "";
            }
            if (vals[0].indexOf('Name') != -1 ) {
                cat = vals[1];
            } else if (vals[0].indexOf('NAME') != -1 ) {
                cat = vals[1];
            } else if (vals[0].indexOf('SOURCE') != -1 ) {
                src = vals[1];
            } else if (vals[0].indexOf('INFO') != -1 ) {
                leg = vals[1];
            } else if (vals[0].indexOf('info') != -1 ) {
                 leg = vals[1];
            } else if (vals[0].indexOf('HREF') != -1 ) {
                if(vals[1]!='')
                {
                    linkinfo = "<br /><a href='" + vals[1] + "' target='_blank'>mehr...</a>";
                }
                
            }
        }
        popup_info = "<h2>" + cat +
                     "</h2><p>" + leg + "</p>"
                       + linkinfo;
        
        this.featureLonLat = this.getLonLatFromPixel(window.xy);
        this.setCenter(this.featureLonLat, 16);
        if (typeof this.popup != "undefined" && this.popup != null) {
            this.removePopup(this.popup);
        }
        this.popup = new OpenLayers.Popup.FramedCloud("popup",
                this.featureLonLat,
                new OpenLayers.Size(200, 200), 
                popup_info,
                null, 
                false);
        this.popup.calculateRelativePosition = function () {
            return 'br';
        }
        this.addPopup(this.popup);
        this.popup.events.register("click", this, popupDestroy);
    }
}

function popupDestroy(e) {
    if(this.popup != null)
    {
        this.popup.destroy();
        this.popup = null;
    }
    OpenLayers.Util.safeStopPropagation(e);
}

function initiate_geolocation() {
    navigator.geolocation.getCurrentPosition(handle_geolocation_query);  
}  

function handle_geolocation_query(position){
    if(typeof(window.currentPos)!= 'undefined')
    {
        window.currentPos.destroy();
    }
    if(position.coords.longitude != 0 && position.coords.latitude != 0)
    {
        var lonLat = new Proj4js.Point(position.coords.longitude, position.coords.latitude);
        Proj4js.transform(new Proj4js.Proj(window.map.projection.projection), new Proj4js.Proj(window.map.projection.displayProjection), lonLat);
        currentPos = new OpenLayers.Layer.Markers("Current Position", {rendererOptions : {zIndexing : true}});
        window.map.map.addLayer(currentPos);
        currentPos.setZIndex( 1001 );
        lonLat = new OpenLayers.LonLat(lonLat.x, lonLat.y);
        currentPos.addMarker(new OpenLayers.Marker(lonLat, new OpenLayers.Icon(window.map.mapOptions.assets.curPos.src, new OpenLayers.Size(window.map.mapOptions.assets.curPos.width, window.map.mapOptions.assets.curPos.height))));
        window.map.map.setCenter(lonLat, window.map.zoom);
    }

} 
