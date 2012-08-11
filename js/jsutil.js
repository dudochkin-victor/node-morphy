var util = require('util');

function extend(Child, Parent) {
	Child.prototype = new Parent;
	Child.prototype.constructor = Child;
	Child.super = Parent.prototype;
}
exports.extend = extend;

function unpack(format, buffer) {
	/**
	 * Параметр format задается в виде строки и состоит из кодов формата и
	 * опционального аргумента повторения. Аргумент может быть целочисленным,
	 * либо * для повторения до конца введенных данных. Для a, A, h, H число
	 * повторений определяет то, сколько символов взято от одного аргумента
	 * данных, для @ - это абсолютная позиция для размещения следующих данных,
	 * для всего остального число повторений определяет как много аргументов
	 * данных было обработано и упаковано в результирующую бинарную строку.
	 */
	var codes = {
		'a' : 'Строка (string) с NULL-заполнением',
		'A' : 'Строка (string) со SPACE-заполнением',
		'h' : 'Hex-строка (Hex string), с нижнего разряда',
		'H' : 'Hex-строка (Hex string), с верхнего разряда',
		'c' : 'знаковый символ (char)',
		'C' : 'беззнаковый символ (char)',
		's' : 'знаковый short (всегда 16 бит, машинный байтовый порядок)',
		'S' : 'беззнаковый short (всегда 16 бит, машинный байтовый порядок)',
		'n' : 'беззнаковый short (всегда 16 бит, порядок big endian)',
		'v' : 'беззнаковый short (всегда 16 бит, порядок little endian)',
		'i' : 'знаковый integer (машинно-зависимый размер и порядок)',
		'I' : 'беззнаковый integer (машинно-зависимый размер и порядок)',
		'l' : 'знаковый long (всегда 32 бит, машинный порядок)',
		'L' : 'беззнаковый long (всегда 32 бит, машинный порядок)',
		'N' : 'беззнаковый long (всегда 32 бит, порядок big endian)',
		'V' : 'беззнаковый long (всегда 32 бит, порядок little endian)',
		'f' : 'float (машинно-зависимые размер и прдставление)',
		'd' : 'double (машинно-зависимые размер и прдставление)',
		'x' : 'NUL байт',
		'X' : 'Резервирование одного байта',
		'@' : 'NUL-заполнение до абсолютной позиции'
	};
	parts = format.split('/');
	var offset = 0;
	if (parts.length > 1) {
		var result = {};
		for ( var idx = 0; idx < parts.length; idx++) {
			var mod = parts[idx][0];
			if (mod in codes) {
				switch (mod) {
				case 'V':
					result[parts[idx].slice(1)] = buffer.readUInt32LE(offset);
					offset += 4;
					break;
				case 'v':
					result[parts[idx].slice(1)] = buffer.readUInt16LE(offset);
					offset += 2;
					break;
				case 'a':
					var lenStr = /\d+/g.exec(parts[idx])[0];
					var len = parseInt(lenStr, 10);
					result[parts[idx].slice(1 + lenStr.length)] = buffer
							.toString('ascii', offset, len);
					offset += len;
					break;
				default:
					util.puts(parts[idx] + ' ' + offset);
					break;
				}
			}
		}
		return result;
	} else {
		// TODO: Здесь нужно проходить по всему массиву видимо
		result = []
		do {
			var obj = {};
			var mod = format[0];
			if (mod in codes) {
				switch (mod) {
				case 'V':
					obj = buffer.readUInt32LE(offset);
					offset += 4;
					break;
				case 'v':
					obj = buffer.readUInt16LE(offset);
					offset += 2;
					break;
				case 'a':
					var lenStr = /\d+/g.exec(format)[0];
					var len = parseInt(lenStr, 10);
					obj = buffer.toString('ascii', offset, len);
					offset += len;
					break;
				default:
					util.puts(format);
					break;
				}
			}
			result.push(obj);
		} while (offset<buffer.length);
		return result;
	}
}
exports.unpack = unpack;

function ucfirst(str) {
	var f = str.charAt(0).toUpperCase();
	return f + str.substr(1, str.length - 1);
}
exports.ucfirst = ucfirst;

