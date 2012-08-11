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

var Morphy_Fsa = require('../fsa').Morphy_Fsa;
var js = require('../../jsutil');
var fs = require('fs');
var util = require('util');
var Buffer = require('buffer').Buffer;

function Fsa_Sparse_File(resource, header) /* extends Morphy_Fsa */{
	this.alphabet = null;
	this.resource = resource;
	this.header = header;
	this.fsa_start = header['fsa_offset'];

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

	this.walk = function(trans, word, readAnnot) {
		var i, c;
		if (!readAnnot)
			readAnnot = true;
		var str = new Buffer(word);
		for (i = 0, c = str.length; i < c; i++) {
			prev_trans = trans;
			char = str[i];

			// ///////////////////////////////
			// find char in state begin
			// sparse version
			result = true;
			
			var buf = new Buffer(4);
			var readed = fs.readSync(this.resource, buf, 0, 4, this.fsa_start
					+ ((((trans >> 10) & 0x3FFFFF) + char + 1) << 2));
			// TODO: Need error handling
			
//			fseek(this.resource, this.fsa_start
//					+ ((((trans >> 10) & 0x3FFFFF) + char + 1) << 2));
			trans = js.unpack('V', buf);
//			/* list(, trans) = */unpack('V', fread(this.resource, 4));

			if ((trans & 0x0200) || (trans & 0xFF) != char) {
				result = false;
			}
			// find char in state end
			// ///////////////////////////////

			if (!result) {
				trans = prev_trans;
				break;
			}
		}

		annot = null;
		result = false;
		prev_trans = trans;

		if (i >= c) {
			// Read annotation when we walked all chars in word
			result = true;

			if (readAnnot) {
				// read annot trans
				var buf = new Buffer(4);
				var readed = fs.readSync(this.resource, buf, 0, 4, this.fsa_start
						+ (((trans >> 10) & 0x3FFFFF) << 2));
				
//				fseek(this.resource, this.fsa_start
//						+ (((trans >> 10) & 0x3FFFFF) << 2));
				trans = js.unpack('V', buf);
//				/* list(, trans) = */unpack('V', fread(this.resource, 4));

				if (0 == (trans & 0x0100)) {
					result = false;
				} else {
					annot = this.getAnnot(trans);
				}
			}
		}

		return {
			'result' : result,
			'last_trans' : trans,
			'word_trans' : prev_trans,
			'walked' : i,
			'annot' : annot
		};
	};

	this.collect = function(startNode, callback, readAnnot/* = true */, path /* = '' */) {
		total = 0;

		stack = [];
		stack_idx = [];
		start_idx = 0;
		array_push(stack, null);
		array_push(stack_idx, null);

		state = this.readState(((startNode) >> 10) & 0x3FFFFF);

		do {
			for (i = start_idx, c = state.length; i < c; i++) {
				trans = state[i];

				if ((trans & 0x0100)) {
					total++;

					if (readAnnot) {
						annot = this.getAnnot(trans);
					} else {
						annot = trans;
					}

					if (!call_user_func(callback, path, annot)) {
						return total;
					}
				} else {
					path += chr(trans & 0xFF);
					// DVarray_push(stack, state);
					// DVarray_push(stack_idx, i + 1);
					state = this.readState(((trans) >> 10) & 0x3FFFFF);
					start_idx = 0;

					break;
				}
			}

			if (i >= c) {
				state = array_pop(stack);
				start_idx = array_pop(stack_idx);
				path = path.substr(0, -1);
			}
		} while (!empty(stack));

		return total;
	};

	this.readState = function(index) {
		__fh = this.resource;
		fsa_start = this.fsa_start;

		var result = [];

		start_offset = fsa_start + ((index) << 2);

		// first try read annot transition
		fseek(__fh, start_offset);
		/* list(, trans) = */unpack('V', fread(__fh, 4));

		if ((trans & 0x0100)) {
			result.push(trans);
		}

		// read rest
		start_offset += 4;
		for ( var char in this.getAlphabetNum()) {
			fseek(__fh, start_offset + ((char) << 2));
			/* list(, trans) = */unpack('V', fread(__fh, 4));

			// if(!(trans & 0x0200) && (trans & 0xFF) == char) {
			// TODO: check term and empty flags at once i.e. trans & 0x0300
			if (!((trans & 0x0200) || (trans & 0x0100))
					&& (trans & 0xFF) == char) {

				result.push(trans);
			}
		}

		return result;
	};

	this.unpackTranses = function(rawTranses) {
		settype(rawTranses, 'array');
		var result = [];

		for ( var rawTrans in rawTranses) {
			result.push({
				'term' : (rawTrans & 0x0100) ? true : false,
				'empty' : (rawTrans & 0x0200) ? true : false,
				'attr' : (rawTrans & 0xFF),
				'dest' : ((rawTrans) >> 10) & 0x3FFFFF,
			});
		}

		return result;
	};

	this.readRootTrans = function() {
		var buf = new Buffer(4);
		var readed = fs.readSync(this.resource, buf, 0, 4, this.fsa_start + 4);
		// TODO: Need error handling
		return js.unpack('V', buf);
	};

	this.readAlphabet = function() {
		var buf = new Buffer(this.header['alphabet_size']);
		var readed = fs.readSync(this.resource, buf, 0,
				this.header['alphabet_size'], this.header['alphabet_offset']);
		return buf;
	};

	this.getAnnot = function(trans) {
		if (!(trans & 0x0100)) {
			return null;
		}

		fsa_start = this.fsa_start;

		var buf = new Buffer(1);
		var offset = this.header['annot_offset']
			+ (((trans & 0xFF) << 22) | ((trans >> 10) & 0x3FFFFF));
		var readed = fs.readSync(this.resource, buf, 0, 1, offset);
		
//		fseek(this.resource, offset);
//		len = ord(fread(this.resource, 1));
		len = buf[0];
		if (len) {
			var buf = new Buffer(len);
			var readed = fs.readSync(this.resource, buf, 0, len, offset+1);
			annot = buf; //fread(this.resource, len);
		} else {
			annot = null;
		}

		return annot;
	};

	this.getAlphabetNum = function() {
		if (!this.alphabet_num) {
			this.alphabet_num = array_map('ord', this.getAlphabet());
		}

		return this.alphabet_num;
	};
	this.alphabet_num = null;
	this.root_trans = this.readRootTrans();
}

exports = module.exports = Fsa_Sparse_File;
