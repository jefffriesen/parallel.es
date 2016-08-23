// Karma configuration
// Generated on Mon Aug 15 2016 13:48:58 GMT+0200 (CEST)

var webpackConfig = require("./webpack.config");
var process = require("process");

var travis = process.env.TRAVIS;

webpackConfig.entry = {};
webpackConfig.module.postLoaders = [
    {
        test: /\.ts$/,
        exclude: /(test|node_modules|bower_components)[\/\\]/,
        loader: 'istanbul-instrumenter'
    }
];

module.exports = function (config) {

    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['jasmine'],

        // list of files / patterns to load in the browser
        files: [
            'test/tests.js'
        ],

        // list of files to exclude
        exclude: [],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            "test/tests.js": ["webpack", "sourcemap"]
        },

        webpack: webpackConfig,

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress', "coverage"],

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['Chrome', 'Firefox'],

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: travis ? 2 : undefined,

        coverageReporter: {
            reporters: [
                {type: 'lcov'},
                {
                    type: 'html',
                    dir: 'coverage/'
                }
            ],
            includeAllSources: true
        }
    });

    if (travis) {
        var customLaunchers = {
            // see https://saucelabs.com/platforms
            chrome_latest: {
                base: "SauceLabs",
                browserName: "Chrome",
                platform: "Windows 10",
                version: ""
            },
            firefox_latest: {
                base: "SauceLabs",
                browserName: "firefox",
                platform: "Windows 10",
                version: "latest"
            },
            opera_latest: {
                base: "SauceLabs",
                browserName: "opera",
                platform: "Windows 7",
                version: ""
            },
            ie_latest: {
                base: "SauceLabs",
                browserName: "internet explorer",
                platform: "Windows 10",
                version: ""
            },
            ie_10: {
                base: "SauceLabs",
                browserName: "internet explorer",
                platform: "Windows 7",
                version: "10"
            },
            edge_latest: {
                base: "SauceLabs",
                browserName: "microsoftedge",
                platform: "Windows 10",
                version: ""
            },
            safari_latest: {
                base: "SauceLabs",
                browserName: "safari",
                platform: "OS X 10.11",
                version: ""
            },
            ios_latest: {
                base: "SauceLabs",
                browserName: "iphone",
                deviceName: "iPhone 6",
                platform: "OS X 10.11",
                version: "9.3"
            },
            ios_8: {
                base: "SauceLabs",
                browserName: "iphone",
                deviceName: "iPhone 6",
                platform: "OS X 10.11",
                version: "8.4"
            },
            ios_7: {
                base: "SauceLabs",
                browserName: "iphone",
                deviceName: "iPhone 6",
                platform: "OS X 10.11",
                version: "7.1"
            },
            android_latest: {
                base: "SauceLabs",
                browserName: "android",
                deviceName: "Android Emulator",
                version: "5.1",
                platform: "Linux"
            },
            android_44: {
                base: "SauceLabs",
                browserName: "android",
                deviceName: "Android Emulator",
                version: "4.4",
                platform: "Linux"
            }
        };

        config.set({
            customLaunchers: customLaunchers,
            sauceLabs: {
                testName: 'Parallel.ES Tests',
                startConnect: false,
                tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER
            },
            browsers: Object.keys(customLaunchers),
            reporters: ['dots', 'coverage', 'saucelabs'],
            singleRun: true
        });
    }
};

