document.addEventListener("DOMContentLoaded", allowLoading, false);

const WEEKLY = "Weekly", MONTHLY = "Monthly", YEARLY = "Yearly";
const MIN_YEAR = 2013;
const lat_min = 62.345252708439276, lat_max = 62.61474729156072, lng_min = 5.978375939307136,
    lng_max = 6.561624060692863; //Svinøya 30x30

let interval = YEARLY;
let timeline;
let timelineSlider;
let box;
let isInit = true;
const colorList = {
    "All": "#DC143C",
    "Fishery": "#0000FF",
}
const catagories = ["All", ["Fishery"]];

function allowLoading() { // Source: File API
    visualize(true);

    L.control.custom({
        position: 'topleft',
        content: '<b>Type:</b><input type="radio" id="points" name="type" value="points" checked><label for="points">Points</label>' +
            '<input type="radio" id="grid" name="type" value="grid"><label for="grid">Grid</label>',
        events:
        {
            change: event => {
                visualize(false);
            },
        }
    }).addTo(wasteMap);

    L.control.custom({
        position: 'topleft',
        content: "<b>From:</b><select id='from-year-dropdown'></select>&nbsp;" +
            "<b>To:</b><select id='to-year-dropdown'></select>",
        events:
        {
            change: event => {
                visualize(false);
            },
        }
    }).addTo(wasteMap);

    fill_options(document.getElementById('from-year-dropdown'));
    fill_options(document.getElementById('to-year-dropdown'));

    L.control.timelineSlider({
        position: "topleft",
        timelineItems: [YEARLY, MONTHLY, WEEKLY],
        extraChangeMapParams: {},
        changeMap: changeMapFunction
    }).addTo(wasteMap);


    L.control.custom({
        position: 'topleft',
        content: '<b>Prediction:</b><input type="radio" id="prediction_on" name="type2" value="prediction_on" checked><label for="prediction_on">On</label>' +
            '<input type="radio" id="prediction_off" name="type2" value="prediction_off"><label for="prediction_off">Off</label>',
        events:
        {
            change: event => {
                console.log(event);
                visualize(false);
            },
        }
    }).addTo(wasteMap);

    L.control.custom({
        position: 'topleft',
        content: "<b>category:</b><select id='category'></select>",
        events:
        {
            change: event => {
                visualize(false);
            },
        }
    }).addTo(wasteMap);

    fill_category_options(document.getElementById('category'));


    box = L.control.messagebox({ position: "topleft" }).addTo(wasteMap);

    isInit = false;
}

const fill_options = select => {
    //let max = moment().year();
    let max = 2022;
    for (let i = MIN_YEAR; i <= max; i++) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.innerHTML = i;
        if (i === 2020) {
            opt.setAttribute("selected", "selected");
        }
        select.appendChild(opt);
    }
};

const fill_category_options = select => {
    //let max = moment().year();
    let max = catagories.length;
    for (let i = 0; i < max; i++) {
        const opt = document.createElement("option");
        opt.value = catagories [i];
        opt.innerHTML = catagories[i];
        if (i === 0) {
            opt.setAttribute("selected", "selected");
        }

        select.appendChild(opt);
    }
};


const changeMapFunction = obj => {
    interval = obj.label;
    if (!isInit) {
        visualize(false);
    }
};

const getDate = instance => instance.format("YYYY-MM-DD HH:mm");

function createTimeline(features) {
    if (features.features.length > 0) {
        let endDate = features.features[features.features.length-1].properties.end;
        for (let i = 0; i<features.features.length; i++){
            features.features[i].properties.end = endDate;
            //features.features[i].properties.fillOpacity *= colorList[document.getElementById('category').value];
        }
       
        let featureTimeline = L.timeline(features, {
            pointToLayer: function (feature, latlng) {
                console.log(feature.properties.color);
                return L.circleMarker(latlng, {
                    radius: feature.properties.radius,
                });
            },
            style: feature => ({
                color: colorList[document.getElementById('category').value],
                weight: feature.properties.weight,
                // fillOpacity: 0.1
                fillOpacity: 0.5 * feature.properties.fillOpacity
            }),
            onEachFeature: (feature, layer) => {
                layer.bindPopup(layer.feature.properties.description);
            }
        }).addTo(wasteMap);
        //console.log(featureTimeline)

        let slider = L.timelineSliderControl({
            formatOutput: date => getDate(moment(date)),
            showTicks: false
        });
        wasteMap.addControl(slider);

        slider.addTimelines(featureTimeline);
        timeline = featureTimeline;
        timelineSlider = slider;
    } else {
        box.show("<b>No data</b>");
    }

}

