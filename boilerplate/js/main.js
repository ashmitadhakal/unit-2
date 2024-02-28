/* Map of GeoJSON data from MegaCities.geojson */
//declare map var in global scope
var map;
var minValue;
//Step 1. Create the Leaflet map--already done in createMap()
//function to instantiate the Leaflet map
function createMap(){
    //create the map
    map = L.map('mapid', {
        center: [20, 0],
        zoom: 2
    });

    //add OSM base tilelayer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    //call getData function
    getData(map);
};

//Function to calculate minimum value of arrar for Flannery scaling
function calcMinValue(data){
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
     //get minimum value of our array
     var minValue = Math.min(...allValues)
     //console.log(minValue)
     return minValue;
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 0.5;
    //Flannery Appearance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius
    return radius;
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
   var popupContent = "<p><b>Country:</b> " + feature.properties.Country_Name + "</p><p><b>" + "Import value for "+ attribute +": "+"</b>"+ feature.properties[attribute] +" Million USD" + "</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent,{
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

//lesson 3: Step 1: Create new sequence controls
function createSequenceControls(attributes){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);
    //set slider attributes
    document.querySelector(".range-slider").max = 6;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;
    document.querySelector('#panel').insertAdjacentHTML('beforeend',"<button class='step' id='reverse'><img src='img/left.png'></button>");
    document.querySelector('#panel').insertAdjacentHTML('beforeend',"<button class='step' id='forward'><img src='img/right.png'></button>");
    //Step 5: click listener for buttons
    document.querySelectorAll('.step').forEach(function(step){
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
            document.querySelector('.range-slider').value = index;
            console.log(index);
            updatePropSymbols(attributes[index]);
        })
    })
    //Step 5: input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){            
        //Step 6: get the new index value
        var index = this.value;
        updatePropSymbols(attributes[index]);
        console.log(index)
    });
};

//Step 10: Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add city to popup content string
            var popupContent = "<p><b>Country:</b> " + props.Country_Name + "</p>";

            //add formatted attribute to panel content string
            //var year = attribute[0];
            popupContent += "<p><b>Import value in " + attribute + ":</b> " + props[attribute] + " million USD</p>";

            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
        });
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
    console.log(attributes);

    return attributes;
};
//Step 2. Import GeoJSON data--already done in getData()
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
            minValue=calcMinValue(json);
            //call function to create proportional symbols
            createPropSymbols(json,attributes);
            createSequenceControls(attributes);
        })  
};

document.addEventListener('DOMContentLoaded',createMap)