
var util = require('util');
var gramtab = require('./gramtab');
var unicode = require('./unicode');
var UnicodeCreate = require('./unicode').UnicodeCreate;

var js = require('./jsutil');

function Morphier_Empty() {
	this.getAnnot = function(word) {
		return false;
	};

	this.getBaseForm = function(word) {
		return false;
	};

	this.getAllForms = function(word) {
		return false;
	};

	this.getAllFormsWithGramInfo = function(word) {
		return false;
	};

	this.getPseudoRoot = function(word) {
		return false;
	};

	this.getPartOfSpeech = function(word) {
		return false;
	};

	this.getWordDescriptor = function(word) {
		return false;
	};

    this.getAllFormsWithAncodes = function(word) {
		return false;
	};

	this.getAncode = function(word) {
		return false;
	};

	this.getGrammarInfoMergeForms = function(word) {
		return false;
	};

	this.getGrammarInfo = function(word) {
		return false;
	};

	this.castFormByGramInfo = function(word, partOfSpeech, grammems,
			returnWords/* = false */, callback/* = null */) {
		return false;
	};
}
js.extend(Morphier_Empty, Morphier_Base);
exports.Morphier_Empty = Morphier_Empty;

function AnnotDecoder_Base(ends) {
	this.INVALID_ANCODE_ID = 0xFFFF;
	
	this.getUnpackString = function() {
	};

	this.getUnpackBlockSize = function() {
	};

	this.decode = function(annotRaw, withBase) {
		if (!annotRaw) {
			throw new Error("Empty annot given");
		}
		
		unpack_str = "Vcount/" + this.unpack_str;
		var result = [];

		firstresult = js.unpack(unpack_str, annotRaw);
		if (false == firstresult) {
			throw new Error("Invalid annot string 'annotRaw'");
		}

		if (firstresult['common_ancode'] == this.INVALID_ANCODE_ID) {
			firstresult['common_ancode'] = null;
		}

		count = firstresult['count'];

		result.push(firstresult);

		if (count > 1) {
			for ( var i = 0; i < count - 1; i++) {
				var off = 4 + (i + 1) * this.block_size;
				var str = annotRaw.slice(off, off + this.block_size)
				res = js.unpack(this.unpack_str, str);

				if (res['common_ancode'] == this.INVALID_ANCODE_ID) {
					res['common_ancode'] = null;
				}

				result.push(res);
			}
		}

		if (withBase) {
			var str = annotRaw.slice(4 + count * this.block_size).toString();
			items = str.split(this.ends); // this.ends must be a buffer
			for ( var i = 0; i < count; i++) {
				result[i]['base_prefix'] = items[i * 2];
				result[i]['base_suffix'] = items[i * 2 + 1];
			}
		}
		return result;
	};

	this.ends = ends;
	this.unpack_str = this.getUnpackString();
	this.block_size = this.getUnpackBlockSize();
}

function AnnotDecoder_Common(ends)/* extends AnnotDecoder_Base */{
	this.getUnpackString = function() {
		return 'Voffset/vcplen/vplen/vflen/vcommon_ancode/vforms_count/vpacked_forms_count/vaffixes_size/vform_no/vpos_id';
		// return
		// 'Voffset/vcplen/vplen/vflen/vcommon_ancode/vforms_count/vpacked_forms_count/vaffixes_size/vpos_id';
	};

	this.getUnpackBlockSize = function() {
		return 22;
	};

	this.ends = ends;
	this.unpack_str = this.getUnpackString();
	this.block_size = this.getUnpackBlockSize();
}
js.extend(AnnotDecoder_Common, AnnotDecoder_Base);

function AnnotDecoder_Predict(ends)/* extends AnnotDecoder_Common */{
	this.getUnpackString = function() {
		// return
		// 'Voffset/vcplen/vplen/vflen/vcommon_ancode/vforms_count/vpacked_forms_count/vaffixes_size/vform_no/vpos_id/vfreq';
		return 'Voffset/vcplen/vplen/vflen/vcommon_ancode/vforms_count/vpacked_forms_count/vaffixes_size/vform_no/vpos_id/vfreq';
	};

	this.getUnpackBlockSize = function() {
		return 24;
	};
	this.ends = ends;
	this.unpack_str = this.getUnpackString();
	this.block_size = this.getUnpackBlockSize();
}
js.extend(AnnotDecoder_Predict, AnnotDecoder_Base);

var instances = [];

function create(eos) {
	if (!instances[eos]) {
		instances[eos] = new AnnotDecoder_Factory(eos);
	}
	return instances[eos];
};

function AnnotDecoder_Factory(eos) {
	this.eos = eos;
	this.getCommonDecoder = function() {
		if (!this.cache_common) {
			this.cache_common = this.instantinate('common');
		}

		return this.cache_common;
	};

	this.getPredictDecoder = function() {
		if (!this.cache_predict) {
			this.cache_predict = this.instantinate('predict');
		}

		return this.cache_predict;
	};

	this.instantinate = function(type) {
		switch (type.toLowerCase()) {
		case 'common':
			return new AnnotDecoder_Common(this.eos);
			break;
		case 'predict':
			return new AnnotDecoder_Predict(this.eos);
			break;
		default:
			throw new Error('Unknown AnnotDecoder: ' + type.toLowerCase());
			break;
		}
	};
}

function AncodesResolver_Proxy(func, ctorArgs) {
	var args, func;
	// __obj;

    this.func = func;
	this.args = ctorArgs;

    switch(func)
    {
        case 'AncodesResolver_ToText':
            this.__obj = new AncodesResolver_ToText(this.args)
            break;
        case 'AncodesResolver_ToDialingAncodes':
            this.__obj = new AncodesResolver_ToDialingAncodes(this.args)
            break;
        case 'AncodesResolver_AsIs':
            this.__obj = new AncodesResolver_AsIs(this.args)
            break;
    }
	this.unresolve = function(ancode) {
		return this.__obj.unresolve(ancode);
	};

	this.resolve = function(ancodeId) {
        return this.__obj.resolve(ancodeId);
	};

	this.instantinate = function(func, args) {
		ref = new ReflectionClass(func);
		return ref.newInstanceArgs(args);
	};

	this.__get = function(propName) {
		if (propName == '__obj') {
			this.__obj = this.instantinate(this.func, this.args);

			unset(this.args);
			unset(this.func);

			return this.__obj;
		}

		throw new Error("Unknown 'propName' property");
	};
}

