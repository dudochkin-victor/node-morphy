// first we include phpmorphy library
var util = require('util');
var common = require('../js/common');
var FilesBundle = require('../js/common').FilesBundle;
var Morphy = require('../js/common').Morphy;
var MORPHY_STORAGE_FILE = require('../js/storage').MORPHY_STORAGE_FILE;
// set some options
var opts = {
	// storage type, follow types supported
	// MORPHY_STORAGE_FILE - use file operations(fread, fseek) for dictionary
	// access, this is very slow...
	// MORPHY_STORAGE_SHM - load dictionary in shared memory(using shmop php
	// extension), this is preferred mode
	// MORPHY_STORAGE_MEM - load dict to memory each time when Morphy
	// intialized, this useful when shmop ext. not activated. Speed same as for
	// MORPHY_STORAGE_SHM type
	'storage' : MORPHY_STORAGE_FILE,
	// Extend graminfo for getAllFormsWithGramInfo method call
	'with_gramtab' : false,
	// Enable prediction by suffix
	'predict_by_suffix' : true,
	// Enable prediction by prefix
	'predict_by_db' : true
};

// Path to directory where dictionaries located
var dir = '../data/morph';

// Create descriptor for dictionary located in dir directory with russian
// language
var dict_bundle = new FilesBundle(dir, 'eng');

// Create Morphy instance
// try {
morphy = new Morphy(dict_bundle, opts);
// } catch (e) {
// util.puts('Error occured while creating Morphy instance: \n' + e);
// }

// All words in dictionary in UPPER CASE, so don`t forget set proper locale
// Supported dicts and locales:
// *------------------------------*
// | Dict. language | Locale name |
// |------------------------------|
// | Russian | cp1251 |
// |------------------------------|
// | English | cp1250 |
// |------------------------------|
// | German | cp1252 |
// *------------------------------*
// codepage = morphy.getCodepage();
// setlocale(LC_CTYPE, array('ru_RU.CP1251', 'Russian_Russia.1251'));

// Hint: in this example words word_one, word_two are in russian
// language(cp1251 encoding)
word_one = 'ANTIQUES';
word_two = 'МОРФОЛОГИЗАТОРА';

util.puts("Testing single mode...\n");

// try {
// word by word processing
// each function return array with result or FALSE when no form(s) for given
// word found(or predicted)
base_form = morphy.getBaseForm(word_one);
all_forms = morphy.getAllForms(word_one);
pseudo_root = morphy.getPseudoRoot(word_one);

// if (false == base_form)
// throw new Error('Can`t find base form of \'' + word_one + '\' word');
// if (false == all_forms)
// throw new Error('Can`t find all forms of \'' + word_one + '\' word');
// if (false == pseudo_root)
// throw new Error('Can`t find pseudo root of \'' + word_one + '\' word');

util.puts('base form for \'' + word_one + '\' = ' + util.inspect(base_form));
util.puts('all forms for \'' + word_one + '\' = ' + util.inspect(all_forms));
util.puts('pseudo root for \'' + word_one + '\' = ' + util.inspect(pseudo_root));

util.puts('Testing bulk mode...\n');

// bulk mode speed-ups processing up to 50-100%(mainly for getBaseForm
// method)
// in bulk mode all function always return array
//bulk_words = [ word_one, word_two ];
//base_form = morphy.getBaseForm(bulk_words);
//all_forms = morphy.getAllForms(bulk_words);
//pseudo_root = morphy.getPseudoRoot(bulk_words);

// Bulk result format:
// array(
// INPUT_WORD1 : array(OUTWORD1, OUTWORD2, ... etc)
// INPUT_WORD2 : FALSE <-- when no form for word found(or predicted)
// )

util.puts('bulk mode base form = ' + util.inspect(base_form));
//util.puts('bulk mode all forms = ' + util.inspect(all_forms));

// You can also retrieve all word forms with graminfo via
// getAllFormsWithGramInfo method call
all_forms_with_gram = morphy.getAllFormsWithGramInfo(word_one, false);
util.puts('all forms with graminfo for \'' + word_one + '\' = ' + util.inspect(all_forms_with_gram, false, 10));
// } catch (e) {
// util.puts('Error occured while text processing: ' + e);
// }
