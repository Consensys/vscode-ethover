'use strict';
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */

function makeCommandUri(command, args){
    return `command:${command}?${encodeURIComponent(JSON.stringify(args))}`;
}

class TimeoutCache {
    constructor(timeout){
        this.timeout = timeout;
        this.t = {};
        this.data = {};
    }

    set(prefix, key, value){
        this.t[`${prefix}+${key}`] = Date.now();
        this.data[`${prefix}+${key}`] = value;
    }

    get(prefix, key, def){
        return this.data[`${prefix}+${key}`] !== undefined ? this.data[`${prefix}+${key}`] : def;
    }
}

module.exports = {
    TimeoutCache,
    makeCommandUri
};