exports.AncodesResolver_Proxy = AncodesResolver_Proxy;

function AncodesResolver_ToText(/* GramTab_Interface */gramtab) {
	this.gramtab = gramtab;

	this.resolve = function(ancodeId) {
		if (!ancodeId) {
			return null;
		}

        return this.gramtab.ancodeToString(ancodeId);
	}

	function unresolve(ancode) {
		return this.gramtab.stringToAncode(ancode);
		// throw new Error("Can`t convert grammar info in text into
		// ancode id");
	}
}

function AncodesResolver_ToDialingAncodes(/* Storage */ancodesMap) {
	var ancodes_map;

	if (false == (this.ancodes_map = unserialize(ancodesMap.read(0, ancodesMap
			.getFileSize())))) {
		throw new Error("Can`t open Morphy : Dialing ancodes map");
	}

	this.reverse_map = array_flip(this.ancodes_map);

	function unresolve(ancode) {
		if (!ancode) {
			return null;
		}

		if (!this.reverse_map[ancode]) {
			throw new Error("Unknwon ancode found 'ancode'");
		}

		return this.reverse_map[ancode];
	}

	function resolve(ancodeId) {
		if (!ancodeId) {
			return null;
		}

		if (!this.ancodes_map[ancodeId]) {
			throw new Error("Unknwon ancode id found 'ancodeId'");
		}

		return this.ancodes_map[ancodeId];
	}
}

function AncodesResolver_AsIs() {
	function resolve(ancodeId) {
		return ancodeId;
	}

	function unresolve(ancode) {
		return ancode;
	}
}

