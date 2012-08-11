
var util = require('util');
var js = require('./jsutil');
var iconv = require('iconv');

var cache = {};

function UnicodeCreate(encoding) {
	encoding = encoding.toLowerCase();

	if (cache[encoding]) {
		return cache[encoding];
	}

	result = doCreate(encoding);

	cache[encoding] = result;

	return result;
}

function doCreate(encoding) {
	var matches = /(utf|ucs)(-)?([0-9]+)(-)?(le|be)?/.exec(encoding);
	if (parts) {
		utf_type = matches[1];
		utf_base = /* (int) */matches[3];
		endiannes = '';

		switch (utf_type) {
		case 'utf':
			if (!(utf_base in {
				'8' : true,
				'16' : true,
				'32' : true
			})) {
				throw new Error('Invalid utf base');
			}

			break;
		case 'ucs':
			if (!(utf_base in {
				'2' : true,
				'4' : true
			})) {
				throw new Error('Invalid ucs base');
			}

			break;
		default:
			throw new Error('Internal error');
		}

		if (utf_base > 8 || 'ucs' == utf_type) {
			if (matches[5]) {
				endiannes = matches[5] == 'be' ? 'be' : 'le';
			} else {
				tmp = pack('L', 1);
				endiannes = ord(tmp[0]) == 0 ? 'be' : 'le';
			}
		}

		if (utf_type == 'ucs' || utf_base > 8) {
			encoding_name = utf_type + '-' + utf_baseendiannes;
		} else {
			encoding_name = utf_type + '-' + utf_base;
		}

		clazz = "UnicodeHelper_" + encoding_name.replace(/-/g, '_');
		switch (clazz) {
		case 'UnicodeHelper_utf_8':
			return new UnicodeHelper_utf_8(encoding_name);
			break;
		default:
			throw new Error('Not implemented: ' + clazz);
		}

	} else {
		return new UnicodeHelper_singlebyte(encoding);
	}
}

function UnicodeHelper() {
	this.firstCharSize = function(str) {
	};

	this.strrev = function(str) {
	};

	this.strlen = function(str) {
	};

	this.fixTrailing = function(str) {
	};
}
exports.UnicodeCreate = UnicodeCreate;

function UnicodeHelper_Base(encoding)/* extends UnicodeHelper */{
	var STRLEN_FOO;

	var strlen_foo, iconv, mb;

	this.encoding = encoding;
	this.ICONV = true;
	this.STRLEN_FOO = 'iconv_strlen';

	function fixTrailing(str) {
		to = this.encoding == 'utf-16' ? 'utf-32' : 'utf-16';

		if (this.ICONV) {
			lnew = iconv(this.encoding, to, str);
			return iconv(to, this.encoding, lnew);
		} else {
			this.php_fixTrailing(str);
		}
	}

	this.strlen = function(str) {
//		if (this.STRLEN_FOO) {
//			foo = this.STRLEN_FOO;
//			return foo(str, this.encoding);
//		} else {
//			return this.php_strlen(str);
//		}
		return str.length;
	};

	function php_strlen(str) {
	}
	;
}

function UnicodeHelper_MultiByteFixed(encoding, size){
	this.encoding = encoding;
	this.size = size;

	function firstCharSize(str) {
		return this.size;
	}

	function strrev(str) {
		return implode('', array_reverse(str_split(str, this.size)));
	}

	function php_strlen(str) {
		return str.strlen() / this.size;
	}

	function fixTrailing(str) {
		len = str.strlen();

		if ((len % this.size) > 0) {
			return str.substr(0, floor(len / this.size)
					* this.size);
		}

		return str;
	}
}
js.extend(UnicodeHelper_MultiByteFixed, UnicodeHelper_Base);
// single byte encoding
function UnicodeHelper_singlebyte(){
	function firstCharSize(str) {
		return 1;
	}

	function strrev(str) {
		return strrev(str);
	}

	function strlen(str) {
		return str.strlen();
	}

	function fixTrailing(str) {
		return str;
	}

	function php_strlen(str) {
		return str.strlen();
	}
}
js.extend(UnicodeHelper_singlebyte, UnicodeHelper_Base);

function ord(str) {
	var ch = str.charCodeAt(0);
	if (ch > 0xFF)
		ch -= 0x350;

	return ch;
}

