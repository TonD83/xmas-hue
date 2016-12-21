import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as hueService from './hue-service';
import * as log from 'fancy-log';
import * as colorstring from 'color-string';
import * as colorconvert from 'color-convert';
import * as jsonfile from 'jsonfile';
import * as kue from 'kue';
import * as rateLimit from 'express-rate-limit';

let queue = kue.createQueue();
let app = express();
let config = jsonfile.readFileSync('./config.json');

/* Kue setup */
kue.app.listen(3100);
queue.process('changeLightState', (job, done) => {
    processLightStateChange(job.data, done);
});

queue.on('error', (err) => {
    log('Kue error... ', err);
});

/* Express setup */
let apiLimiter = new rateLimit({
  windowMs: 1*60*60*1000, // 1 hour
  max: 6,
  delayMs: 0 // disabled 
});
app.use('/api/', apiLimiter);

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/api/v1/tree', (req, res) => {
    log('GET Request from address: ' + req.connection.remoteAddress);

    let item = req.headers;
    if (!item.apikey || !validateApiKey(item.apikey)) return res.status(401).send({ requestStatus: 'GTFO dear Cindy!' });

    getTreeStatus().then(treeStatusResponse => {
        res.send(treeStatusResponse);
    })
});

app.post('/api/v1/tree', (req, res) => {
    log('POST Request from address: ' + req.connection.remoteAddress);

    let item = req.body;
    let headers = req.headers;
    if (!headers.apikey || !validateApiKey(headers.apikey)) return res.status(401).send({ requestStatus: 'GTFO!' });
    if (!item.colors) return res.status(400).send({ requestStatus: 'colors is required' });
    if (item.colors.length == 0) return res.status(400).send({ requestStatus: 'you should specify at least 1 color' });

    let colors = item.colors;
    let disco = item.disco;

    if (disco && item.colors.length > 10) {
        item.colors = item.colors.slice(0,9);
    }

    let delayTime = disco ? config.transitionTimeDisco : config.transitionTime;

    let delay = 0;
    for (let color of colors) {
        if (typeof color === "string") {
            let name = color;
            let rgbColor = colorstring.get.rgb(color);
            if (rgbColor) {
                let hsbColor = colorconvert.rgb.hsv(rgbColor[0], rgbColor[1], rgbColor[2]);
                color = { h: hsbColor[0], s: hsbColor[1], b: hsbColor[2] };
                log(`String "${name}" converted to HSB color:`);
                log(color);
            } else {
                return res.status(400).send({ error: `Could not parse color "${name}"` });
            }
        }
        for (let light of config.hueConfig.lights) {
            let stateChangeJob = queue.create('changeLightState', {
                title: 'light state change job',
                lightId: light,
                color: color
            }).delay(delay)
                .save((err) => {
                    if (err) log(err);
                });
        }
        delay += delayTime;
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ requestStatus: 'OK, here we go!' }));

});

let server = app.listen(3000, () => {
    let host = server.address().address;
    host = (host === '::' ? 'localhost' : host);
    let port = server.address().port;

    log('listening at http://%s:%s', host, port);
});

function processLightStateChange(data, done) {
    if (!data.lightId || !data.color) {
        return done(new Error('lightId and color are required!'));
    }
    hueService.setLightToColor(data.lightId, data.color);
    log(`Processing job, set light with ID:${data.lightId} to color: `);
    log(data.color);
    done();
}

async function getTreeStatus() {
    let status = await hueService.getLightColor(2);
    return status;
}

function validateApiKey(key: string) {
    if (config.apiKeys.indexOf(key) >= 0) {
        return true;
    }
    return false;
}