// ----------------------------
// Helper
// ----------------------------
function Morphier_Helper(/* GramInfo_Interace */graminfo,
/* GramTab_Interface */gramtab,
/* AncodesResolver_Interface */ancodesResolver, resolvePartOfSpeech) {
	var annot_decoder, gramtab_consts_included = false;

	this.graminfo = graminfo;
	this.gramtab = gramtab;
	this.resolve_pos = resolvePartOfSpeech;
	this.ancodes_resolver = ancodesResolver;
	if (graminfo) {
		this.char_size = graminfo.getCharSize();
		this.ends = graminfo.getEnds();
	}

	this.setAnnotDecoder = function(/* AnnotDecoder_Interface */annotDecoder) {
		this.annot_decoder = annotDecoder;
	};

	// getters
	this.getEndOfString = function() {
		return this.ends;
	};

	this.getCharSize = function() {
		return this.char_size;
	};

	this.hasAnnotDecoder = function() {
		return this.annot_decoder;
	};

	this.getAnnotDecoder = function() {
		return this.annot_decoder;
	};

	this.getAncodesResolver = function() {
		return this.ancodes_resolver;
	};

	this.getGramInfo = function() {
		return this.graminfo;
	};

	this.getGramTab = function() {
		return this.gramtab;
	};

	this.isResolvePartOfSpeech = function() {
		return this.resolve_pos;
	};

	// other
	this.resolvePartOfSpeech = function(posId) {
		return this.gramtab.resolvePartOfSpeechId(posId);
	};

	this.getGrammems = function(ancodeId) {
		return this.gramtab.getGrammems(ancodeId);
	};

	this.getGrammemsAndPartOfSpeech = function(ancodeId) {
		var obj = {
			'pos_id' : this.gramtab.getPartOfSpeech(ancodeId),
			'all_grammems' : this.gramtab.getGrammems(ancodeId)
		};
		return obj;
	};

	this.extractPartOfSpeech = function(annot) {
		if (this.resolve_pos) {
			return this.resolvePartOfSpeech(annot['pos_id']);
		} else {
			return annot['pos_id'];
		}
	};

	this.includeGramTabConsts = function() {
		if (this.isResolvePartOfSpeech()) {
			this.gramtab.includeConsts();
		}

		this.gramtab_consts_included = true;
	};

	// getters
	this.getWordDescriptor = function(word, annots) {
		if (!this.gramtab_consts_included) {
			this.includeGramTabConsts();
		}
		return new WordDescriptor_Collection(word, annots, this);
	};

	this.getBaseAndPrefix = function(word, cplen, plen, flen) {
		if (flen) {
			var buf = new Buffer(word);
			base = buf.slice(cplen + plen, buf.length - flen).toString();
		} else {
			if (cplen || plen) {
				var buf = new Buffer(word);
				base = buf.slice(cplen + plen).toString();
			} else {
				base = word;
			}
		}
		prefix = cplen ? word.substr(0, cplen) : '';

		return {
			'base' : base,
			'prefix' : prefix
		};
	};

	this.getPartOfSpeech = function(word, annots) {
		if (false == annots) {
			return false;
		}

		var result = [];

		var _annots = this.decodeAnnot(annots, false);
		for ( var idx in _annots) {
			var annot = _annots[idx];
			result.push(this.extractPartOfSpeech(annot));
		}

		return result;
	};

	this.getBaseForm = function(word, annots) {
		if (false == annots)
			return false;

		annots = this.decodeAnnot(annots, true);
		return this.composeBaseForms(word, annots);
	};

	this.getPseudoRoot = function(word, annots) {
		if (false == annots) {
			return false;
		}

		annots = this.decodeAnnot(annots, false);

		var result = [];

		for ( var idx in annots) {
			var annot = annots[idx];

			var obj = this.getBaseAndPrefix(word, annot['cplen'],
					annot['plen'], annot['flen']);

			result.push(obj.base);
		}

		return result;
	};

	this.getAllForms = function(word, annots) {
		if (false == annots)
			return false;

		annots = this.decodeAnnot(annots, false);
		return this.composeForms(word, annots);
	};

	this.castFormByGramInfo = function(word, annots, partOfSpeech, grammems,
			returnWords/* = false */, callback/* = null */) {
		if (false == annots) {
			return false;
		}

		if (callback && !is_callable(callback)) {
			throw new Error("Invalid callback given");
		}

		var result = [];
		partOfSpeech = partOfSpeech ? partOfSpeech : null;

		for ( var annot in this.decodeAnnot(annots, false)) {
			all_ancodes = this.graminfo.readAncodes(annot);
			flexias = this.graminfo.readFlexiaData(annot);
			common_ancode = annot['common_ancode'];
			common_grammems = common_ancode ? this.gramtab
					.getGrammems(common_ancode) : [];

			var obj = this.getBaseAndPrefix(word, annot['cplen'],
					annot['plen'], annot['flen']);

			// i use strange form_no handling for perfomance issue (no function
			// call overhead)
			i = 0;
			form_no = 0;
			for ( var form_ancodes in all_ancodes) {
				for ( var ancode in form_ancodes) {
					form_pos = this.gramtab.getPartOfSpeech(ancode);
					form_grammems = array_merge(this.gramtab
							.getGrammems(ancode), common_grammems);
					form = prefix.flexias[i].base.flexias[i + 1];

					if (callback) {
						if (!call_user_func(callback, form, form_pos,
								form_grammems, form_no)) {
							form_no++;
							continue;
						}
					} else {
						if (partOfSpeech && form_pos !== partOfSpeech) {
							form_no++;
							continue;
						}

						if (array_diff(grammems, form_grammems).length > 0) {
							form_no++;
							continue;
						}
					}

					if (returnWords) {
						result[form] = 1;
					} else {
						result.push({
							'form' : form,
							'form_no' : form_no,
							'pos' : form_pos,
							'grammems' : form_grammems
						});
					}

					form_no++;
				}

				i += 2;
			}
		}

		return returnWords ? array_keys(result) : result;
	};

	this.getAncode = function(annots) {
		if (false == annots) {
			return false;
		}

		var result = [];
        var decoded = this.decodeAnnot(annots, false);
        for ( var idx=0; idx<decoded.length; idx++ ) {
             var annot = decoded[idx];
			all_ancodes = this.graminfo.readAncodes(annot);
            result.push({
                'common' : this.ancodes_resolver
                        .resolve(annot['common_ancode']),
                'all' : [[ this.ancodes_resolver, 'resolve' ],
                        all_ancodes[annot['form_no']] ]
			});
		}

        return /*this.array_unique(*/result/*)*/;
	};

	this.array_unique = function(array) {
		var need_own;

		if (!need_own) {
			need_own = -1 == version_compare(PHP_VERSION, '5.2.9');
		}

		if (need_own) {
			var result = [];

			for ( var key in array_keys(array_unique(array_map('serialize',
					array)))) {
				result[key] = array[key];
			}

			return result;
		} else {
			return array_unique(array, SORT_REGULAR);
		}
	};

	this.getGrammarInfoMergeForms = function(annots) {
		if (false == annots) {
			return false;
		}

		var result = [];

        var decoded = this.decodeAnnot(annots, false);
        for ( var idx=0; idx<decoded.length; idx++ ) {
             var annot = decoded[idx];
			all_ancodes = this.graminfo.readAncodes(annot);
			common_ancode = annot['common_ancode'];
			grammems = common_ancode ? this.gramtab.getGrammems(common_ancode)
					: [];

			forms_count = 0;
			form_no = annot['form_no'];

			for ( var ancode in all_ancodes[form_no]) {
				grammems = array_merge(grammems, this.gramtab
						.getGrammems(ancode));
				forms_count++;
			}

			grammems = array_unique(grammems);
			sort(grammems);

			result.push({
				// part of speech identical across all joined forms
				'pos' : this.gramtab.getPartOfSpeech(ancode),
				'grammems' : grammems,
				'forms_count' : forms_count,
				'form_no_low' : form_no,
				'form_no_high' : form_no + forms_count,
			});
		}

		return this.array_unique(result);
	};

	this.getGrammarInfo = function(annots) {
		if (false == annots) {
			return false;
		}

		var result = [];
        var decoded = this.decodeAnnot(annots, false);
        for ( var idx = 0; idx< decoded.length; idx++) {
            var annot = decoded[idx];

			all_ancodes = this.graminfo.readAncodes(annot);
			common_ancode = annot['common_ancode'];
			common_grammems = common_ancode ? this.gramtab
					.getGrammems(common_ancode) : [];

			info = [];
			form_no = annot['form_no'];
            ancodes = all_ancodes[form_no];
            for ( var aidx = 0; aidx<ancodes.length; aidx++) {
                var ancode = ancodes[aidx];
                var grammems = common_grammems.concat(this.gramtab.getGrammems(ancode));
				info_item = {
					'pos' : this.gramtab.getPartOfSpeech(ancode),
					'grammems' : grammems,
					'form_no' : form_no,
				};

				info.push(info_item);
			}

            unique_info = /*this.array_unique(*/info/*)*/;
            unique_info.sort();
			result.push(unique_info);
		}

        return /*this.array_unique(*/result/*)*/;
	};

	this.getAllFormsWithResolvedAncodes = function(word, annots, resolveType/*
																			 * =
																			 * 'no_resolve'
																			 */) {
		if (false == annots) {
			return false;
		}

		annots = this.decodeAnnot(annots, false);

		return this.composeFormsWithResolvedAncodes(word, annots);
	};

	this.getAllFormsWithAncodes = function(word, annots, foundFormNo/* = [] */) {

		if (false == annots) {
			return false;
		}
		annots = this.decodeAnnot(annots, false);
        return this.composeFormsWithAncodes(word, annots, foundFormNo);
	};

	this.getAllAncodes = function(word, annots) {
		if (false == annots) {
			return false;
		}

		var result = [];

		for ( var idx in annots) {
			var annot = annots[idx];
			result.push(this.graminfo.readAncodes(annot));
		}

		return result;
	};

	this.composeBaseForms = function(word, annots) {
		var result = [];

		for ( var idx in annots) {
			var annot = annots[idx];
			if (annot['form_no'] > 0) {
				var obj = this.getBaseAndPrefix(word, annot['cplen'],
						annot['plen'], annot['flen']);
				result.push([ obj.prefix + annot['base_prefix'] + obj.base
						+ annot['base_suffix'] ]);
			} else {
				result.push(word);
			}
		}
		return result;
	};

	this.composeForms = function(word, annots) {
		var result = [];
		for ( var idx in annots) {
			var annot = annots[idx];
			var obj = this.getBaseAndPrefix(word, annot['cplen'],
					annot['plen'], annot['flen']);
			// read flexia
			flexias = this.graminfo.readFlexiaData(annot);
			for (i = 0, c = flexias.length; i < c; i += 2) {
				result.push([ obj.prefix + flexias[i] + obj.base
						+ flexias[i + 1] ]);
			}
		}
		return result;
	};

	this.composeFormsWithResolvedAncodes = function(word, annots) {
		var result = [];

		for ( var annotIdx /* : annot */in annots) {
			var obj = this.getBaseAndPrefix(word, annot['cplen'],
					annot['plen'], annot['flen']);

			words = [];
			ancodes = [];
			common_ancode = annot['common_ancode'];

			// read flexia
			flexias = this.graminfo.readFlexiaData(annot);
			all_ancodes = this.graminfo.readAncodes(annot);

			for (i = 0, c = flexias.length; i < c; i += 2) {
				form = prefix.flexias[i].base.flexias[i + 1];

				current_ancodes = all_ancodes[i / 2];
				for ( var ancode in current_ancodes) {
					words.push(form);
					ancodes.push(this.ancodes_resolver.resolve(ancode));
				}
			}

			result.push({
				'forms' : words,
                'common' : this.ancodes_resolver.resolve(common_ancode),
                'all' : ancodes,
			});
		}

		return result;
	};

	this.composeFormsWithAncodes = function(word, annots, foundFormNo) {
		
		var result = [];
		for ( var idx in annots) {
			var annot = annots[idx];
			var obj = this.getBaseAndPrefix(word, annot['cplen'],
					annot['plen'], annot['flen']);

			// read flexia
			flexias = this.graminfo.readFlexiaData(annot);
			ancodes = this.graminfo.readAncodes(annot); // HERE ERROR
            found_form_no = annot['form_no'];
			
			foundFormNo = (!(foundFormNo instanceof Array)) ? [] : foundFormNo;

			for (i = 0, c = flexias.length; i < c; i += 2) {
				form_no = i / 2;
				word = obj.prefix + flexias[i] + obj.base + flexias[i + 1];

				if (found_form_no == form_no) {
					count = result.length;
					if (!foundFormNo[idx])
						foundFormNo[idx] = {};
					foundFormNo[idx]['low'] = count;
					foundFormNo[idx]['high'] = count + ancodes[form_no].length
							- 1;
				}

				for ( var idx in ancodes[form_no]) {
					var ancode = ancodes[form_no][idx];
					result.push([ word, ancode ]);
				}
			}
		}
		return result;
	};

	this.decodeAnnot = function(annotsRaw, withBase) {
		if (annotsRaw instanceof Buffer) {
			return this.annot_decoder.decode(annotsRaw, withBase);
		} else {
			return annotsRaw;
		}
	};
}
exports.Morphier_Helper = Morphier_Helper;