const log_normalized_radius = (enteredValue, minEntry, maxEntry, normalizedMin, normalizedMax) => {
    let mx = (Math.log((enteredValue - minEntry)) / (Math.log(maxEntry - minEntry)));
    const preshiftNormalized = mx * (normalizedMax - normalizedMin);
    return preshiftNormalized + normalizedMin;
};

const visualize = isInit => {
    // let from = moment().year();
    let from = 2020;
    let to = from;
    let isPoints = false;
    let isPredicted = false;
    let category_check = "All";
    if (!isInit) {
        wasteMap.removeControl(timelineSlider);
        wasteMap.removeLayer(timeline);
        let from_select = document.getElementById('from-year-dropdown'),
            to_select = document.getElementById('to-year-dropdown');

        from = parseInt(from_select.value);
        to = parseInt(to_select.value);
        if (from > to) {
            box.show("<b>Please select a valid year range</b>");
            return;
        }
        let points = document.getElementById('points');
        isPoints = points !== null && points.checked;

        let prediction_check = document.getElementById('prediction_on');
        isPredicted = prediction_check !== null && prediction_check.checked;

        category_check = document.getElementById('category').value;
        //isPredicted = prediction_check !== null && prediction_check.checked;

    }

    // createLayers(from, to, isPoints || isInit);
    createPredictionLayers(from, to, isPredicted || isInit, isPoints || isInit, category_check);
};

const createLayers = (from, to, isPoints) => {
    let filePath = "";
    if (isPoints) {
        filePath = "data/PlastOPol/plast_o_pol_data/points_data/points_" + from + "_" + to + "_" + interval + ".json";
    } else {
        filePath = "data/PlastOPol/plast_o_pol_data/plast_data/cells_" + from + "_" + to + "_" + interval + ".json";
    }
    wasteMap.spin(true);
    fetch(filePath)
        .then(response => response.text())
        .then(data => {
            let features = JSON.parse(data);
            createTimeline(features);
            wasteMap.spin(false);
        });
    wasteMap.fitBounds([[lat_min - 0.05, lng_min - 0.05], [lat_max + 0.05, lng_max + 0.05]]);
};

const createPredictionLayers = (from, to, isPredicted, isPoints,category_check) => {
    let filePath = "";
    if (isPoints) {
        filePath = "data/PlastOPol/plast_o_pol_data/points_data/points_" + from + "_" + to + "_" + interval + ".json";
    }
    // else {
    //     filePath = "data/PlastOPol/plast_o_pol_data/plast_data/cells_" + from + "_" + to + "_" + interval + ".json";
    // }
    // else if (isPoints & isPredicted) {
    //     filePath = "data/PlastOPol/plast_o_pol_data/pred_points_data/points_" + from + "_" + to + "_" + interval + ".json";
    // } 
    // else if (!isPoints && !isPredicted) {
    //     filePath = "data/PlastOPol/plast_o_pol_data/pred_data/cells_" + from + "_" + to + "_" + interval + ".json";
    // }
    else {
        if(!isPredicted){
            filePath = "data/PlastOPol/plast_o_pol_data/pred_data/cells_" + from + "_" + to + "_" + interval + ".json";
        }
        else{
            if(category_check == "Fishery"){
                filePath = "pred_data/cells_" + from + "_" + to + "_" + interval + "predict_fish.json";
            }
        }
        
    }

    wasteMap.spin(true);
    fetch(filePath)
        .then(response => response.text())
        .then(data => {
            let features = JSON.parse(data);
            createTimeline(features);
            wasteMap.spin(false);
        });
    wasteMap.fitBounds([[lat_min - 0.05, lng_min - 0.05], [lat_max + 0.05, lng_max + 0.05]]);
};