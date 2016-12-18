import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as hueService from './hue-service';
import * as log from 'fancy-log';
import * as colorstring from 'color-string';
import * as colorconvert from 'color-convert';
import * as jsonfile from 'jsonfile';

let app = express();
let config = jsonfile.readFileSync('./config.json');

app.use(bodyParser.json());

app.get('/tree', function (req, res) {
    log('GET Request from address: ' + req.connection.remoteAddress);
    getTreeStatus().then(treeStatusResponse => {
        res.send(treeStatusResponse);
    })
});

app.post('/tree', function (req, res) {
    log('POST Request from address: ' + req.connection.remoteAddress);

    var item = req.body;
    if (!item.colors) return res.send(400, { requestStatus: 'colors is required' });
    if (item.colors.length == 0) return res.send(400, { requestStatus: 'you should specify at least 1 color' });

    let colors = item.colors;
    let disco = item.disco;

    let delayTime = disco ? config.transitionTimeDisco : config.transitionTime;

    let delay = 0;
    for (let color of colors) {
        if (typeof color === "string") {
            let name = color;
            let rgbColor = colorstring.get.rgb(color);
            if (rgbColor) {
                let hsbColor = colorconvert.rgb.hsv(rgbColor[0], rgbColor[1], rgbColor[2]);
                color = { h: hsbColor[0], s: hsbColor[1], b: hsbColor[2] };
                log(`String "${name}" converted to HSB color h:${color.h} s:${color.s} b:${color.b}`);
                log(color);
            } else {
                return res.send(400, { error: `Could not parse color "${name}"` });
            }
        }
        for (let light of config.hueConfig.lights) {
            setTimeout(() => {
                hueService.setLightToColor(light, color)
            }, delay);
        }
        delay += delayTime;
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ requestStatus: 'OK, here we go!' }));

});

let server = app.listen(3000, function () {
    let host = server.address().address;
    host = (host === '::' ? 'localhost' : host);
    let port = server.address().port;

    log('listening at http://%s:%s', host, port);
});

async function getTreeStatus() {
    let status = await hueService.getLightColor(2);
    return status;
}