// ----------------------------
// WordDescriptor
// ----------------------------
// TODO: extend ArrayObject?
function WordDescriptor_Collection(word, annots, helper) {

	this.createDescriptor = function(word, annot, helper) {
		return new WordDescriptor(word, annot, helper);
	};

	this.getDescriptor = function(index) {
		if (!this.offsetExists(index)) {
			throw new Error("Invalid index 'index' specified");
		}

		return this.descriptors[index];
	};

	this.getByPartOfSpeech = function(poses) {
		var result = [];
		settype(poses, 'array');

		for ( var desc in this) {
			if (desc.hasPartOfSpeech(poses)) {
				result.push(desc);
			}
		}

		// return result.length ? result : false;
		return result;
	};

	this.descriptors = [];
	this.word = word.toString();
	this.annots = annots ? helper.decodeAnnot(annots, true) : false;
	this.helper = helper;

	this.graminfo = helper.getGramInfo();
	this.gramtab = gramtab;
	// this.resolve_pos = resolvePartOfSpeech;
	// this.ancodes_resolver = ancodesResolver;
	this.char_size = this.graminfo.getCharSize();
	this.ends = this.graminfo.getEnds();
	if (false !== this.annots) {
		for ( var idx in this.annots) {
			var annot = [];
			annot.push(this.annots[idx]);
            this.descriptors.push(this.createDescriptor(word, annot, helper));
		}
	}
}
js.extend(WordDescriptor_Collection, Morphier_Helper)
function WordForm(word, form_no, pos_id, grammems) {

	this.getPartOfSpeech = function() {
		return this.pos_id;
	}

	this.getGrammems = function() {
		return this.grammems;
	};

	this.hasGrammems = function(grammems) {
		grammems = grammems;

		grammes_count = grammems.length;
		return grammes_count
				&& array_intersect(grammems, this.grammems).length == grammes_count;
	};

	this.compareGrammems = function(a, b) {
		return a.length == b.length && array_diff(a, b).length == 0;
	};

	this.getWord = function() {
		return this.word;
	};

	this.getFormNo = function() {
		return this.form_no;
	};

	this.word = word.toString();
	this.form_no = /* (int) */form_no;
	this.pos_id = pos_id;
	this.grammems = grammems;
}

