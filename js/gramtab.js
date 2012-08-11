
var util = require('util');
var js = require('./jsutil');

function Morphy_GramTab_Empty() {
    function getGrammems(ancodeId) { return []; }
    function getPartOfSpeech(ancodeId) { return 0; }
    function resolveGrammemIds(ids) { return (!(ids instanceof Array)) ? [] : ''; }
    function resolvePartOfSpeechId(id) { return ''; }
    function includeConsts() { }
    function ancodeToString(ancodeId, commonAncode/* = null */) { return ''; }
    function stringToAncode(string) { return null; }
    function toString(partOfSpeechId, grammemIds) { return ''; }
}

function GramTab_Proxy(storage) {
    this.storage = storage;

    this.getGrammems = function(ancodeId) {
        return this.__obj.getGrammems(ancodeId);
    };
    
    this.getPartOfSpeech = function(ancodeId) {
        return this.__obj.getPartOfSpeech(ancodeId);
    };
    
    this.resolveGrammemIds = function(ids) {
        return this.__obj.resolveGrammemIds(ids);
    };
    
    this.resolvePartOfSpeechId = function(id) {
        return this.__obj.resolvePartOfSpeechId(id);
    };
    
    this.includeConsts = function() {
        return this.__obj.includeConsts();
    };

    this.ancodeToString = function(ancodeId, commonAncode/* = null */) {
        return this.__obj.ancodeToString(ancodeId, commonAncode);
    };
    
    this.stringToAncode = function(string) {
        return this.__obj.stringToAncode(string);
    };

    this.toString = function(partOfSpeechId, grammemIds) {
        return this.__obj.toString(partOfSpeechId, grammemIds);
    };

    this.__obj = new Morphy_GramTab(this.storage);
}
exports.GramTab_Proxy = GramTab_Proxy;
function Morphy_GramTab(storage) {

    this.getGrammems = function(ancodeId) {
        if(!this.ancodes[ancodeId]) {
            throw new Error("Invalid ancode id '" + ancodeId +"'");
        }
        result =[];
        var data = this.ancodes[ancodeId]['grammem_ids'];
        for (var idx in data)
        	result.push(data[idx]);
        return result;
    };

    this.getPartOfSpeech = function(ancodeId) {
        if(!this.ancodes[ancodeId]) {
            throw new Error("Invalid ancode id '" + ancodeId + "'");
        }
        return this.ancodes[ancodeId]['pos_id'];
    };
    
    this.resolveGrammemIds = function(ids) {
        if(ids instanceof Array) {
            var result = [];
            
            for(var id in ids) {
                if(!this.grammems[id]) {
                    throw new Error("Invalid grammem id 'id'");
                }
                
                result.push(this.grammems[id]['name']);
            }
            
            return result;
        } else {
            if(!this.grammems[ids]) {
                throw new Error("Invalid grammem id 'ids'");
            }
            
            return this.grammems[ids]['name'];
        }
    };
    
    this.resolvePartOfSpeechId = function(id) {
        if(!this.poses[id]) {
            throw new Error("Invalid part of speech id 'id'");
        }
        
        return this.poses[id]['name'];
    };
    
    this.includeConsts = function() {
        var gramtab_consts = require('./gramtab_consts');
    };

    this.ancodeToString = function(ancodeId, commonAncode/* = null */) {

        if(commonAncode) {
            commonAncode = this.getGrammems(commonAncode).join(',') + ',';
        }
        util.puts('HERE ' + this.getGrammems(ancodeId) )
        return
            this.getPartOfSpeech(ancodeId) + ' ' + commonAncode + this.getGrammems(ancodeId).join(',');
    };

    this.findAncode = function(partOfSpeech, grammems) {
    };

    this.stringToAncode = function(string) {
        if(!string) {
            return null;
        }

        if(!this.ancodes_map[string]) {
            throw new Error("Ancode with 'string' graminfo not found");
        }

        return this.ancodes_map[string];
    };

    this.toString = function(partOfSpeechId, grammemIds) {
        return partOfSpeechId + ' ' + grammemIds.join(',');
    };

    this.buildAncodesMap = function() {
        result = {};

        for(var ancode_id in this.ancodes) {
            key = this.toString(data['pos_id'], data['grammem_ids']);

            result[key] = ancode_id;
        }

        return result;
    };

    this.ancodes_map = this.buildAncodesMap();
    this.data = js.unserialize(storage.read(0, storage.getFileSize()));

    if(this.data == false) {
        throw new Error("Broken gramtab data");
    }

    this.grammems = this.data['grammems'];
    this.poses = this.data['poses'];
    this.ancodes = this.data['ancodes'];
}
