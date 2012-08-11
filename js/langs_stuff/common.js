
function Morphy_GrammemsProvider_Decorator(
/* Morphy_GrammemsProvider_Interface */inner) {

	this.inner = inner;

	function getGrammems(partOfSpeech) {
		return this.inner.getGrammems(partOfSpeech);
	}
}

function Morphy_GrammemsProvider_Base() {
	var grammems = [];

	this.all_grammems = this.flatizeArray(this.getAllGrammemsGrouped());

	function getAllGrammemsGrouped() {
	}
	;

	function includeGroups(partOfSpeech, names) {
		grammems = this.getAllGrammemsGrouped();
		names = array_flip(/* (array) */names);

		for ( var key in array_keys(grammems)) {
			if (!names[key]) {
				unset(grammems[key]);
			}
		}

		this.grammems[partOfSpeech] = this.flatizeArray(grammems);

		return this;
	}

	function excludeGroups(partOfSpeech, names) {
		grammems = this.getAllGrammemsGrouped();

		for ( var key in /* (array) */names) {
			unset(grammems[key]);
		}

		this.grammems[partOfSpeech] = this.flatizeArray(grammems);

		return this;
	}

	function resetGroups(partOfSpeech) {
		unset(this.grammems[partOfSpeech]);
		return this;
	}

	function resetGroupsForAll() {
		this.grammems = [];
		return this;
	}

	function flatizeArray(array) {
		return call_user_func_array('array_merge', array);
	}

	function getGrammems(partOfSpeech) {
		if (this.grammems[partOfSpeech]) {
			return this.grammems[partOfSpeech];
		} else {
			return this.all_grammems;
		}
	}
}

function Morphy_GrammemsProvider_Empty()/* extends Morphy_GrammemsProvider_Base */{
	function getAllGrammemsGrouped() {
		return [];
	}

	function getGrammems(partOfSpeech) {
		return false;
	}
}

function Morphy_GrammemsProvider_ForFactory(encoding)/*
														 * extends
														 * Morphy_GrammemsProvider_Base
														 */{

	this.encoded_grammems = this
			.encodeGrammems(this.getGrammemsMap(), encoding);

	this.getGrammemsMap = function() {
	};

	function getAllGrammemsGrouped() {
		return this.encoded_grammems;
	}

	function encodeGrammems(grammems, encoding) {
		from_encoding = this.getSelfEncoding();

		if (from_encoding == encoding) {
			return grammems;
		}

		var result = [];

		for ( var key /* : ary */in grammems) {
			new_key = iconv(from_encoding, encoding, key);
			new_value = [];

			for ( var value in ary) {
				new_value.push(iconv(from_encoding, encoding, value));
			}

			result[new_key] = new_value;
		}

		return result;
	}
}

function Morphy_GrammemsProvider_Factory() {
	varincluded = {};

	function create(/* Morphy */morphy) {
		locale = morphy.getLocale().strtolower();

		if (!this.included[locale]) {
			file_name = MORPHY_DIR + "/langs_stuff/locale";
			func = "Morphy_GrammemsProvider_locale";

			if (is_readable(file_name)) {
				require(file_name);

				if (!function_exists(func)) {
					throw new Error(
							"Class 'function' not found in 'file_name' file");
				}

				this.included[locale] = call_user_func(array(func, 'instance'),
						morphy);
			} else {
				this.included[locale] = new Morphy_GrammemsProvider_Empty(
						morphy);
			}
		}

		return this.included[locale];
	}
}
