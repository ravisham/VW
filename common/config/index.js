var path 	= require('path'),
    util 	= require('util'),
    _ 		= require('underscore'),
    colors = require('libs/colors'),
    debug = require("libs/buglog"),
    log = debug("configurations");

function requireConfig(configDir, version) {
    var config = {};
    var verPath = path.join(configDir, version);
    verPath = path.normalize(verPath);

    console.log('/common/config/index.js - requireConfig loading', version, 'settings from', verPath);
    try {
        config = require(verPath);
    } catch (err) {
        console.log('Unable to import settings from', verPath);
        log(util.format('Couldn\'t find or module doesn\'t export environmental config for "%s"@%s in %s - returning empty\n', version, verPath, configDir), err);
        config = {};
    }
    return config;
}

function config(configDir, env) {
    env = env || 'local';

    var all = requireConfig(configDir, 'all');

    log("Getting config settings from " + colors.green("%s/%s"), configDir, env);

    var config = requireConfig(configDir, env);

    var settings = _.extend(all, config);

    settings.environment = env;

    if (process.env.VERBOSE) {
        log('Running with configurations...\n', util.inspect(settings, {
            depth: null,
            colors: true
        }));
    }

    return settings;
}

function configurator(envDir, env) {
    var local = config(envDir, env || process.env.NODE_ENV);

    var settings = _.extend({}, local || {});

    var allowable = requireConfig(envDir, 'ok');

    allowable = _.extend(allowable, settings);

    settings.allowable = function() {
        return allowable;
    };

    return settings;
}

module.exports.localized = config;
module.exports.settings = configurator;


function envToJsKey(key) {
    if (key === '_')
        return key;
    var parts = key.split('_');
    var set = '';
    var missing = 0;
    parts.forEach(function(p, i) {
        if (!p) {
            missing++;
            return;
        }
        if (!(i - missing))
            set = p.toLowerCase();
        else
            set += p.slice(0, 1).toUpperCase() + p.slice(1).toLowerCase();
    });
    return set;
}

function tryParseJSON(val) {
    var newVal = null;
    if (typeof val !== 'string')
        return val;
    if (/^[\],:{}\s]*$/.test(val.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
        //the json is ok to try
        try {
            newVal = JSON.parse(val);
        } catch (e) {
            newVal = null;
        }
    }
    return newVal !== null ? newVal : val;
};

module.exports.tryParseJSON = tryParseJSON;

function convertEnv(key, include) {
    if (include === false)
        return false;
    if (!include || include === true)
        return true;

    if (_.isArray(include)) {
        if (!include.length)
            return true;
        return _.indexOf(include, key) > -1;
    }
    return true;
}

function envParser(matcher, custom, include) {
    var variables = {};
    var current = '';
    var keys = [];
    var isIncludeHash = _.isObject(include);
    matcher = matcher || _.noop;
    var curMatch = '';

    for (var key in process.env) {
        curMatch = matcher(key) || '';
        if (!convertEnv(key, include) && !curMatch)
            continue;

        keys = key.split('__');
        if (!keys || !keys.length) {
            continue;
        } else {
            if (curMatch) {
                custom(curMatch, key, process.env[key], variables);
            } else {
                var curVar = variables;
                var curInclude = isIncludeHash ? include : {};
                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i];
                    if (!k)
                        continue;
                    current = envToJsKey(k);
                    if (isIncludeHash && _.isUndefined(curInclude[current]))
                        break;
                    if (keys.length - 1 === i) {
                        curVar[current] = tryParseJSON(process.env[key]);
                    } else {
                        if (typeof curVar[current] === 'undefined')
                            curVar[current] = {};
                        curVar = curVar[current];
                        curInclude = curInclude[current];
                    }
                }
            }
        }
    }

    return variables;
};

module.exports.env = envParser;

function matchDockerLinkName(key, expectedLinks) {
    var parts = key.split('_');
    if (parts.length !== 2)
        return false;
    if (parts[1] !== 'NAME')
        return false;
    if (!expectedLinks.length)
        return parts[0];
    if (_.indexOf(expectedLinks, parts[0]) > -1)
        return parts[0];
    return false;
}

function matchDockerLinkPort(key, expectedLinks) {
    var hasPort = key.indexOf('_PORT_', 1);
    var link = hasPort < 0 ? '' : key.substring(0, hasPort);
    if (hasPort < 0)
        return false;
    if ((key.indexOf('_TCP', hasPort) > 0) || (key.indexOf('_UDP', hasPort) > 0)) {
        if (!expectedLinks.length)
            return link;
        if (_.indexOf(expectedLinks, link) > -1)
            return link;
    }
    return false;
}

function matchDockerLink(key, expectedLinks) {
    expectedLinks = expectedLinks || [];
    expectedLinks = !_.isArray(expectedLinks) ? [expectedLinks] : expectedLinks;
    var link = matchDockerLinkName(key, expectedLinks);
    if (!link)
        link = matchDockerLinkPort(key, expectedLinks);
    return link;
}

function customizeDockerLinks(link, key, val, envVars) {
    var remains = key.replace(link, '');
    var name = envToJsKey(link);
    if (!envVars[name])
        envVars[name] = {};
    if (link + '_NAME' === key) {
        envVars[name].name = val;
        envVars[name].host = _.chain(val.split('/')).filter(function(v) {
            return v;
        }).rest().reduce(function(r, v) {
            if (!r)
                return v;
            return r + '/' + v;
        }, '').value();
        return;
    }
    remains = remains.replace('_PORT_', '');
    var parts = _(remains.split('_')).filter(function(p) {
            return !!p;
        }).value();
    if (!envVars[name][parts[0]])
        envVars[name][parts[0]] = {};
    if (parts.length < 3) {
        envVars[name][parts[0]].url = val;
    } else {
        var remaining = parts.slice(2).join('_');
        remaining = envToJsKey(remaining);
        envVars[name][parts[0]][remaining] = val;
    }
}

module.exports.matchDockerLinkEnv = matchDockerLink;
module.exports.convertDockerLinkEnv = customizeDockerLinks;

var dockerEnv = envParser.bind(null, matchDockerLink, customizeDockerLinks);
module.exports.dockerEnv = dockerEnv;

// Leave here: used for testing Environment variable conversion to friendly JavaScript keys
// console.log('Env start:\n', process.env);
// console.log('Environment Settings:\n', module.exports.env(matchDockerLink, customizeDockerLinks, { nodeEnv: 1, verbose: 0, nested: { val: 9, twice: 8 } }));
// console.log('Docker Environment Settings:\n', module.exports.dockerEnv(['NODE_ENV', 'VERBOSE']));

function mergeSettings() {
    var precedence = Array.prototype.slice.call(arguments);
    if (!precedence || !precedence.length)
        return {};
    return _.chain(precedence).filter(function(p) {
            return p;
        }).map(function(p) {
            return !_.isFunction(p) ? p : p();
        }).reduce(function(merged, p) {
            return _.extend(merged, p);
        }, {}).value();
}

module.exports.mergeSettings = mergeSettings;

function defaultSettingsMerge(config, program) {
    _.mixin({
        capitalize: function(str) {
            return str.replace(/\w\S*/g, function(txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        }
    });
    return mergeSettings(config, function() {
        return dockerEnv(config.allowable ? config.allowable() : undefined);
    }, program);
}

module.exports.mergeSettingsDefault = defaultSettingsMerge;