function WordDescriptor(word, annot, helper) {
	var cached_forms, cached_base, cached_pseudo_root, found_form_no, common_ancode_grammems;
    this.getPseudoRoot = function() {
		if (!this.cached_pseudo_root) {
			/* list(this.cached_pseudo_root) = */this.helper.getPseudoRoot(
					this.word, this.annot);
		}

		return this.cached_pseudo_root;
	};

	this.getBaseForm = function() {
		if (!this.cached_base) {
			this.cached_base = this.helper.getBaseForm(this.word, this.annot);
		}

		return this.cached_base;
	};

	this.getAllForms = function() {
		if (!this.cached_forms)
			this.cached_forms = this.helper.getAllForms(this.word, this.annot);
		return this.cached_forms;
	};

	this.getWordForm = function(index) {
		this.readAllForms();

		if (!this.offsetExists(index)) {
			throw new Error("Invalid index 'index' given");
		}

		return this.all_forms[index];
	};

	this.createWordForm = function(word, form_no, ancode) {
		if (!this.common_ancode_grammems) {
			common_ancode = this.annot[0]['common_ancode'];
			this.common_ancode_grammems = common_ancode ? this.helper
					.getGrammems(common_ancode) : [];
		}

		var obj = this.helper.getGrammemsAndPartOfSpeech(ancode);
		// array_merge replacement for objects
		var result = [];
		for ( var idx in this.common_ancode_grammems)
			result.push(this.common_ancode_grammems[idx]);
		for ( var idx in obj.all_grammems)
			result.push(obj.all_grammems[idx]);
		return new WordForm(word, form_no, obj.pos_id, result);
	};

	this.readAllForms = function() {
		if (!this.all_forms) {
			var result = [];
			form_no = 0;
			found_form_no = [];
			var withAncodes = this.helper.getAllFormsWithAncodes(this.word,
					this.annot, found_form_no);
			for ( var idx in withAncodes) {
				var form = withAncodes[idx];
				word = form[0];

				result.push(this.createWordForm(word, form_no, form[1]));

				form_no++;
			}

			this.found_form_no = found_form_no[0];
			this.all_forms = result;
		}
		return this.all_forms;
	};

	this.getFoundFormNoLow = function() {
		this.readAllForms();

		return this.found_form_no['low'];
	};

	this.getFoundFormNoHigh = function() {
		this.readAllForms();

		return this.found_form_no['high'];
	};

	this.getFoundWordForm = function() {
		var result = [];
		for (i = this.getFoundFormNoLow(), c = this.getFoundFormNoHigh() + 1; i < c; i++) {
			result.push(this.getWordForm(i));
		}

		return result;
	};

	this.hasGrammems = function(grammems) {
		settype(grammems, 'array');

		for ( var wf in this) {
			if (wf.hasGrammems(grammems)) {
				return true;
			}
		}

		return false;
	};

	this.getWordFormsByGrammems = function(grammems) {
		settype(grammems, 'array');
		var result = [];

		for ( var wf in this) {
			if (wf.hasGrammems(grammems)) {
				result.push(wf);
			}
		}

		return result;
		// return result.length ? result : false;
	};

	this.hasPartOfSpeech = function(poses) {
		settype(poses, 'array');

		for ( var wf in this) {
			if (in_array(wf.getPartOfSpeech(), poses, true)) {
				return true;
			}
		}

		return false;
	};

	this.getWordFormsByPartOfSpeech = function(poses) {
		settype(poses, 'array');
		var result = [];

		for ( var wf in this) {
			if (in_array(wf.getPartOfSpeech(), poses, true)) {
				result.push(wf);
			}
		}

		return result;
		// return result.length ? result : false;
	};

	this.all_forms = null;
	this.word = word.toString();
	this.annot = annot;
	this.helper = helper;
	this.readAllForms();
}

// ----------------------------
// Finders
// ----------------------------
function Morphier_Finder_Base(/* AnnotDecoder_Interface */annotDecoder) {
	this.prev_word = null;
	this.prev_result = false;

	this.annot_decoder = annotDecoder;

	this.findWord = function(word) {
		if (this.prev_word == word) {
			return this.prev_result;
		}

		result = this.doFindWord(word);

		this.prev_word = word;
		this.prev_result = result;
		return result;
	};

	this.getAnnotDecoder = function() {
		return this.annot_decoder;
	};

	this.decodeAnnot = function(raw, withBase) {
		return this.annot_decoder.decode(raw, withBase);
	};

	this.doFindWord = function(word) {
	};
}

function Morphier_Finder_Common(/* Fsa_Interface */fsa, /* AnnotDecoder_Interface */
annotDecoder)/* extends Morphier_Finder_Base */{
	this.annot_decoder = annotDecoder;
	this.fsa = fsa;
	if (fsa)
		this.root = this.fsa.getRootTrans();

	this.getFsa = function() {
		return this.fsa;
	};

	this.doFindWord = function(word) {
		result = this.fsa.walk(this.root, word);
		if (!result['result'] || null == result['annot']) {
			return false;
		}
		return result['annot'];
	};
}
js.extend(Morphier_Finder_Common, Morphier_Finder_Base);

function Morphier_Finder_Predict_Suffix(/* Fsa_Interface */fsa, /* AnnotDecoder_Interface */
annotDecoder, encoding, minimalSuffixLength/* = 4 */)/*
														 * extends
														 * Morphier_Finder_Common
														 */{
	var that = this;
	this.annot_decoder = annotDecoder;
	this.fsa = fsa;
	this.min_suf_len = minimalSuffixLength;
	this.unicode = UnicodeCreate(encoding);
	this.root = this.fsa.getRootTrans();

	this.pdoFindWord = function(word) {
		result = this.fsa.walk(this.root, word);

		if (!result['result'] || null == result['annot']) {
			return false;
		}
		return result['annot'];
	};

	this.doFindWord = function(word) {
		word_len = this.unicode.strlen(word);

		if (!word_len) {
			return false;
		}

		for (i = 1, c = word_len - this.min_suf_len; i < c; i++) {
			// word = word.substr(this.unicode
			// .firstCharSize(word));
			word = word.substr(this.unicode.firstCharSize(word));
			if (false !== (result = this.pdoFindWord(word))) {
				break;
			}
		}

		if (i < c) {
			// known_len = word_len - i;
			unknown_len = i;

			return result;
			/*
			 * return this.fixAnnots( this.decodeAnnot(result, true),
			 * unknown_len );
			 */
		} else {
			return false;
		}
	};

	this.fixAnnots = function(annots, len) {
		for (i = 0, c = annots.length; i < c; i++) {
			annots[i]['cplen'] = len;
		}
		return annots;
	};
}
js.extend(Morphier_Finder_Predict_Suffix, Morphier_Finder_Common);

