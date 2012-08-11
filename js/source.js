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

var MORPHY_SOURCE_FSA = 'fsa';
var MORPHY_SOURCE_DBA = 'dba';
var MORPHY_SOURCE_SQL = 'sql';

exports.MORPHY_SOURCE_FSA = MORPHY_SOURCE_FSA;
exports.MORPHY_SOURCE_DBA = MORPHY_SOURCE_DBA;
exports.MORPHY_SOURCE_SQL = MORPHY_SOURCE_SQL;

function Source_Fsa(/* Fsa_Interface */fsa) {

	this.getFsa = function() {
		return this.fsa;
	};

	this.getValue = function(key) {
		if (false == (result = this.fsa.walk(this.root, key, true))
				|| !result['annot']) {
			return false;
		}

		return result['annot'];
	};

	this.fsa = fsa;
	this.root = fsa.getRootTrans();
}
exports.Source_Fsa = Source_Fsa;

function Source_Dba(fileName, options/* = null */) {
	this.DEFAULT_HANDLER = 'db3';

	this.handle = this.openFile(fileName, this.repairOptions(options));

	this.close = function() {
		if (this.handle) {
			dba_close(this.handle);
			this.handle = null;
		}
	};

	this.getDefaultHandler = function() {
		return this.DEFAULT_HANDLER;
	};

	this.openFile = function(fileName, options) {
		if (false == (new_filename = realpath(fileName))) {
			throw new Error("Can`t get realpath for 'fileName' file");
		}

		lock_mode = options['lock_mode'];
		handler = options['handler'];
		func = options['persistent'] ? 'dba_popen' : 'dba_open';

		if (false == (result = func(new_filename, "rlock_mode", handler))) {
			throw new Error("Can`t open 'fileFile' file");
		}

		return result;
	};

	this.repairOptions = function(options) {
		defaults = {
			'lock_mode' : 'd',
			'handler' : this.getDefaultHandler(),
			'persistent' : false
		};

		return /* (array) */options + defaults;
	};

	this.getValue = function(key) {
		return dba_fetch(key, this.handle);
	};
}
exports.Source_Dba = Source_Dba;