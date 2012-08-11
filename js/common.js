var util = require('util');
var fsa = require('./fsa/fsa');
var fsa = require('./fsa/fsa');
var GramInfo_RuntimeCaching = require('./graminfo/graminfo').GramInfo_RuntimeCaching;
var GramInfo_Proxy_WithHeader = require('./graminfo/graminfo').GramInfo_Proxy_WithHeader;
var GramTab_Proxy = require('./gramtab').GramTab_Proxy;
var morphiers = require('./morphiers');
var Morphier_Common = require('./morphiers').Morphier_Common;
var Morphier_Bulk = require('./morphiers').Morphier_Bulk;
var Morphier_Helper = require('./morphiers').Morphier_Helper;
var Morphier_Predict_Suffix = require('./morphiers').Morphier_Predict_Suffix;
var Morphier_Predict_Database = require('./morphiers').Morphier_Predict_Database;
var Morphier_Empty = require('./morphiers').Morphier_Empty;
var AncodesResolver_Proxy = require('./morphiers').AncodesResolver_Proxy;
var Source_Fsa = require('./source').Source_Fsa;
var Source_Dba = require('./source').Source_Dba;
var storage = require('./storage');
var Storage_Factory = require('./storage').Storage_Factory;
var MORPHY_STORAGE_FILE = require('./storage').MORPHY_STORAGE_FILE;
var source = require('./source');
var MORPHY_SOURCE_FSA = require('./source').MORPHY_SOURCE_FSA;
var common = require('./langs_stuff/common');

// we need byte oriented string functions
// with namespaces support we only need overload string functions in current
// namespace namespace
// but currently use this ugly hack.

function FilesBundle(dirName, lang) {
	var DIRECTORY_SEPARATOR = '/';
	this.dir = null;
	this.lang = null;

	this.getLang = function() {
		return this.lang;
	};

	this.setLang = function(lang) {
		this.lang = lang.toLowerCase();
	};

	this.getCommonAutomatFile = function() {
		return this.genFileName('common_aut');
	};

	this.getPredictAutomatFile = function() {
		return this.genFileName('predict_aut');
	};

	this.getGramInfoFile = function() {
		return this.genFileName('morph_data');
	};

	this.getGramInfoAncodesCacheFile = function() {
		return this.genFileName('morph_data_ancodes_cache');
	};

	this.getAncodesMapFile = function() {
		return this.genFileName('morph_data_ancodes_map');
	};

	this.getGramTabFile = function() {
		return this.genFileName('gramtab');
	};

	this.getGramTabFileWithTextIds = function() {
		return this.genFileName('gramtab_txt');
	};

	this.getDbaFile = function(type) {
		if (!type) {
			type = 'db3';
		}

		return this.genFileName("common_dict_type");
	};

	this.getGramInfoHeaderCacheFile = function() {
		return this.genFileName('morph_data_header_cache');
	};

	this.genFileName = function(token, extraExt/* = null */) {
		return this.dir + token + '.' + this.lang
				+ (extraExt ? '.' + extraExt : '') + '.bin';
	};

    this.dir = dirName + DIRECTORY_SEPARATOR;
	this.setLang(lang);
};
exports.FilesBundle = FilesBundle;

function WordDescriptor_Collection_Serializer() {
    this.serialize = function(collection,
			asText) {
		var result = [];
        //util.puts(util.inspect(collection.descriptors[0].all_forms))
		for ( var idx in collection.descriptors) {
			var descriptor = collection.descriptors[idx];
			result.push(this.processWordDescriptor(descriptor, asText));
		}
		return result;
	};

    this.processWordDescriptor = function(descriptor, asText) {
		result = [];
		all = [];
		for ( var idx in descriptor.all_forms) {
			var obj = {};
			var word_form = descriptor.all_forms[idx];
			obj['form'] = word_form.getWord();
			obj['all'] = this.serializeGramInfo(word_form, asText);
			result.push(obj);
		}
		return result;
	};

	this.serializeGramInfo = function(/* Morphy_WordForm */wordForm, asText) {
		if (asText) {
			return wordForm.getPartOfSpeech() + ',' + wordForm.getGrammems().join(',');
		} else {
			return {
				'pos' : wordForm.getPartOfSpeech(),
				'grammems' : wordForm.getGrammems()
			};
		}
	}
	;
}
exports.WordDescriptor_Collection_Serializer = WordDescriptor_Collection_Serializer;

