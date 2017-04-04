/**
 * Chart.js Simple Watermark plugin
 *
 * Valid options:
 *
 * options: {
 *      watermark: {
 *          // required
 *          image: new Image(),
 *
 *          x: 0,
 *          y: 0,
 *
 *          width: 0,
 *          height: 0,
 *
 *          alignX: "left"/"right",
 *          alignY: "top"/"bottom",
 *
 *          position: "front"/"back",
 *
 *          opacity: 0 to 1, // uses ctx.globalAlpha
 *      }
 * }
 *
 * Created by Sean on 12/19/2016.
 */

// https://github.com/chartjs/chartjs-plugin-zoom/blob/14590e77b58b10d65d25c4241bb71bd26a5383dd/src/chart.zoom.js#L9
// register as window global if used in browser
var Chart = require('chart.js');
Chart = typeof(Chart) === 'function' ? Chart : window.Chart;

var helpers = Chart.helpers;

var isPercentage = function (value) {
        return typeof(value) === "string" && value.charAt(value.length - 1) === "%";
    },
    calcPercentage = function (percentage, max) {
        var value = percentage.substr(0, percentage.length - 1);
        value = parseFloat(value);

        return max * (value / 100);
    },

    autoPercentage = function (value, maxIfPercentage) {
        if (isPercentage(value)) {
            value = calcPercentage(value, maxIfPercentage);
        }

        return value;
    },

    imageFromString = function (imageSrc) {
        // create the image object with this as our src
        var imageObj = new Image();
        imageObj.src = imageSrc;

        return imageObj;
    },

    drawWatermark = function (chartInstance, position, watermark) {
        // only draw watermarks meant for us
        if (watermark.position !== position) return;

        if (watermark.image) {
            var image = watermark.image;

            var context = chartInstance.chart.ctx;
            var canvas = context.canvas;

            var cHeight, cWidth;
            var offsetX = 0, offsetY = 0;

            if(watermark.alignToChartArea) {
                var chartArea = chartInstance.chartArea;

                cHeight = chartArea.bottom - chartArea.top;
                cWidth = chartArea.right - chartArea.left;

                offsetX = chartArea.left;
                offsetY = chartArea.top;
            } else {
                cHeight = canvas.clientHeight || canvas.height;
                cWidth = canvas.clientWidth || canvas.width;
            }

            var height = watermark.height || image.height;
            height = autoPercentage(height, cHeight);

            var width = watermark.width || image.width;
            width = autoPercentage(width, cWidth);

            var x = autoPercentage(watermark.x, cWidth);
            var y = autoPercentage(watermark.y, cHeight);

            switch (watermark.alignX) {
                case "right":
                    x = cWidth - x - width;
                    break;
                case "middle":
                    x = (cWidth / 2) - (width / 2) - x;
                    break;
            }

            switch (watermark.alignY) {
                case "bottom":
                    y = cHeight - y - height;
                    break;
                case "middle":
                    y = (cHeight / 2) - (height / 2) - y;
                    break;
            }

            // avoid unnecessary calls to context save/restore, just manually restore the single value we change
            var oldAlpha = context.globalAlpha;
            context.globalAlpha = watermark.opacity;

            context.drawImage(image, offsetX + x, offsetY + y, width, height);

            context.globalAlpha = oldAlpha;
        }
    },
    drawWatermarks = function(chartInstance, position) {
        helpers.each(chartInstance.watermarks, function(watermark) {
            drawWatermark(chartInstance, position, watermark);
        });
    };

var watermarkPlugin = {
    defaultOptions: function() {
        return {
            x: 0,
            y: 0,

            height: false,
            width: false,

            alignX: "top",
            alignY: "left",
            alignToChartArea: false,

            position: "front",

            opacity: 1,

            image: false,
        }
    },

    beforeInit: function (chartInstance) {
        var watermarks = [],
            me = this,
            options = chartInstance.options;

        var parseWatermark = function(watermark) {
            watermark = helpers.extend(me.defaultOptions(), watermark);

            if (watermark.image) {
                var image = watermark.image;

                if (typeof(image) === "string") {
                    image = imageFromString(image);
                }

                // automatically refresh the chart once the image has loaded (if necessary)
                // keep old load handlers
                var oldOnLoad = image.onload;
                image.onload = function () {
                    chartInstance.update();
                    if(oldOnLoad) oldOnLoad();
                };

                watermark.image = image;
            }

            watermarks.push(watermark);
        };

        // backwards compat
        if(options.watermark) parseWatermark(options.watermark);
        // multiple watermarks
        if (options.watermarks) helpers.each(options.watermarks, parseWatermark);

        chartInstance.watermarks = watermarks;
    },

    // draw the image behind most chart elements
    beforeDraw: function (chartInstance) {
        drawWatermarks(chartInstance, "back");
    },
    // draw the image in front of most chart elements
    afterDraw: function (chartInstance) {
        drawWatermarks(chartInstance, "front");
    },
};

module.exports = watermarkPlugin;
Chart.pluginService.register(watermarkPlugin);
