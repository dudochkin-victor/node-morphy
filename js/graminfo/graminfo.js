
var fs = require('fs');
var util = require('util');
var js = require('../jsutil');

function Morphy_GramInfo(resource, header) {

	this.resource = resource;
	if (header)
	{
		this.header = header;
		
		this.ends = '\0\0' /*str_repeat("\0", header['char_size'] + 1)*/;
		this.ends_size = this.ends.length;
	}

	this.getLocale = function() {
		return this.header['lang'];
	};

	this.getEncoding = function() {
		return this.header['encoding'];
	};

	this.getCharSize = function() {
		return this.header['char_size'];
	};

	this.getEnds = function() {
		return this.ends;
	};

	this.getHeader = function() {
		return this.header;
	};

	this.cleanupCString = function(string) {
		if (false !== (pos = string.strpos(this.ends))) {
			string = string.substr(0, pos);
		}

		return string;
	};

	this.readSectionIndex = function(offset, count) {
	};

	this.readSectionIndexAsSize = function(offset, count, total_size) {
		if (!count) {
			return [];
		}

		index = this.readSectionIndex(offset, count);
		index[count] = index[0] + total_size;

		for (var i = 0; i < count; i++) {
			index[i] = index[i + 1] - index[i];
		}

		unset(index[count]);

		return index;
	};
};

function GramInfoCreate(/* Morphy_Storage */storage, lazy) {
	
	function readHeader(headerRaw) {
		header = js.unpack(
				'Vver/Vis_be/Vflex_count_old/'
						+ 'Vflex_offset/Vflex_size/Vflex_count/Vflex_index_offset/Vflex_index_size/'
						+ 'Vposes_offset/Vposes_size/Vposes_count/Vposes_index_offset/Vposes_index_size/'
						+ 'Vgrammems_offset/Vgrammems_size/Vgrammems_count/Vgrammems_index_offset/Vgrammems_index_size/'
						+ 'Vancodes_offset/Vancodes_size/Vancodes_count/Vancodes_index_offset/Vancodes_index_size/'
						+ 'Vchar_size/', headerRaw);

		offset = 24 * 4;
//		len = ord(headerRaw.substr(offset++, 1));
		len = headerRaw[offset++];
//		header['lang'] = rtrim(headerRaw.substr(offset,
//				len));
		header['lang'] = headerRaw.slice(offset, offset+len-1).toString();

		offset += len;
		len = headerRaw[offset++];
		header['encoding'] = headerRaw.slice(offset, offset+len-1).toString();
//		len = ord(headerRaw.substr(offset++, 1));
//		
//		header['encoding'] = rtrim(headerRaw.substr(
//				offset, len));
		return header;
	};
	
	function validateHeader(header) {
		if (3 != header['ver'] || 1 == header['is_be']) {
			return false;
		}
		return true;
	};
	
	var HEADER_SIZE = 128;
	if (lazy) {
		return new GramInfo_Proxy(storage);
	}

	header = readHeader(storage.read(0, HEADER_SIZE));

	if (!validateHeader(header)) {
		throw new Error('Invalid graminfo format');
	}

	storage_type = storage.getTypeAsString();
	file_path = './access/graminfo_'+storage_type;
	clazz = 'GramInfo_' + js.ucfirst(storage_type);
	var Module = require(file_path).Module;
	js.extend(Module, Morphy_GramInfo);
	return new Module(storage.getResource(), header);
};