function Morphier_PredictCollector(limit, /* AnnotDecoder_Interface */
annotDecoder)/* extends Fsa_WordsCollector */{
	var used_poses = [], collected = 0;

	// parent.prototype.constructor(limit);

	this.annot_decoder = annotDecoder;

	function collect(path, annotRaw) {
		if (this.collected > this.limit) {
			return false;
		}

		used_poses = this.used_poses;
		annots = this.decodeAnnot(annotRaw);

		for (i = 0, c = annots.length; i < c; i++) {
			annot = annots[i];
			annot['cplen'] = annot['plen'] = 0;

			pos_id = annot['pos_id'];

			if (used_poses[pos_id]) {
				result_idx = used_poses[pos_id];

				if (annot['freq'] > this.items[result_idx]['freq']) {
					this.items[result_idx] = annot;
				}
			} else {
				used_poses[pos_id] = this.items.length;
				this.items.push(annot);
			}
		}

		this.collected++;
		return true;
	}

	function clear() {
		parent.clear();
		this.collected = 0;
		this.used_poses = [];
	}

	function decodeAnnot(annotRaw) {
		return this.annot_decoder.decode(annotRaw, true);
	}
}

function Morphier_Finder_Predict_Databse(/* Fsa_Interface */fsa,
/* AnnotDecoder_Interface */annotDecoder, encoding,
/* GramInfo_Interace */graminfo, minPostfixMatch/* = 2 */, collectLimit/* = 32 */)/*
																					 * extends
																					 * Morphier_Finder_Common
																					 */{
	function createAnnotDecoder() {
		return phpmorphy_annot_decoder_new('predict');
	}

	function doFindWord(word) {
		rev_word = this.unicode.strrev(word);
		result = this.fsa.walk(this.root, rev_word);

		if (result['result'] && null !== result['annot']) {
			annots = result['annot'];
		} else {
			match_len = this.unicode.strlen(this.unicode.fixTrailing(rev_word
					.substr(0, result['walked'])));

			if (null == (annots = this.determineAnnots(result['last_trans'],
					match_len))) {
				return false;
			}
		}

		if (!(annots instanceof Array)) {
			annots = this.collector.decodeAnnot(annots);
		}

		return this.fixAnnots(word, annots);
	}

	function determineAnnots(trans, matchLen) {
		annots = this.fsa.getAnnot(trans);

		if (null == annots && matchLen >= this.min_postfix_match) {
			this.collector.clear();

			this.fsa.collect(trans, this.collector.getCallback());

			annots = this.collector.getItems();
		}

		return annots;
	}

	function fixAnnots(word, annots) {
		var result = [];

		// remove all prefixes?
		for (i = 0, c = annots.length; i < c; i++) {
			annot = annots[i];

			annot['cplen'] = annot['plen'] = 0;

			flexias = this.graminfo.readFlexiaData(annot, false);

			prefix = flexias[annot['form_no'] * 2];
			suffix = flexias[annot['form_no'] * 2 + 1];

			plen = prefix.strlen();
			slen = suffix.strlen();
			if ((!plen || word.substr(0, prefix.strlen(prefix)) == prefix)
					&& (!slen || word.substr(-suffix.strlen(suffix)) == suffix)) {
				result.push(annot);
			}
		}

		return result.length ? result : false;
	}

	this.createCollector = function(limit) {
		return new Morphier_PredictCollector(limit, this.getAnnotDecoder());
	};

	this.annot_decoder = annotDecoder;
	this.fsa = fsa;
	this.graminfo = graminfo;
	this.min_postfix_match = minPostfixMatch;
	this.collector = this.createCollector(collectLimit, this.getAnnotDecoder());
	this.unicode = UnicodeCreate(encoding);
}
js.extend(Morphier_Finder_Predict_Databse, Morphier_Finder_Common);
// ----------------------------
// Morphiers
// ----------------------------
function Morphier_Base(finder, helper) {
	/**
	 * var Morphier_Finder_Interface
	 */
	this.finder = finder,
	/**
	 * var Morphier_Helper
	 */
	this.helper = helper;

	if (finder) // DV
		this.helper.setAnnotDecoder(finder.getAnnotDecoder());

	/**
	 * return Morphier_Finder_Interface
	 */
	this.getFinder = function() {
		return this.finder;
	};

	/**
	 * return Morphier_Helper
	 */
	this.getHelper = function() {
		return this.helper;
	};

	this.getAnnot = function(word) {
		annots = this.finder.findWord(word);
		if (false == annots) {
			return false;
		}

		return this.helper.decodeAnnot(annots, true);
	};

	this.getWordDescriptor = function(word) {
		annots = this.finder.findWord(word);
		if (false == annots) {
			return false;
		}

		return this.helper.getWordDescriptor(word, annots);
	};

    this.getAllFormsWithAncodes = function(word) {
        annots = this.finder.findWord(word);
		if (false == annots) {
			return false;
		}

		return this.helper.getAllFormsWithResolvedAncodes(word, annots);
	};

	this.getPartOfSpeech = function(word) {
		annots = this.finder.findWord(word);
		if (false == annots) {
			return false;
		}

		return this.helper.getPartOfSpeech(word, annots);
	};

	this.getBaseForm = function(word) {
		annots = this.finder.findWord(word);
		if (false == annots) {
			return false;
		}
		return this.helper.getBaseForm(word, annots);
	};

	this.getPseudoRoot = function(word) {
		annots = this.finder.findWord(word);
		if (false == annots) {
			return false;
		}

		return this.helper.getPseudoRoot(word, annots);
	};

	this.getAllForms = function(word) {
		annots = this.finder.findWord(word);
		if (false == annots) {
			return false;
		}

		return this.helper.getAllForms(word, annots);
	};

	this.getAncode = function(word) {
		annots = this.finder.findWord(word);
		if (false == annots) {
			return false;
		}

        return this.helper.getAncode(annots);
	};

	this.getGrammarInfo = function(word) {
		annots = this.finder.findWord(word);
		if (false == annots) {
			return false;
		}
		return this.helper.getGrammarInfo(annots);
	};

	this.getGrammarInfoMergeForms = function(word) {
		annots = this.finder.findWord(word);
		if (false == annots) {
			return false;
		}

		return this.helper.getGrammarInfoMergeForms(annots);
	};

	this.castFormByGramInfo = function(word, partOfSpeech, grammems,
			returnOnlyWord/* = false */, callback/* = null */) {
		annots = this.finder.findWord(word);
		if (false == annots) {
			return false;
		}

		return this.helper.castFormByGramInfo(word, annots);
	};

	this.castFormByPattern = function(word, patternWord,
			returnOnlyWord/* = false */, callback/* = null */) {
		if (false == (orig_annots = this.finder.findWord(word))) {
			return false;
		}

		if (false == (pattern_annots = this.finder.findWord(patternWord))) {
			return false;
		}

		return this.helper.castFormByPattern(word, orig_annots, patternWord,
				pattern_annots, returnOnlyWord, callback);
	};
};

