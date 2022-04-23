const utils = require("./utils");
const filePath = "../database.csv";
const moment = require("moment");
const lat_min = 62.345252708439276, lat_max = 62.61474729156072, lng_min = 5.978375939307136,
    lng_max = 6.561624060692863; //Svinøya 30x30

const createPointFeatures = (points_collection, period, weight_max, weight_min) => {
    let features_collection = {
        type: "FeatureCollection",
        features: []
    };

    // Drop points in a rectangular cell on a timeline
    for (let k = 0; k < points_collection.length; k++) {
        let data = points_collection[k];
        let points = data.points;
        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            let dataString = `Coordinates: [${utils.getTruncatedFloat(point.lat)}, ${utils.getTruncatedFloat(point.lng)}]<br>Weight: ${point.alt} kg`;
            let feature = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [point.lng, point.lat]
                },
                properties: {
                    start: data.start,
                    end: data.end,
                    color: "#FF0000",
                    weight: 0,
                    fillOpacity: 0.6,
                    description: dataString,
                    points: points,
                    radius: utils.logNormalizedRadius(point.alt, weight_min - 1, weight_max, 5, 25)
                }
            };
            features_collection.features.push(feature);
        }
    }
    return features_collection;
};

const createPoints = (results, from, to, period) => {
    console.log(from, to, period);

    let weight_max = null;
    let weight_min = null;
    let points_collection = [];

    let timelineData = utils.setupTimeline(from, to, period);
    let start_date = timelineData.start;

    let end_date = moment(start_date);
    while (start_date < timelineData.end) {
        if (period === utils.WEEKLY) {
            end_date.endOf("isoWeek");
            if (end_date.year() > to) {
                end_date.subtract(1, "y").endOf("y");
            }
        } else if (period === utils.MONTHLY) {
            end_date.endOf("M");
        } else {
            end_date.endOf("y");
        }

        let weight = 0;
        let points = [];

        for (let i = 1; i < results.length; i++) {
            if (i < 932 || i > 17798) {
                continue;
            }
            let data = results[i];
            let lat_data = data.latitude;
            let lng_data = data.longitude;
            let date = moment(data.date);
            if (lat_data > lat_min && lat_data <= lat_max && lng_data > lng_min && lng_data <= lng_max
                && date > start_date && date <= end_date) {
                let weight_data = data.weight;
                if (weight_data.trim() !== "") {
                    weight = parseFloat(weight_data);
                }

                if (weight > 0) {
                    let point = { lat: lat_data, lng: lng_data };
                    if (weight_max === null || weight > weight_max) {
                        weight_max = weight;
                    }
                    if (weight_min === null || weight < weight_min) {
                        weight_min = weight;
                    }
                    point.alt = weight;
                    points.push(point);
                }
            }
        }

        if (points.length > 0) {
            let data = { points: points, start: utils.getDate(start_date), end: utils.getDate(end_date) };
            points_collection.push(data);
        }

        if (period === utils.WEEKLY) {
            start_date = moment(end_date).add(1, "s");
            end_date = moment(start_date);
        } else if (period === utils.MONTHLY) {
            end_date.add(1, "M");
            start_date.add(1, "M");
        } else {
            end_date.add(1, "y");
            start_date.add(1, "y");
        }
    }

    let features = createPointFeatures(points_collection, period, weight_max, weight_min);

    let dir_path = "points_data/";
    utils.createDirectory(dir_path);
    utils.writeJSONToFile(features, dir_path + "points_" + from + "_" + to + "_" + period + ".json");
};

const preComputePointsData = results => {
    for (let period of utils.periods) {
        let max_year = moment().year();
        for (let i = max_year; i >= utils.MIN_YEAR; i--) {
            for (let j = i; j >= utils.MIN_YEAR; j--) {
                createPoints(results, j, i, period);
            }
        }
    }
};

utils.readCsv(filePath, results => preComputePointsData(results));