function GramInfo_Decorator(/* GramInfo_Interace */info)/*
														 * implements
														 * GramInfo_Interace
														 */{
	this.info = info;

	this.readGramInfoHeader = function(offset) {
		return this.info.readGramInfoHeader(offset);
	};
	this.getGramInfoHeaderSize = function() {
		return this.info.getGramInfoHeaderSize(offset);
	};
	this.readAncodes = function(info) {
		return this.info.readAncodes(info);
	};
	this.readFlexiaData = function(info) {
		return this.info.readFlexiaData(info);
	};
	this.readAllGramInfoOffsets = function() {
		return this.info.readAllGramInfoOffsets();
	};
	this.readAllPartOfSpeech = function() {
		return this.info.readAllPartOfSpeech();
	};
	this.readAllGrammems = function() {
		return this.info.readAllGrammems();
	};
	this.readAllAncodes = function() {
		return this.info.readAllAncodes();
	};
	this.getLocale = function() {
		return this.info.getLocale();
	};
	this.getEncoding = function() {
		return this.info.getEncoding();
	};
	this.getCharSize = function() {
		return this.info.getCharSize();
	};
	this.getEnds = function() {
		return this.info.getEnds();
	};
	this.getHeader = function() {
		return this.info.getHeader();
	};
}

function GramInfo_Proxy(/* Morphy_Storage */storage)/*
													 * extends
													 * GramInfo_Decorator
													 */{
	this.storage = storage;
	if (this.storage)
		this.info = GramInfoCreate(this.storage, false);
	//unset(this.info);

	function __get(propName) {
		if (propName == 'info') {
			this.info = GramInfoCreate(this.storage, false);
//			unset(this.storage);
			return this.info;
		}

		throw new Error("Unknown prop name 'propName'");
	}
}
js.extend(GramInfo_Proxy, GramInfo_Decorator);

function GramInfo_Proxy_WithHeader(/* Morphy_Storage */storage, cacheFile)/*
																			 * extends
																			 * GramInfo_Proxy
																			 */{

	this.readCache = function(fileName) {
		var data = /\(([\s\S]*)\)/igm.exec(fs.readFileSync(fileName, 'utf-8'))[1];
		if (typeof (result = JSON.parse('{'
				+ data.replace(/\s/igm, '').replace(/,$/, '').replace(/=>/g,
						':').replace(/'/g, '"') + '}')) != 'object') {
			throw new Error('Can`t get header cache from \'' + fileName
					+ '\' file');
		}
		return result;
	};

	this.getLocale = function() {
		return this.cache['lang'];
	};

	this.getEncoding = function() {
		return this.cache['encoding'];
	};

	this.getCharSize = function() {
		return this.cache['char_size'];
	};

	this.getEnds = function() {
		return this.ends;
	};

	this.getHeader = function() {
		return this.cache;
	};

	this.storage = storage;
	this.cache = this.readCache(cacheFile);
	this.info = GramInfoCreate(this.storage, false);
	this.ends = '\0\0' /* str_repeat('\0', this.getCharSize() + 1) */; // DV
}
js.extend(GramInfo_Proxy_WithHeader, GramInfo_Proxy);
exports.GramInfo_Proxy_WithHeader = GramInfo_Proxy_WithHeader;

function GramInfo_RuntimeCaching(/* GramInfo_Interace */info)/*
																 * extends
																 * GramInfo_Decorator
																 */{
	this.info = info;
	this.flexia = [], ancodes = [];
	this.flexia_all=[];
	
	this.readFlexiaData = function(info) {
		if (!this.flexia_all[info['offset']]) {
			this.flexia_all[info['offset']] = this.info.readFlexiaData(info);
		}
		return this.flexia_all[info['offset']];
	};
}
js.extend(GramInfo_RuntimeCaching, GramInfo_Decorator);
exports.GramInfo_RuntimeCaching = GramInfo_RuntimeCaching;

function GramInfo_AncodeCache(/* GramInfo_Interace */inner, resource)/*
																		 * extends
																		 * GramInfo_Decorator
																		 */{
	this.hits = 0;
	this.miss = 0;
	this.cache = null;
	this.info = inner;

	if (false == (this.cache = unserialize(resource.read(0, resource
			.getFileSize())))) {
		throw new Error("Can`t read ancodes cache");
	}

	function readAncodes(info) {
		offset = info['offset'];

		if (this.cache[offset]) {
			this.hits++;

			return this.cache[offset];
		} else {
			// in theory misses never occur
			this.miss++;

			return parent.readAncodes(info);
		}
	}
}