function Morphier_Common(/* Fsa_Interface */fsa, /* Morphier_Helper */
helper)/* extends Morphier_Base */{
	this.createAnnotDecoder = function(/* Morphier_Helper */helper) {
		return create(helper.getGramInfo().getEnds()).getCommonDecoder();
	};
	this.finder = new Morphier_Finder_Common(fsa, this
			.createAnnotDecoder(helper));
	this.helper = helper;
	this.helper.setAnnotDecoder(this.finder.getAnnotDecoder());
};

js.extend(Morphier_Common, Morphier_Base);
exports.Morphier_Common = Morphier_Common;

function Morphier_Predict_Suffix(/* Fsa_Interface */fsa, /* Morphier_Helper */
helper)/* extends Morphier_Base */{
	this.createAnnotDecoder = function(/* Morphier_Helper */helper) {
		return create(helper.getGramInfo().getEnds()).getCommonDecoder();
	};

	this.finder = new Morphier_Finder_Predict_Suffix(fsa, this
			.createAnnotDecoder(helper), helper.getGramInfo().getEncoding(), 4);
	this.helper = helper;
	this.helper.setAnnotDecoder(this.finder.getAnnotDecoder());

};
js.extend(Morphier_Predict_Suffix, Morphier_Base);
exports.Morphier_Predict_Suffix = Morphier_Predict_Suffix;

function Morphier_Predict_Database(/* Fsa_Interface */fsa, /* Morphier_Helper */
helper)/* extends Morphier_Base */{
	this.createAnnotDecoder = function(/* Morphier_Helper */helper) {
		return create(helper.getGramInfo().getEnds()).getPredictDecoder();
	};

	this.finder = new Morphier_Finder_Predict_Databse(fsa, this
			.createAnnotDecoder(helper), helper.getGramInfo().getEncoding(),
			helper.getGramInfo(), 2, 32);
	this.helper = helper;
	this.helper.setAnnotDecoder(this.finder.getAnnotDecoder());
}

js.extend(Morphier_Predict_Database, Morphier_Base);
exports.Morphier_Predict_Database = Morphier_Predict_Database;