function unserialize(data) {
	// Takes a string representation of variable and recreates it
	// 
	// version: 1109.2015
	// discuss at: http://phpjs.org/functions/unserialize // + original by:
	// Arpad Ray (mailto:arpad@php.net)
	// + improved by: Pedro Tainha (http://www.pedrotainha.com)
	// + bugfixed by: dptr1988
	// + revised by: d3x
	// + improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net) // +
	// input by: Brett Zamir (http://brett-zamir.me)
	// + improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// + improved by: Chris
	// + improved by: James
	// + input by: Martin (http://www.erlenwiese.de/) // + bugfixed by: Kevin
	// van Zonneveld (http://kevin.vanzonneveld.net)
	// + improved by: Le Torbi
	// + input by: kilops
	// + bugfixed by: Brett Zamir (http://brett-zamir.me)
	// - depends on: utf8_decode // % note: We feel the main purpose of this
	// function should be to ease the transport of data between php & js
	// % note: Aiming for PHP-compatibility, we have to translate objects to
	// arrays
	// * example 1:
	// unserialize('a:3:{i:0;s:5:"Kevin";i:1;s:3:"van";i:2;s:9:"Zonneveld";}');
	// * returns 1: ['Kevin', 'van', 'Zonneveld']
	// * example 2:
	// unserialize('a:3:{s:9:"firstName";s:5:"Kevin";s:7:"midName";s:3:"van";s:7:"surName";s:9:"Zonneveld";}');
	// // * returns 2: {firstName: 'Kevin', midName: 'van', surName:
	// 'Zonneveld'}
	var that = this;
	var utf8Overhead = function(chr) {
		// http://phpjs.org/functions/unserialize:571#comment_95906
		var code = chr.charCodeAt(0);
		if (code < 0x0080) {
			return 0;
		}
		if (code < 0x0800) {
			return 1;
		}
		return 2;
	};

	var error = function(type, msg, filename, line) {
		throw new that.window[type](msg, filename, line);
	};
	var read_until = function(data, offset, stopchr) {
		var buf = [];
		var chr = data.slice(offset, offset + 1);
		var i = 2;
		while (chr != stopchr) {
			if ((i + offset) > data.length) {
				error('Error', 'Invalid');
			}
			buf.push(chr);
			chr = data.slice(offset + (i - 1), offset + i);
			i += 1;
		}
		return [ buf.length, buf.join('') ];
	};
	var read_chrs = function(data, offset, length) {
		var buf;
		buf = [];
		for ( var i = 0; i < length; i++) {
			var chr = data.slice(offset + (i - 1), offset + i);
			buf.push(chr);
			length -= utf8Overhead(chr);
		}
		return [ buf.length, buf.join('') ];
	};
	var _unserialize = function(data, offset) {
		var readdata;
		var readData;
		var chrs = 0;
		var ccount;
		var stringlength;
		var keyandchrs;
		var keys;

		if (!offset) {
			offset = 0;
		}
		var dtype = (data.slice(offset, offset + 1)).toLowerCase();

		var dataoffset = offset + 2;
		var typeconvert = function(x) {
			return x;
		};

		switch (dtype) {
		case 'i':
			typeconvert = function(x) {
				return parseInt(x, 10);
			};
			readData = read_until(data, dataoffset, ';');
			chrs = readData[0];
			readdata = readData[1];
			dataoffset += chrs + 1;
			break;
		case 'b':
			typeconvert = function(x) {
				return parseInt(x, 10) !== 0;
			};
			readData = read_until(data, dataoffset, ';');
			chrs = readData[0];
			readdata = readData[1];
			dataoffset += chrs + 1;
			break;
		case 'd':
			typeconvert = function(x) {
				return parseFloat(x);
			};
			readData = read_until(data, dataoffset, ';');
			chrs = readData[0];
			readdata = readData[1];
			dataoffset += chrs + 1;
			break;
		case 'n':
			readdata = null;
			break;
		case 's':
			ccount = read_until(data, dataoffset, ':');
			chrs = ccount[0];
			stringlength = ccount[1];
			dataoffset += chrs + 2;

			readData = read_chrs(data, dataoffset + 1, parseInt(stringlength,
					10));
			chrs = readData[0];
			readdata = readData[1];
			dataoffset += chrs + 2;
			if (chrs != parseInt(stringlength, 10) && chrs != readdata.length) {
				error('SyntaxError', 'String length mismatch');
			}

			// Length was calculated on an utf-8 encoded string
			// so wait with decoding
			// readdata = that.utf8_decode(readdata);
			break;
		case 'a':
			readdata = {};

			keyandchrs = read_until(data, dataoffset, ':');
			chrs = keyandchrs[0];
			keys = keyandchrs[1];
			dataoffset += chrs + 2;

			for ( var i = 0; i < parseInt(keys, 10); i++) {
				var kprops = _unserialize(data, dataoffset);
				var kchrs = kprops[1];
				var key = kprops[2];
				dataoffset += kchrs;
				var vprops = _unserialize(data, dataoffset);
				var vchrs = vprops[1];
				var value = vprops[2];
				dataoffset += vchrs;
				readdata[key] = value;
			}

			dataoffset += 1;
			break;
		default:
			error('SyntaxError', 'Unknown / Unhandled data type(s): ' + dtype);
			break;
		}
		return [ dtype, dataoffset - offset, typeconvert(readdata) ];
	};

	return _unserialize((data + ''), 0)[2];
}
exports.unserialize = unserialize;