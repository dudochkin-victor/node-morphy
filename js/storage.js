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
var fs = require('fs');
var util = require('util');
var Buffer = require('buffer').Buffer;
var MORPHY_STORAGE_FILE = 'file';
var MORPHY_STORAGE_MEM = 'mem';

exports.MORPHY_STORAGE_FILE = MORPHY_STORAGE_FILE;
exports.MORPHY_STORAGE_MEM = MORPHY_STORAGE_MEM;

function extend(Child, Parent) {
	Child.prototype = new Parent;
	Child.prototype.constructor = Child;
	Child.super = Parent.prototype;
}

function Morphy_Storage(fileName) {
	
	this.open = function(fileName) {
	};

	this.getFileName = function() {
		return this.file_name;
	};
	this.getResource = function() {
		return this.resource;
	};
	this.getTypeAsString = function() {
		return this.getType();
	};
	this.read = function(offset, len, exactLength/* = true */) {
		if (offset >= this.getFileSize()) {
			throw new Error('Can`t read '+ len +' bytes beyond end of \''
					+ this.getFileName()
					+ '\' file, offset = offset, file_size = '
					+ this.getFileSize());
		}

		try {
			result = this.readUnsafe(offset, len);
		} catch (e) {
			throw new Error(
					'Can`t read '+ len +' bytes at offset ' + offset + ', from \''
							+ this.getFileName() + '\' file\n' + e);
		}

//		if (exactLength && result.strlen() < len) {
//			throw new Error(
//					'Can`t read '+ len +' bytes at offset '+ offset+', from \''
//							+ this.getFileName() + '\' file');
//		}

		return result;
	};

	this.readUnsafe = function(offset, len) {
	};

	this.getFileSize = function() {
	};

	this.getType = function() {
	};
};

function Morphy_Storage_Proxy(type, fileName, factory)/*
														 * extends
														 * Morphy_Storage
														 */{
	this.file_name = fileName;
	this.type = type;
	this.factory = factory;

	this.getFileName = function() {
		return this.__obj.getFileName();
	};
	this.getResource = function() {
		return this.__obj.getResource();
	};
	this.getFileSize = function() {
		return this.__obj.getFileSize();
	};
	this.getType = function() {
		return this.__obj.getType();
	};
	this.readUnsafe = function(offset, len) {
		return this.__obj.readUnsafe(offset, len);
	};
	this.open = function(fileName) {
		return this.__obj.open(fileName);
	};

//	this.__get = function(propName) {
//		if (propName == '__obj') {
			this.__obj = this.factory.open(this.type, this.file_name, false);

//			unset(this.file_name);
//			unset(this.type);
//			unset(this.factory);
//
//			return this.__obj;
//		}
//
//		throw new Error("Unknown 'propName' property");
//	};
}
extend(Morphy_Storage_Proxy, Morphy_Storage);

var util = require('util');
function Morphy_Storage_File(fileName)/* extends Morphy_Storage */{
	this.file_name = fileName;
	
	this.open = function(fileName) {
		fh = fs.openSync(fileName, 'r');
		if (!fh) 
			throw new Error('Can`t open \'' + this.file_name + '\' file');
		return fh;
	};
	
	this.resource = this.open(fileName);
	
	this.getType = function() {
		return MORPHY_STORAGE_FILE;
	};

	this.getFileSize = function() {
		if (false == (stat = fs.statSync(this.file_name))) {
			throw new Error('Can`t invoke fstat for '
					+ this.file_name + ' file');
		}
		return stat['size'];
	};

	this.readUnsafe = function(offset, len) {
		if (!fs.statSync(this.file_name/*, offset*/)) {
			throw new Error('Can`t seek to offset ' + offset);
		}
	
		var buf = new Buffer(len);
		var readed = fs.readSync(this.resource, buf, 0, len, offset);
		
		return buf;
	};
}
extend(Morphy_Storage_File, Morphy_Storage);

function Morphy_Storage_Mem(fileName) /* extends Morphy_Storage */{
    this.file_name = fileName;
	this.getType = function() {
		return MORPHY_STORAGE_MEM;
	};

	this.getFileSize = function() {
        return this.resource.length;
	};

	this.readUnsafe = function(offset, len) {
        return this.resource.slice(offset, offset+len);
	};

	this.open = function(fileName) {
		var buffer = fs.readFileSync(fileName);
		if (!buffer) {
			throw new Error('Can`t read \''+ fileName + '\' file');
		}

		return buffer;
	};
    this.resource = this.open(fileName);
}
extend(Morphy_Storage_Mem, Morphy_Storage);

function Storage_Factory() {
	this.open = function(type, fileName, lazy) {
		if (lazy) {
			return new Morphy_Storage_Proxy(type, fileName, this);
		}
		switch (type) {
		case MORPHY_STORAGE_FILE:
			return new Morphy_Storage_File(fileName);
		case MORPHY_STORAGE_MEM:
			return new Morphy_Storage_Mem(fileName);
		default:
			throw new Error("Invalid storage type type specified");
		}
	};
}

exports.Storage_Factory = Storage_Factory
