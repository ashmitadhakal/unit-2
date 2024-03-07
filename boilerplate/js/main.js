/*Author: Ashmita, 2024 */
/* Map of GeoJSON data from ImportData.geojson */
//declare map var in global scope
var map;
var dataStats = {};  
var minValue;

//Constructor to display popup
function PopupContent(properties, attribute){
    this.properties = properties;
    this.attribute = attribute;
    this.year = attribute[1];
    this.import = this.properties[attribute];
    //"<p><b>Country:</b> " + props.Country_Name + "</p>";
    //"<p><b>Import value in " + attribute + ":</b> " + props[attribute] + " million USD</p>";
    this.formatted = "<p><b>Country:</b> " + properties.Country_Name + "<p><b>Import value in " + attribute + ":</b> " + properties[attribute] + " million USD</p>";
};
//1. Create the Leaflet map--already done in createMap()
//function to instantiate the Leaflet map
function createMap(){
    //create the map
    map = L.map('mapid', {
        center: [20, 0],
        zoom: 2
    });
    var container = L.DomUtil.create('div', 'legend-control-container');
    container.innerHTML = '<h3 class="temporalLegend">Import value in <span class="year">1995</span></h3>';
    
    //add OSM base tilelayer
    var Stadia_OSMBright = L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.{ext}', {
         minZoom: 0,
         maxZoom: 20,
            attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            ext: 'png'
    });
    var Esri_WorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
	        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    }).addTo(map);
    var Esri_WorldTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
	        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
        });
    
    var basemaps= {
        "Stadia OSM": Stadia_OSMBright,
        "ESRI World Street Map": Esri_WorldStreetMap,
        "ESRI World Topo Map": Esri_WorldTopoMap
    }
    let layerControl = L.control.layers(basemaps).addTo(map);
    getData(map);
};

//Import GeoJSON data
//function to retrieve the data and place it on the map
function getData(){
    //load the data
    fetch("data/ImportData.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            //create attribute array
            var attributes=processData(json);
            //calculate minimum value
            calcStats(json);
            //call function to create proportional symbols sequence control and legend
            createPropSymbols(json,attributes);
            createSequenceControls(attributes);
            createLegend(attributes);
        })  
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    //console.log(attribute);
    //create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
   var popupContent = new PopupContent(feature.properties,attribute)

    //bind the popup to the circle marker
    layer.bindPopup(popupContent.formatted,{
        offset: new L.Point(0,-options.radius)}
        );

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};
//Step 3: Add circle markers for point features to the map
function createPropSymbols(data, attributes){
    //create leaflet GeoJSON layer and add it to map
    L.geoJson(data, {
        pointToLayer: function(feature,latlng){
            return pointToLayer(feature,latlng,attributes)
        }
    }).addTo(map);
};

//Create new sequence controls
function createSequenceControls(attributes){   
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element (slider)
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')
           //st slider attribute
            container.querySelector(".range-slider").max = 6;
            container.querySelector(".range-slider").min = 0;
            container.querySelector(".range-slider").value = 0;
            container.querySelector(".range-slider").step = 1;

            //add skip buttons
            container.insertAdjacentHTML('beforeend','<button class="step" id="reverse" title="Reverse"><img src="img/left.png"></button>');
            container.insertAdjacentHTML('beforeend','<button class="step" id="forward" title="Forward"><img src="img/right.png"></button>');
            //Step 5: click listener for buttons
            container.querySelectorAll('.step').forEach(function(step){
                step.addEventListener("click", function(){
                    var index = document.querySelector('.range-slider').value;

                    //Step 6: increment or decrement depending on button clicked
                    if (step.id == 'forward'){
                        index++;
                        //Step 7: if past the last attribute, wrap around to first attribute
                        index = index > 6 ? 0 : index;
                    } else if (step.id == 'reverse'){
                        index--;
                        //Step 7: if past the first attribute, wrap around to last attribute
                        index = index < 0 ? 6 : index;
                        };

                        //Step 8: update slider
                        container.querySelector('.range-slider').value = index;
                        //console.log(index);
                        updatePropSymbols(attributes[index]);
                    })
                })
            //Step 5: input listener for slider
            container.querySelector('.range-slider').addEventListener('input', function(){            
                //Step 6: get the new index value
                var index = this.value;
                updatePropSymbols(attributes[index]);
                //console.log(index)
            });
            L.DomEvent.disableClickPropagation(container); //Disable click listener inside container
            return container;
        }
    });

    map.addControl(new SequenceControl());    // add listeners after adding control}
};


//Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //update the layer style and popup
            if (layer.feature && layer.feature.properties[attribute]){
                //access feature properties
                var props = layer.feature.properties;
    
                //update each feature's radius based on new attribute values
                var radius = calcPropRadius(props[attribute]);
                layer.setRadius(radius);
    
                //add city to popup content string
                var popupContent = new PopupContent(props,attribute);
    
                //change formatting
                //popupContent.formatted="<h2>"+popupContent.population+"millions </h2>"
                //update popup content            
                popup = layer.getPopup();            
                popup.setContent(popupContent.formatted).update();
        }
    }});
    updateLegend(attribute);
};


function createLegend(attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');
            container.innerHTML = '<h3 class="temporalLegend">Import value in <span class="year">1995</span></h3>';
            //1: start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="220px" height="200px">';

             //array of circle names to base loop on
            var circles = ["max", "mean", "min"];

            //2: loop to add each circle and text to svg string
            for (var i=0; i<circles.length; i++){
                //3: assign the r and cy attributes            
                var radius = calcPropRadius(dataStats[circles[i]]);           
                var cy = 113 - radius;            

                //circle string            
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="57"/>';

                //evenly space out labels            
                var textY = i * 25 +40;            

                //text string            
                svg += '<text id="' + circles[i] + '-text" x="116" y="' + textY + '">' + Math.round(dataStats[circles[i]]*10)/100 + " million($)" + '</text>';    
            };

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            container.insertAdjacentHTML('beforeend',svg);
            return container;
        }
    });

    map.addControl(new LegendControl());
};

function  updateLegend(attribute){
    var year = attribute;
    //update temporal legend
    document.querySelector("span.year").innerHTML = year;

    var allValues = [];
	map.eachLayer(function (layer) {
		if (layer.feature) {
			allValues.push(layer.feature.properties[attribute]);
		}
	});

	var circleValues = {
		min: Math.min(...allValues),
		max: Math.max(...allValues),
		mean: allValues.reduce(function (a, b) { return a + b; }) / allValues.length
	}

	for (var key in circleValues) {
		var radius = calcPropRadius(circleValues[key]);
		document.querySelector("#" + key).setAttribute("cy", 115 - radius);
		document.querySelector("#" + key).setAttribute("r", radius)
		document.querySelector("#" + key + "-text").textContent = Math.round(circleValues[key] * 100) / 100 + " million($)";
	}
}
//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 0.5;
    //Flannery Appearance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/dataStats.min,0.5715) * minRadius
    return radius;
};

//Function to calculate minimum value of arrar for Flannery scaling
function calcStats(data){
    //create empty array to store all values
    var allValues=[];
    //define the years to iterate over
    var years= [1995, 2005, 2010, 2015, 2020, 2021, 2022];
    //loop through each country
    for(var Country_Name of data.features){
        //loop through each year
        for(var i=0; i<years.length; i++){
            //get year from the list
            var year=years[i];
            //Get import value for current year
            var value= Country_Name.properties[String(year)];
            //add value to the array
            allValues.push(value);
        }
    }
    //console.log(allValues)
     //get minimum maximum  and mean value of our array
     dataStats.min = Math.min(...allValues)
     dataStats.max = Math.max(...allValues)
     var sum=allValues.reduce(function(a,b){return a+b});
     dataStats.mean=sum/allValues.length;
     //console.log(dataStats.min, dataStats.max, dataStats.mean)
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (!isNaN(attribute)){
            attributes.push(parseInt(attribute));
        }
    }
    //check result
    //console.log(attributes);

    return attributes;
};
document.addEventListener("DOMContentLoaded", function() {
    document.querySelector("#panel").insertAdjacentHTML('beforeend', '<p>This map is created as lab assignment (lab 1) for <b>Interactive Cartography and Geovisualization (GEOG 575)</b> course</p>');
    document.querySelector("#panel").insertAdjacentHTML('beforeend', '<p>I have created a proportional symbol map with different operators such as : overlay, sequence, zoom, and pan.</p>');
    document.querySelector("#panel").insertAdjacentHTML('beforeend', '<p><b>About this Map: </b>The map displays the import values for several countries between 1995 to 2022 and the data source is UN COMTRADE</p>');
    document.querySelector("#panel").insertAdjacentHTML('beforeend', '<h4>By: Ashmita Dhakal</h4>');


});
document.addEventListener('DOMContentLoaded',createMap)