// utf8
function UnicodeHelper_utf_8(encoding)/* extends UnicodeHelper_Base */{

	this.firstCharSize = function(str) {
		return 1 + this.tails_length[ord(str[0])];
	};

	function strrev(str) {
		preg_match_all('/./us', str, matches);
		return implode('', array_reverse(matches[0]));
		/*
		 * var result = [];
		 * 
		 * for(i = 0, c = str.strlen(); i < c;) { len = 1 +
		 * this.tails_length[ord(str[i])];
		 * 
		 * result[] = str.substr(i, len);
		 * 
		 * i += len; }
		 * 
		 * return implode('', array_reverse(result));
		 */
	}

	function fixTrailing(str) {
		strlen = str.strlen();

		if (!strlen) {
			return '';
		}

		ord = ord(str[strlen - 1]);

		if ((ord & 0x80) == 0) {
			return str;
		}

		for (i = strlen - 1; i >= 0; i--) {
			ord = ord(str[i]);

			if ((ord & 0xC0) == 0xC0) {
				diff = strlen - i;
				seq_len = this.tails_length[ord] + 1;

				miss = seq_len - diff;

				if (miss) {
					return str.substr(0,
							-(seq_len - miss));
				} else {
					return str;
				}
			}
		}

		return '';
	}

	function php_strlen(str) {
		preg_match_all('/./us', str, matches);
		return matches[0].length;
	}

	this.getTailsLength = function() {
		return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
				1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2,
				2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4,
				4, 4, 5, 5, 0, 0];
	};
	this.encoding = encoding;
	this.tails_length = this.getTailsLength();
}
js.extend(UnicodeHelper_utf_8, UnicodeHelper_Base);
// utf16
function UnicodeHelper_utf_16_Base(encoding, isBigEndian){
	this.encoding = encoding;
	this.is_be = /* (bool) */isBigEndian;
	this.char_fmt = isBigEndian ? 'n' : 'v';

	function firstCharSize(str) {
		/* list(, ord) = */unpack(this.char_fmt, str);

		return ord >= 0xD800 && ord <= 0xDFFF ? 4 : 2;
	}

	function strrev(str) {
		var result = [];

		count = str.strlen() / 2;
		fmt = this.char_fmt + count;

		words = array_reverse(unpack(fmt, str));

		for (i = 0; i < count; i++) {
			ord = words[i];

			if (ord >= 0xD800 && ord <= 0xDFFF) {
				// swap surrogates
				t = words[i];
				words[i] = words[i + 1];

				i++;
				words[i] = t;
			}
		}

		array_unshift(words, fmt);

		return call_user_func_array('pack', words);
	}

	function fixTrailing(str) {
		strlen = str.strlen();

		if (strlen & 1) {
			strlen--;
			str = str.substr(0, strlen);
		}

		if (strlen < 2) {
			return '';
		}

		/* list(, ord) = */unpack(this.char_fmt, str.substr
				(-2, 2));

		if (this.isSurrogate(ord)) {
			if (strlen < 4) {
				return '';
			}

			/* list(, ord) = */unpack(this.char_fmt,
					str.substr(-4, 2));

			if (this.isSurrogate(ord)) {
				// full surrogate pair
				return str;
			} else {
				return str.substr(0, -2);
			}
		}

		return str;
	}

	function php_strlen(str) {
		count = str.strlen() / 2;
		fmt = this.char_fmt + count;

		for ( var ord in unpack(fmt, str)) {
			if (ord >= 0xD800 && ord <= 0xDFFF) {
				count--;
			}
		}

		return count;
	}

	function isSurrogate(ord) {
		return ord >= 0xD800 && ord <= 0xDFFF;
	}
}
js.extend(UnicodeHelper_utf_16_Base, UnicodeHelper_Base);

function UnicodeHelper_utf_16le(encoding){
	this.encoding = encoding;
	this.is_be = false;
}
js.extend(UnicodeHelper_utf_16le, UnicodeHelper_utf_16_Base);

function UnicodeHelper_utf_16be(encoding){
	this.encoding = encoding;
	this.is_be = true;
}
js.extend(UnicodeHelper_utf_16be, UnicodeHelper_utf_16_Base);

// utf32
function UnicodeHelper_utf_32_Base(encoding){
	this.encoding = encoding;
	this.size = 4;
}
js.extend(UnicodeHelper_utf_32_Base, UnicodeHelper_MultiByteFixed);

function UnicodeHelper_utf_32le()/* extends UnicodeHelper_utf_32_Base */{
}
js.extend(UnicodeHelper_utf_32le, UnicodeHelper_utf_32_Base);

function UnicodeHelper_utf_32be()/* extends UnicodeHelper_utf_32_Base */{
}
js.extend(UnicodeHelper_utf_32be, UnicodeHelper_utf_32_Base);
// ucs2, ucs4

function UnicodeHelper_ucs_2le(encoding){
	this.encoding = encoding;
	this.size = 2;
}
js.extend(UnicodeHelper_ucs_2le, UnicodeHelper_MultiByteFixed);

function UnicodeHelper_ucs_2be(encoding){
	this.encoding = encoding;
	this.size = 2;
}
js.extend(UnicodeHelper_ucs_2be, UnicodeHelper_MultiByteFixed);

function UnicodeHelper_ucs_4le(encoding){
	this.encoding = encoding;
	this.size = 4;
}
js.extend(UnicodeHelper_ucs_4le, UnicodeHelper_MultiByteFixed);

function UnicodeHelper_ucs_4be(encoding){
	this.encoding = encoding;
	this.size = 4;
}
js.extend(UnicodeHelper_ucs_4be, UnicodeHelper_MultiByteFixed);