function Morphy(dir, lang/* = null */, options/* = {} */) {
	this.RESOLVE_ANCODES_AS_TEXT = 0;
	this.RESOLVE_ANCODES_AS_DIALING = 1;
	this.RESOLVE_ANCODES_AS_INT = 2;

	this.NORMAL = 0;
	this.IGNORE_PREDICT = 2;
	this.ONLY_PREDICT = 3;

	this.PREDICT_BY_NONE = 'none';
	this.PREDICT_BY_SUFFIX = 'by_suffix';
	this.PREDICT_BY_DB = 'by_db';

	this.storage_factory, this.common_fsa, this.common_source,
			this.predict_fsa, this.options, this.helper,
			this.last_prediction_type;

	// variables with two underscores uses lazy paradigm, i.e. initialized at
	// first time access
	// common_morphier,
	// predict_by_suf_morphier,
	// predict_by_db_morphier,
	// bulk_morphier,
	// word_descriptor_serializer,

	this.repairSourceOptions = function(options) {
		if (!options)
			options = {};
		if (!options['type'])
			options['type'] = MORPHY_SOURCE_FSA;
		if (!options['opts'])
			options['opts'] = null;
		return options;
	};

	this.repairOptions = function(options) {
		if (!options)
			options = {};
		if (!options['graminfo_as_text'])
			options['graminfo_as_text'] = true;
		if (!options['storage'])
			options['storage'] = MORPHY_STORAGE_FILE;
		if (!options['common_source'])
			options['common_source'] = this
				.repairSourceOptions(options['common_source']);
		if (!options['predict_by_suffix'])
			options['predict_by_suffix'] = true;
		if (!options['predict_by_db'])
			options['predict_by_db'] = true;
		if (!options['use_ancodes_cache']) 
			options['use_ancodes_cache'] = false;
		if (!options['resolve_ancodes'])
			options['resolve_ancodes'] = this.RESOLVE_ANCODES_AS_TEXT;

		return options;
	};

	this.createFilesBundle = function(dir, lang) {
		return new FilesBundle(dir, lang);
	};

	this.createStorageFactory = function(options) {
		return new Storage_Factory(options);
	};

    this.createFsa = function(storage, lazy) {
		return fsa.create(storage, lazy);
	};

    this.createGramInfo = function(graminfoFile, bundle) {
		// return new GramInfo_RuntimeCaching(new
		// GramInfo_Proxy(storage));
		// return new
		// GramInfo_RuntimeCaching(Morphy_GramInfo.create(storage,
		// false));

		result = new GramInfo_RuntimeCaching(new GramInfo_Proxy_WithHeader(
				graminfoFile, bundle.getGramInfoHeaderCacheFile()));

		if (this.options['use_ancodes_cache']) {
			return new GramInfo_AncodeCache(result, this.storage_factory.open(
					this.options['storage'], bundle
							.getGramInfoAncodesCacheFile(), true) // always
			// lazy open
			);
		} else {
			return result;
		}
	};

    this.createGramTab = function(storage) {
		return new GramTab_Proxy(storage);
	};

    this.createCommonSource = function(bundle, opts) {
		switch (opts['type']) {
		case MORPHY_SOURCE_FSA:
			return new Source_Fsa(this.common_fsa);
		case MORPHY_SOURCE_DBA:
			return new Source_Dba(bundle.getDbaFile(this
					.getDbaHandlerName(opts['opts']['handler'])), opts['opts']);
		default:
			throw new Error("Unknown source type given 'type'");
		}
	};

	this.createAncodesResolverInternal = function(
    /* GramTab_Interface */gramtab,
	bundle) {
		switch (this.options['resolve_ancodes']) {
		case this.RESOLVE_ANCODES_AS_TEXT:
			return [ 'AncodesResolver_ToText', /* (array) */gramtab ];
		case this.RESOLVE_ANCODES_AS_INT:
			return [ 'AncodesResolver_AsIs', [] ];
		case this.RESOLVE_ANCODES_AS_DIALING:
			return [
					'AncodesResolver_ToDialingAncodes',
					array(this.storage_factory.open(this.options['storage'],
							bundle.getAncodesMapFile(), true) // always lazy
					// open
					) ];
		default:
			throw new Error(
					"Invalid resolve_ancodes option, valid values are RESOLVE_ANCODES_AS_DIALING, RESOLVE_ANCODES_AS_INT, RESOLVE_ANCODES_AS_TEXT");
		}
	};

	this.createAncodesResolver = function(
    /* GramTab_Interface */gramtab,
	bundle, lazy) {
		result = this.createAncodesResolverInternal(gramtab, bundle);
		if (lazy) {
			return new AncodesResolver_Proxy(result[0], result[1]);
		} else {
			return AncodesResolver_Proxy.instantinate(result[0], result[1]);
		}
	};
	this.createMorphierHelper = function(
	/* GramInfo_Interace */graminfo,
	/* GramTab_Interface */gramtab, graminfoAsText,
    bundle) {
		return new Morphier_Helper(graminfo, gramtab, this
				.createAncodesResolver(gramtab, bundle, true), graminfoAsText);
	};

	// //////////////
	// init code
	// //////////////
    this.initNewStyle = function(bundle, options) {
		this.options = options = this.repairOptions(options);
		var storage_type = options['storage'];

		var storage_factory = this.storage_factory = this
                .createStorageFactory();
		var graminfo_as_text = this.options['graminfo_as_text'];

		// fsa
		this.common_fsa = this.createFsa(storage_factory.open(storage_type,
				bundle.getCommonAutomatFile(), false), false); // lazy
		this.predict_fsa = this.createFsa(storage_factory.open(storage_type,
				bundle.getPredictAutomatFile(), true), true); // lazy

		// graminfo
		var graminfo = this.createGramInfo(storage_factory.open(storage_type,
				bundle.getGramInfoFile(), true), bundle); // lazy

		// gramtab
		var gramtab = this.createGramTab(storage_factory.open(storage_type,
				graminfo_as_text ? bundle.getGramTabFileWithTextIds() : bundle
						.getGramTabFile(), true)); // always lazy

		// common source
		this.common_source = this.createCommonSource(bundle,
				this.options['common_source']);

		this.helper = this.createMorphierHelper(graminfo, gramtab,
				graminfo_as_text, bundle);
	};

    this.initOldStyle = function(bundle, options) {
		options = this.repairOptions(options);

		switch (bundle.getLang()) {
		case 'rus':
			bundle.setLang('ru_RU');
			break;
		case 'eng':
			bundle.setLang('en_EN');
			break;
		case 'ger':
			bundle.setLang('de_DE');
			break;
		}

		this.initNewStyle(bundle, options);
	};

	// TODO: use two versions of Morphy function i.e. Morphy_v3 { } ...
	// Morphy_v2 extends Morphy_v3
	if (dir instanceof FilesBundle && lang instanceof Object) {
		this.initOldStyle(dir, lang);
	} else {
		this.initNewStyle(this.createFilesBundle(dir, lang), options);
	}

	this.last_prediction_type = this.PREDICT_BY_NONE;

	/**
	 * @return Morphy_Morphier_Interface
	 */
	this.getCommonMorphier = function() {
		return this.common_morphier;
	};

	/**
	 * @return Morphy_Morphier_Interface
	 */
	this.getPredictBySuffixMorphier = function() {
		return this.predict_by_suf_morphier;
	};

	/**
	 * @return Morphy_Morphier_Interface
	 */
	this.getPredictByDatabaseMorphier = function() {
		return this.predict_by_db_morphier;
	};

	/**
	 * @return Morphy_Morphier_Bulk
	 */
	this.getBulkMorphier = function() {
		return this.bulk_morphier;
	};

	/**
	 * @return string
	 */
	this.getEncoding = function() {
		return this.helper.getGramInfo().getEncoding();
	};

	/**
	 * @return string
	 */
	this.getLocale = function() {
		return this.helper.getGramInfo().getLocale();
	};

	/**
	 * @return Morphy_GrammemsProvider_Base
	 */
	this.getGrammemsProvider = function() {
		return this.grammems_provider;
	};

	/**
	 * @return Morphy_GrammemsProvider_Base
	 */
	this.getDefaultGrammemsProvider = function() {
		return this.grammems_provider;
	};

	/**
	 * @return bool
	 */
	this.isLastPredicted = function() {
		return this.PREDICT_BY_NONE !== this.last_prediction_type;
	};

	this.getLastPredictionType = function() {
		return this.last_prediction_type;
	};

	/**
	 * @param mixed
	 *            word - string or array of strings
	 * @param mixed
	 *            type - prediction managment
	 * @return WordDescriptor_Collection
	 */
    this.findWord = function(word, type) {
		if (!type)
			type = this.NORMAL;

		if (word instanceof Array) {
			result = {};

			for ( var w in word) {
				result[w] = this.invoke('getWordDescriptor', w, type);
			}

			return result;
        } else {
            return this.invoke('getWordDescriptor', word, type);
		}
	};

	/**
	 * Alias for getBaseForm
	 * 
	 * @param mixed
	 *            word - string or array of strings
	 * @param mixed
	 *            type - prediction managment
	 * @return array
	 */
	this.lemmatize = function(word, type) {
		if (!type)
			type = this.NORMAL;
		return this.getBaseForm(word, type);
	};

	/**
	 * @param mixed
	 *            word - string or array of strings
	 * @param mixed
	 *            type - prediction managment
	 * @return array
	 */
	this.getBaseForm = function(word, type) {
		if (!type)
			type = this.NORMAL;
		return this.invoke('getBaseForm', word, type);
	};

	/**
	 * @param mixed should
	 *            word - string or array of strings
	 * @param mixed
	 *            type - prediction managment
	 * @return array
	 */
	this.getAllForms = function(word, type) {
		if (!type)
			type = this.NORMAL;
		return this.invoke('getAllForms', word, type);
	};

	/**
	 * @param mixed
	 *            word - string or array of strings
	 * @param mixed
	 *            type - prediction managment
	 * @return array
	 */
	this.getPseudoRoot = function(word, type) {
		if (!type)
			type = this.NORMAL;
		return this.invoke('getPseudoRoot', word, type);
	};

	/**
	 * @param mixed
	 *            word - string or array of strings
	 * @param mixed
	 *            type - prediction managment
	 * @return array
	 */
	this.getPartOfSpeech = function(word, type) {
		if (!type)
			type = this.NORMAL;
		return this.invoke('getPartOfSpeech', word, type);
	};

	/**
	 * @param mixed
	 *            word - string or array of strings
	 * @param mixed
	 *            type - prediction managment
	 * @return array
	 */
	this.getAllFormsWithAncodes = function(word, type) {
		if (!type)
			type = this.NORMAL;
		return this.invoke('getAllFormsWithAncodes', word, type);
	};

	/**
	 * @param mixed
	 *            word - string or array of strings
	 * @paradm bool asText - represent graminfo as text or ancodes
	 * @param mixed
	 *            type - prediction managment
	 * @return array
	 */
	this.getAllFormsWithGramInfo = function(word, asText, type) {
        if (asText == undefined) asText = true;
		if (type == undefined) type = this.NORMAL;

		if (false == (result = this.findWord(word, type))) {
			return false;
		}

		if (word instanceof Array) {
			out = {};

			for ( var w /* : r */in result) {
				if (false !== r) {
					out[w] = this.processWordsCollection(r, asText);
				} else {
					out[w] = false;
				}
			}

			return out;
		} else {
			return this.processWordsCollection(result, asText);
		}
	};

	/**
	 * @param mixed
	 *            word - string or array of strings
	 * @param mixed
	 *            type - prediction managment
	 * @return array
	 */
	this.getAncode = function(word, type) {
		if (!type)
			type = this.NORMAL;
		return this.invoke('getAncode', word, type);
	};

	/**
	 * @param mixed
	 *            word - string or array of strings
	 * @param mixed
	 *            type - prediction managment
	 * @return array
	 */
	this.getGramInfo = function(word, type) {
		if (!type)
			type = this.NORMAL;
		return this.invoke('getGrammarInfo', word, type);
	};

	/**
	 * @param mixed
	 *            word - string or array of strings
	 * @param mixed
	 *            type - prediction managment
	 * @return array
	 */
	this.getGramInfoMergeForms = function(word, type) {
		if (!type)
			type = this.NORMAL;
		return this.invoke('getGrammarInfoMergeForms', word, type);
	};

	this.getAnnotForWord = function(word, type) {
		return this.invoke('getAnnot', word, type);
	};

	/**
	 * @param string
	 *            word
	 * @param mixed
	 *            ancode
	 * @param mixed
	 *            commonAncode
	 * @param bool
	 *            returnOnlyWord
	 * @param mixed
	 *            callback
	 * @param mixed
	 *            type
	 * @return array
	 */
	this.castFormByAncode = function(word, ancode, commonAncode/* = null */,
			returnOnlyWord/* = false */, callback/* = null */, type/*
																	 * =
																	 * this.NORMAL
																	 */) {
		resolver = this.helper.getAncodesResolver();

		common_ancode_id = resolver.unresolve(commonAncode);
		ancode_id = resolver.unresolve(ancode);

		data = this.helper.getGrammemsAndPartOfSpeech(ancode_id);

		if (common_ancode_id) {
			data[1] = array_merge(data[1], this.helper
					.getGrammems(common_ancode_id));
		}

		return this.castFormByGramInfo(word, data[0], data[1], returnOnlyWord,
				callback, type);
	};

	/**
	 * @param string
	 *            word
	 * @param mixed
	 *            partOfSpeech
	 * @param array
	 *            grammems
	 * @param bool
	 *            returnOnlyWord
	 * @param mixed
	 *            callback
	 * @param mixed
	 *            type
	 * @return array
	 */
	this.castFormByGramInfo = function(word, partOfSpeech, grammems,
			returnOnlyWord/* = false */, callback/* = null */, type /*
																	 * =
																	 * this.NORMAL
																	 */) {
		if (false == (annot = this.getAnnotForWord(word, type))) {
			return false;
		}

		return this.helper.castFormByGramInfo(word, annot, partOfSpeech,
				grammems, returnOnlyWord, callback);
	};

	/**
	 * @param string
	 *            word
	 * @param string
	 *            patternWord
	 * @param mixed
	 *            essentialGrammems
	 * @param bool
	 *            returnOnlyWord
	 * @param mixed
	 *            callback
	 * @param mixed
	 *            type
	 * @return array
	 */
    this.castFormByPattern = function(word, patternWord, grammemsProvider /* = null */, returnOnlyWord /* = false */,
			callback /* = null */, type) {
		if (!type)
			type = this.NORMAL;
		if (false == (word_annot = this.getAnnotForWord(word, type))) {
			return false;
		}

		if (!grammemsProvider) {
			grammemsProvider = this.grammems_provider;
		}

		result = {};

		for ( var paradigm in this.getGramInfo(patternWord, type)) {
			for ( var grammar in paradigm) {
				pos = grammar['pos'];

				essential_grammems = grammemsProvider.getGrammems(pos);

				grammems = false !== essential_grammems ? array_intersect(
						grammar['grammems'], essential_grammems)
						: grammar['grammems'];

				res = this.helper.castFormByGramInfo(word, word_annot, pos,
						grammems, returnOnlyWord, callback, type);

				if (res.length) {
					result = array_merge(result, res);
				}
			}
		}

		return returnOnlyWord ? array_unique(result) : result;
	};

	// public interface end

	this.processWordsCollection = function(collection, asText) {
		if (!this.word_descriptor_serializer)
			this.create('word_descriptor_serializer');
		return this.word_descriptor_serializer.serialize(collection, asText);
	};

	this.invoke = function(method, word, type) {
		this.last_prediction_type = this.PREDICT_BY_NONE;

		// PREDICT
		if (type == this.ONLY_PREDICT) {
			if (word instanceof Array) {
				result = {};

				for ( var w in word) {
					result[w] = this.predictWord(method, w);
				}

				return result;
			} else {
				return this.predictWord(method, word);
			}
		}
		//BULK
		if (word instanceof Array) {
			if (!this.bulk_morphier)
				this.create('bulk_morphier');
			result = this.bulk_morphier[method](word);

			if (type !== this.IGNORE_PREDICT) {
				not_found = this.bulk_morphier.getNotFoundWords();

				for (i = 0, c = not_found.length; i < c; i++) {
					word = not_found[i];

					result[word] = this.predictWord(method, word);
				}
			} else {
				for (i = 0, c = not_found.length; i < c; i++) {
					result[not_found[i]] = false;
				}
			}

			return result;
		} else {
			//NORMAL
			if (!this.common_morphier)
				this.create('common_morphier');
			if (false == (result = this.common_morphier[method](word))) {
				if (type !== this.IGNORE_PREDICT) {
					return this.predictWord(method, word);
				}
			}

			return result;
		}
	};

	this.predictWord = function(method, word) {
		if (!this.predict_by_suf_morphier)
			this.create('predict_by_suf_morphier');
		if (false !== (result = this.predict_by_suf_morphier[method](word))) {
			this.last_prediction_type = this.PREDICT_BY_SUFFIX;

			return result;
		}
		if (!this.predict_by_db_morphier)
			this.create('predict_by_db_morphier');
		if (false !== (result = this.predict_by_db_morphier[method](word))) {
			this.last_prediction_type = this.PREDICT_BY_DB;

			return result;
		}

		return false;
	};

	this.getDbaHandlerName = function(name) {
		return name ? name : Source_Dba.getDefaultHandler();
	};

	this.repairOldOptions = function(options) {
		defaults = {
			'predict_by_suffix' : false,
			'predict_by_db' : false,
		};

		return options + defaults;
	};

	this.create = function(name) {
		switch (name) {
		case 'predict_by_db_morphier':
			this.predict_by_db_morphier = this.createPredictByDbMorphier(
					this.predict_fsa, this.helper);

			break;
		case 'predict_by_suf_morphier':
			this.predict_by_suf_morphier = this.createPredictBySuffixMorphier(
					this.common_fsa, this.helper);

			break;
		case 'bulk_morphier':
			this.bulk_morphier = this.createBulkMorphier(this.common_fsa,
					this.helper);

			break;
		case 'common_morphier':
			this.common_morphier = this.createCommonMorphier(this.common_fsa,
					this.helper);

			break;

		case 'word_descriptor_serializer':
			this.word_descriptor_serializer = this
					.createWordDescriptorSerializer();
			break;
		case 'grammems_provider':
			this.grammems_provider = this.createGrammemsProvider();
			break;
		default:
			throw new Error("Invalid prop name 'name'");
		}

		return this.name;
	};

	// //////////////////
	// factory methods
	// //////////////////
	this.createGrammemsProvider = function() {
		return Morphy_GrammemsProvider_Factory.create(this);
	};

	this.createWordDescriptorSerializer = function() {
		return new WordDescriptor_Collection_Serializer();
	};

	this.createCommonMorphier = function(/* Fsa_Interface */fsa, /* Morphy_Morphier_Helper */
	helper) {
		return new Morphier_Common(fsa, helper);
	};

	this.createBulkMorphier = function(/* Fsa_Interface */fsa, /* Morphy_Morphier_Helper */
	helper) {
		return new Morphier_Bulk(fsa, helper);
	};

	this.createPredictByDbMorphier = function(/* Fsa_Interface */fsa, /* Morphy_Morphier_Helper */
	helper) {
		if (this.options['predict_by_db']) {
			return new Morphier_Predict_Database(fsa, helper);
		} else {
			return new Morphier_Empty();
		}
	};

	this.createPredictBySuffixMorphier = function(
	/* Fsa_Interface */fsa, /* Morphy_Morphier_Helper */
	helper) {
		if (this.options['predict_by_suffix']) {
			return new Morphier_Predict_Suffix(fsa, helper);
		} else {
			return new Morphier_Empty();
		}
	};
};
exports.Morphy = Morphy;
