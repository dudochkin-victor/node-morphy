
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