function Morphier_Bulk(/* Fsa_Interface */fsa, /* Morphier_Helper */
helper) {

	this.getFsa = function() {
		return this.fsa;
	};

	this.getHelper = function() {
		return this.helper;
	};

	this.getGraminfo = function() {
		return this.graminfo;
	};

	this.getNotFoundWords = function() {
		return this.notfound;
	};

	this.createAnnotDecoder = function(/* Morphier_Helper */helper) {
		return new AnnotDecoder_Common(helper.getGramInfo().getEnds());
	};

	this.getAnnot = function(word) {
		var result = [];

		for ( var annot /* : words */in this.findWord(word)) {
			annot = this.helper.decodeAnnot(annot, true);

			for ( var word in words) {
				result[word].push(annot);
			}
		}

		return result;
	};

	this.getBaseForm = function(words) {
		annots = this.findWord(words);

		return this.composeForms(annots, true, false, false);
	};

	this.getAllForms = function(words) {
		annots = this.findWord(words);
		return this.composeForms(annots, false, false, false);
	};

	this.getPseudoRoot = function(words) {
		annots = this.findWord(words);

		return this.composeForms(annots, false, true, false);
	};

	this.getPartOfSpeech = function(words) {
		annots = this.findWord(words);

		return this.composeForms(annots, false, false, true);
	};

	this.processAnnotsWithHelper = function(words, method, callWithWord/*
																		 * =
																		 * false
																		 */) {
		var result = [];

		for ( var annot_raw /* : words */in this.findWord(words)) {
			if (annot_raw.strlen() == 0)
				continue;

			if (callWithWord) {
				for ( var word in words) {
					result[word] = this.helper.method(word, annot_raw);
				}
			} else {
				result_for_annot = this.helper.method(annot_raw);

				for ( var word in words) {
					result[word] = result_for_annot;
				}
			}
		}

		return result;
	};

	this.getAncode = function(words) {
		return this.processAnnotsWithHelper(words, 'getAncode');
	};

	this.getGrammarInfoMergeForms = function(words) {
		return this.processAnnotsWithHelper(words, 'getGrammarInfoMergeForms');
	};

	this.getGrammarInfo = function(words) {
		return this.processAnnotsWithHelper(words, 'getGrammarInfo');
	};

    this.getAllFormsWithAncodes = function(words) {
		return this.processAnnotsWithHelper(words,
				'getAllFormsWithResolvedAncodes', true);
	};

	this.getWordDescriptor = function(word) {
		return this.processAnnotsWithHelper(words, 'getWordDescriptor', true);
	};

	this.findWord = function(words) {
		unknown_words_annot = '';

		this.notfound = [];

		/* list(labels, finals, dests) = */this.buildPatriciaTrie(words);

		annots = [];
		unknown_words_annot = '';
		stack = [].concat(0, '', this.root_trans);
		stack_idx = 0;

		fsa = this.fsa;

		// TODO: Improve this
		while (stack_idx >= 0) {
			n = stack[stack_idx];
			path = stack[stack_idx + 1].labels[n];
			trans = stack[stack_idx + 2];
			stack_idx -= 3; // TODO: Remove items from stack? (performance!!!)

			is_final = finals[n] > 0;

			result = false;
			if (false !== trans && n > 0) {
				label = labels[n];

				result = fsa.walk(trans, label, is_final);

				if (label.strlen() == result['walked']) {
					trans = result['word_trans'];
				} else {
					trans = false;
				}
			}

			if (is_final) {
				if (false !== trans && result['annot']) {
					annots[result['annot']].push(path);
				} else {
					// annots[unknown_words_annot][] = path;
					this.notfound.push(path);
				}
			}

			if (false !== dests[n]) {
				for ( var dest in dests[n]) {
					stack_idx += 3;
					stack[stack_idx] = dest;
					stack[stack_idx + 1] = path;
					stack[stack_idx + 2] = trans;
				}
			}
		}

		return annots;
	};

	this.composeForms = function(annotsRaw, onlyBase, pseudoRoot, partOfSpeech) {
		var result = [];

		// process found annotations
		for ( var annot_raw /* : words */in annotsRaw) {
			if (annot_raw.strlen() == 0)
				continue;

			for ( var annot in this.helper.decodeAnnot(annot_raw, onlyBase)) {
				if (!(onlyBase || pseudoRoot)) {
					flexias = this.graminfo.readFlexiaData(annot);
				}

				cplen = annot['cplen'];
				plen = annot['plen'];
				flen = annot['flen'];

				if (partOfSpeech) {
					pos_id = this.helper.extractPartOfSpeech(annot);
				}

				for ( var word in words) {
					if (flen) {
						base = word.substr(cplen + plen, -flen);
					} else {
						if (cplen || plen) {
							base = word.substr(cplen + plen);
						} else {
							base = word;
						}
					}

					prefix = cplen ? word.substr(0, cplen) : '';

					if (pseudoRoot) {
						result[word][base] = 1;
					} else if (onlyBase) {
						form = prefix.annot['base_prefix'].base.annot['base_suffix'];

						result[word][form] = 1;
					} else if (partOfSpeech) {
						result[word][pos_id] = 1;
					} else {
						for (i = 0, c = flexias.length; i < c; i += 2) {
							form = prefix.flexias[i].base.flexias[i + 1];
							result[word][form] = 1;
						}
					}
				}
			}
		}

		for (keys = array_keys(result), i = 0, c = result.length; i < c; i++) {
			key = keys[i];

			result[key] = array_keys(result[key]);
		}

		return result;
	};

	this.buildPatriciaTrie = function(words) {
		if (!(words instanceof Array)) {
			throw new Error("Words must be array");
		}

		// sort(words);

		stack = [];
		prev_word = '';
		prev_word_len = 0;
		prev_lcp = 0;

		state_labels = [];
		state_finals = [];
		state_dests = [];

		state_labels.push('');
		state_finals = '0';
		state_dests.push([]);

		node = 0;

		for ( var word in words) {
			if (word == prev_word) {
				continue;
			}

			word_len = word.length;
			// find longest common prefix
			for (lcp = 0, c = Math.min(prev_word_len, word_len); lcp < c
					&& word[lcp] == prev_word[lcp]; lcp++)
				;

			if (lcp == 0) {
				stack = [];

				new_state_id = state_labels.length;

				state_labels.push(word);
				state_finals += '1';
				state_dests.push(false);

				state_dests[0].push(new_state_id);

				node = new_state_id;
			} else {
				need_split = true;
				trim_size = 0; // for split

				if (lcp == prev_lcp) {
					need_split = false;
					node = stack[stack.length - 1];
				} else if (lcp > prev_lcp) {
					if (lcp == prev_word_len) {
						need_split = false;
					} else {
						need_split = true;
						trim_size = lcp - prev_lcp;
					}

					stack.push(node);
				} else {
					trim_size = prev_word.strlen() - lcp;

					for (stack_size = stack.length - 1;; --stack_size) {
						trim_size -= state_labels[node].strlen();

						if (trim_size <= 0) {
							break;
						}

						if (stack.length < 1) {
							throw new Error('Infinite loop posible');
						}

						node = array_pop(stack);
					}

					need_split = trim_size < 0;
					trim_size = abs(trim_size);

					if (need_split) {
						stack.push(node);
					} else {
						node = stack[stack_size];
					}
				}

				if (need_split) {
					node_key = state_labels[node];

					// split
					new_node_id_1 = state_labels.length;
					new_node_id_2 = new_node_id_1 + 1;

					// new_node_1
					state_labels.push(node_key.substr(trim_size));
					state_finals += state_finals[node];
					state_dests.push(state_dests[node]);

					// adjust old node
					state_labels[node] = node_key.substr(0, trim_size);
					state_finals[node] = '0';
					state_dests[node] = array(new_node_id_1);

					// append new node, new_node_2
					state_labels.push(word.substr(lcp));
					state_finals += '1';
					state_dests.push(false);

					state_dests[node].push(new_node_id_2);

					node = new_node_id_2;
				} else {
					new_node_id = state_labels.length;

					state_labels.push(word.substr(lcp));
					state_finals += '1';
					state_dests.push(false);

					if (false !== state_dests[node]) {
						state_dests[node].push(new_node_id);
					} else {
						state_dests[node] = array(new_node_id);
					}

					node = new_node_id;
				}
			}

			prev_word = word;
			prev_word_len = word_len;
			prev_lcp = lcp;
		}

		var result = [];
		return result.concat(state_labels, state_finals, state_dests);
	};

	this.notfound = [];

	this.fsa = fsa;
	this.root_trans = fsa.getRootTrans();

	this.helper = helper;
	this.helper.setAnnotDecoder(this.createAnnotDecoder(helper));

	this.graminfo = helper.getGramInfo();
}
exports.Morphier_Bulk = Morphier_Bulk;
