const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body><canvas id="c"></canvas></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

const fabric = require('fabric').fabric;

console.log(fabric ? fabric.version : 'fabric not loaded this way');
