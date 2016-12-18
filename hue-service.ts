import * as log from 'fancy-log';
import * as colorstring from 'color-string';
import * as jsonfile from 'jsonfile';
import * as hue from 'node-hue-api';

// let TwitterPackage = require('twitter');

let HueApi = hue.HueApi,
    lightState = hue.lightState;

let config = jsonfile.readFileSync('./config.json');
let twitterConfig = config.twitterConfig;

let hueAPI = new HueApi(config.hueConfig.hostname, config.hueConfig.username);
// let Twitter = new TwitterPackage(twitterConfig);

let reply = config.reply;
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

// Twitter.stream('statuses/filter', { track: '#xmashue' }, function (stream) {
//     stream.on('data', function (tweet) {
//         log('Text: ' + tweet.text);
//         log('Username: ' + tweet.user.screen_name);

//         if (tweet.text.includes('rainbow')) {
//             for (let light of config.hueConfig.lights) {
//                 rainbowRoad(light);
//             }
//         } else {
//             if (tweet.text.includes('disco')) {
//                 disco = true;
//             } else {
//                 disco = false;
//             }
//             let transitionTime = disco ? config.transitionTimeDisco : config.transitionTime;
//             let colors = getColorsFromTweet(tweet.text);
//             let timeout = -1 * transitionTime;
//             for (let color of colors) {
//                 for (let light of config.hueConfig.lights) {
//                     let col = { red: color[0], green: color[1], blue: color[2] };
//                     setTimeout(() => { setLightToColor(light, col) }, timeout);
//                     timeout += transitionTime;
//                     log(timeout);
//                 }
//             }
//         }

//         if (reply) {
//             let name = pokemon.random();
//             let statusObj = {
//                 status: "Hi @" + tweet.user.screen_name + ", " + name + " says thanks!",
//                 in_reply_to_status_id: tweet.id
//             }

//             Twitter.post('statuses/update', statusObj, function (error, tweetReply, response) {
//                 if (error) {
//                     log(error);
//                 }
//                 log(tweetReply.text);
//             });
//         }
//     });

//     stream.on('error', function (error) {
//         log(error);
//     });
// });

export function setLightToColor(lightId: number, color: Color) {
    log(`Setting light id ${lightId} to color: `);
    log(color);

    let state = lightState.create().on().hsb(color.h, color.s, color.b);
    hueAPI.setLightState(lightId, state)
        .then(displayResult)
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

function getHue(philipsHue) {
    return Math.round((philipsHue.state.hue / ((256 * 256) - 1)) * 360);
}

function getSaturation(philipsHue) {
    return Math.round((philipsHue.state.sat / 255) * 100);
}

function getBrightness(philipsHue) {
    return Math.round((philipsHue.state.bri / 255) * 100);
}

let displayResult = function (result) {
    if (result === "true") {
        log('Light succesfully changed state');
    }
};