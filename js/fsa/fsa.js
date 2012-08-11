/**
 * This file is part of Morphy library
 * 
 * Copyright c 2007-2008 Kamaev Vladimir <heromantor@users.sourceforge.net>
 * 
 * This library is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option) any
 * later version.
 * 
 * This library is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library; if not, write to the Free Software Foundation, Inc.,
 * 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */
var util = require('util');
var js = require('../jsutil');

var HEADER_SIZE = 128;


function Morphy_Fsa(resource, header){
	this.alphabet = null;
	this.resource = resource;
	this.header = header;
	this.fsa_start = header['fsa_offset'];
	this.root_trans = this.readRootTrans();

	this.getRootTrans = function() {
		return this.root_trans;
	};

	this.getRootState = function() {
		return this.createState(this.getRootStateIndex());
	};

	this.getAlphabet = function() {
		if (!this.alphabet) {
			this.alphabet = str_split(this.readAlphabet());
		}

		return this.alphabet;
	};

	this.createState = function(index) {
		var fsa_state = require('../fsa/fsa_state');
		return new Morphy_State(this, index);
	};

	this.getRootStateIndex = function() {
		return 0;
	};

	this.readRootTrans = function() {
	};

	this.readAlphabet = function() {
	};
};
exports.Morphy_Fsa = Morphy_Fsa;

function readHeader(headerRaw) {
	// if (headerRaw.strlen(headerRaw) != HEADER_SIZE) {
	// throw new Error('Invalid header string given');
	// }

	var header = js
			.unpack(
					'a4fourcc/Vver/Vflags/Valphabet_offset/Vfsa_offset/Vannot_offset/Valphabet_size/Vtranses_count/Vannot_length_size/'
							+ 'Vannot_chunk_size/Vannot_chunks_count/Vchar_size/Vpadding_size/Vdest_size/Vhash_size',
					headerRaw);

	if (false == header) {
		throw new Error('Can`t unpack header');
	}

	flags = {};
	raw_flags = header['flags'];
	flags['is_tree'] = raw_flags & 0x01 ? true : false;
	flags['is_hash'] = raw_flags & 0x02 ? true : false;
	flags['is_sparse'] = raw_flags & 0x04 ? true : false;
	flags['is_be'] = raw_flags & 0x08 ? true : false;

	header['flags'] = flags;

	header['trans_size'] = header['char_size'] + header['padding_size']
			+ header['dest_size'] + header['hash_size'];

	return header;
}

function validateHeader(header) {
	if ('meal' != header['fourcc'] || 3 != header['ver']
			|| header['char_size'] != 1 || header['padding_size'] > 0
			|| header['dest_size'] != 3 || header['hash_size'] != 0
			|| header['annot_length_size'] != 1
			|| header['annot_chunk_size'] != 1 || header['flags']['is_be']
			|| header['flags']['is_hash'] || 1 == 0) {
		return false;
	}

	return true;
}

function create(/* Morphy_Storage */storage, lazy) {
	if (lazy) {
		return new Fsa_Proxy(storage);
	}

	var header = readHeader(storage.read(0, HEADER_SIZE, true));

	if (!validateHeader(header)) {
		throw new Error('Invalid fsa format');
	}

	if (header['flags']['is_sparse']) {
		type = 'sparse';
	} else if (header['flags']['is_tree']) {
		type = 'tree';
	} else {
		throw new Error('Only sparse or tree fsa`s supported');
	}

	storage_type = storage.getTypeAsString();
	file_path = './access/fsa_' + type + '_' + storage_type;
	clazz = 'Fsa_' + js.ucfirst(type) + '_' + js.ucfirst(storage_type);

	var module = require(file_path);
	return new module(storage.getResource(), header);
	// return new clazz(storage.getResource(), header);
}

exports.create = create;

function Fsa_WordsCollector() {
	var items = [], limit;

	function Fsa_WordsCollector(collectLimit) {
		this.limit = collectLimit;
	}

	function collect(word, annot) {
		if (this.items.length < this.limit) {
			this.items[word] = annot;
			return true;
		} else {
			return false;
		}
	}

	function getItems() {
		return this.items;
	}
	function clear() {
		this.items = [];
	}
	function getCallback() {
		return [ this, 'collect' ];
	}
};

function Fsa_Decorator(/* Fsa_Interface */fsa) {

	this.fsa = fsa;

	this.getRootTrans = function() {
		return this.fsa.getRootTrans();
	};
	this.getRootState = function() {
		return this.fsa.getRootState();
	};
	this.getAlphabet = function() {
		return this.fsa.getAlphabet();
	};
	this.getAnnot = function(trans) {
		return this.fsa.getAnnot(trans);
	};
	this.walk = function(start, word, readAnnot/* = true */) {
		return this.fsa.walk(start, word, readAnnot);
	};
	this.collect = function(start, callback, readAnnot/* = true */, path/* = '' */) {
		return this.fsa.collect(start, callback, readAnnot, path);
	};
	this.readState = function(index) {
		return this.fsa.readState(index);
	};
	this.unpackTranses = function(transes) {
		return this.fsa.unpackTranses(transes);
	};
};

function Fsa_Proxy(/* Morphy_Storage */storage) /*
												 * extends Fsa_Decorator
												 */{
	this.storage = storage;
	// unset(this.fsa);

	this.fsa = create(this.storage, false); //DV
	
	this.__get = function(propName) {
		if (propName == 'fsa') {
			this.fsa = Morphy_Fsa.create(this.storage, false);

			unset(this.storage);
			return this.fsa;
		}

		throw new Error("Unknown prop name 'propName'");
	};
}
js.extend(Fsa_Proxy, Fsa_Decorator);
exports.Fsa_Proxy = Fsa_Proxy;