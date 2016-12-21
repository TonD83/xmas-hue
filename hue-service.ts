import * as log from 'fancy-log';
import * as colorstring from 'color-string';
import * as jsonfile from 'jsonfile';
import * as hue from 'node-hue-api';

let HueApi = hue.HueApi,
    lightState = hue.lightState;

let config = jsonfile.readFileSync('./config.json');
let hueAPI = new HueApi(config.hueConfig.hostname, config.hueConfig.username);

let disco: Boolean = false;

export interface Color {
    h: number,
    s: number,
    b: number
}

class TreeStatus {
    color: Color;
    on: boolean;
    effect: string;
}

export function setLightToColor(lightId: number, color: Color) {
    let state = lightState.create().on().hsb(color.h, color.s, color.b);
    hueAPI.setLightState(lightId, state)
        .then(displaySetLightStateResult)
        .catch(function (e) {
            log(e);
        })
        .done();
}

export function getLightColor(lightId: number) {
    let treeStatus: TreeStatus = new TreeStatus();

    return new Promise(function (resolve, reject) {
        hueAPI.lightStatus(lightId)
            .then((lightStatus) => {
                treeStatus.color = { h: getHue(lightStatus), s: getSaturation(lightStatus), b: getBrightness(lightStatus) };
                treeStatus.on = lightStatus.state.on;
                treeStatus.effect = lightStatus.state.effect;
                resolve(treeStatus);
            })
            .done();
    });
}

export function getLightStatus() {
    hueAPI.sensors()
    .then(displayResult)
    .done();
}

function getHue(philipsHue) {
    return Math.round((philipsHue.state.hue / ((256 * 256) - 1)) * 360);
}

function getSaturation(philipsHue) {
    return Math.round((philipsHue.state.sat / 255) * 100);
}

function getBrightness(philipsHue) {
    return Math.round((philipsHue.state.bri / 255) * 100);
}

let displaySetLightStateResult = function (result) {
    if (result == true) {
        log('Light succesfully changed state');
    } else {
        log(result);
    }
};

let displayResult = function(result) {
    log(JSON.stringify(result, null, 2));
};