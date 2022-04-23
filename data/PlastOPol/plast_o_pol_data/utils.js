const fs = require("fs");
const csv = require("csv-parser");
const moment = require("moment");
const WEEKLY = "Weekly", MONTHLY = "Monthly", YEARLY = "Yearly";
const periods = [YEARLY, MONTHLY, WEEKLY];
const MIN_YEAR = 2013;

/* Replaced in python code */
const generateCells = (lat_min, lng_min, lat_max, lng_max, cell_rows, cell_columns) => {
    const half_cell_height = (lat_max - lat_min) / (2 * (cell_rows - 1));
    const half_cell_width = (lng_max - lng_min) / (2 * (cell_columns - 1));
    let lat_point = lat_min;
    let row_count = 0;
    let cells = [];
    while (row_count < cell_rows) {
        let lng_point = lng_min;
        let column_count = 0;
        while (column_count < cell_columns) {
            let lat_0 = lat_point - half_cell_height;
            let lng_0 = lng_point - half_cell_width;
            let lat_1 = lat_point + half_cell_height;
            let lng_1 = lng_point + half_cell_width;
            cells.push({latMin: lat_0, lngMin: lng_0, latMax: lat_1, lngMax: lng_1});
            lng_point += 2 * half_cell_width;
            column_count++;
        }
        lat_point += 2 * half_cell_height;
        row_count++;
    }
    return cells;
};

const setupTimeline = (from, to, period) => {
    let start_date = moment(from.toString(), "YYYY");
    let end_date = moment(to.toString(), "YYYY").add(1, "y");
    let current_date = moment();
    if (current_date.year() === to) {
        if (period === WEEKLY) {
            current_date.add(1, "w").startOf("isoWeek");
        } else if (period === MONTHLY) {
            current_date.add(1, "M").startOf("M");
        } else {
            current_date.add(1, "y").startOf("y");
        }
        end_date = current_date;
    }
    return {start: start_date, end: end_date}
};

const log_normalized_radius = (enteredValue, minEntry, maxEntry, normalizedMin, normalizedMax) => {
    let mx = (Math.log((enteredValue - minEntry)) / (Math.log(maxEntry - minEntry)));
    const preshiftNormalized = mx * (normalizedMax - normalizedMin);
    return preshiftNormalized + normalizedMin;
};

const readCsv = (filePath, callback) => {
    const results = [];
    return fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            console.log("CSV file read complete!");
            callback(results);
        });
};

const createDirectory = dir_path => {
    fs.mkdir(dir_path, {recursive: true}, (err) => {
        if (err) throw err;
    });
};

const writeJSONToFile = (features, fileName) => {
    const data = JSON.stringify(features);
    /* Async file write */
    fs.writeFile(fileName, data, (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved.");
    });
    // fs.writeFileSync(fileName, data);
};

const getDate = moment => moment.format("YYYY-MM-DD HH:mm");

const getTruncatedFloat = value => value.toString().match(/^-?\d+(?:\.\d{0,4})?/)[0];

exports.setupTimeline = setupTimeline;
exports.logNormalizedRadius = log_normalized_radius;
exports.writeJSONToFile = writeJSONToFile;
exports.getDate = getDate;
exports.getTruncatedFloat = getTruncatedFloat;
exports.generateCells = generateCells;
exports.createDirectory = createDirectory;
exports.readCsv = readCsv;
exports.WEEKLY = WEEKLY;
exports.MONTHLY = MONTHLY;
exports.YEARLY = YEARLY;
exports.MIN_YEAR = MIN_YEAR;
exports.periods = periods;
