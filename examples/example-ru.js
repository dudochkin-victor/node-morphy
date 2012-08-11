// first we include phpmorphy library
var util = require('util');
var common = require('../js/common');
var FilesBundle = require('../js/common').FilesBundle;
var Morphy = require('../js/common').Morphy;
var StorageType = require('../js/storage').MORPHY_STORAGE_FILE;
// set some options
var opts = {
	// storage type, follow types supported
	// MORPHY_STORAGE_FILE - use file operations(fread, fseek) for dictionary
	// access, this is very slow...
	// MORPHY_STORAGE_MEM - load dict to memory each time when Morphy
    'storage' : StorageType,
	// Extend graminfo for getAllFormsWithGramInfo method call
	'with_gramtab' : false,
	// Enable prediction by suffix
	'predict_by_suffix' : true,
	// Enable prediction by prefix
	'predict_by_db' : true
};

// Path to directory where dictionaries located
var dir = '../data/morph';

// Create descriptor for dictionary located in dir with russian language
var dict_bundle = new FilesBundle(dir, 'rus');

// Create Morphy instance
morphy = new Morphy(dict_bundle, opts);

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

// Hint: in this example words word_one, word_two are in russian
// language(cp1251 encoding)
word_one = 'ПОДОШЛА';
word_two = 'МОРФОЛОГИЗАТОРА';

// word by word processing
// each function return array with result or FALSE when no form(s) for given
// word found(or predicted)
base_form = morphy.getBaseForm(word_one);
all_forms = morphy.getAllForms(word_one);
pseudo_root = morphy.getPseudoRoot(word_one);
graminfo = morphy.getGramInfo(word_one);
// You can also retrieve all word forms with graminfo via
// getAllFormsWithGramInfo method call
all_forms_with_gram = morphy.getAllFormsWithGramInfo(word_one, false);

util.puts('all forms with graminfo for \'' + word_one + '\' = ' + util.inspect(all_forms_with_gram, false, 10));

util.puts('base form for \'' + word_one + '\' = ' + util.inspect(base_form));
util.puts('all forms for \'' + word_one + '\' = ' + util.inspect(all_forms));
util.puts('pseudo root for \'' + word_one + '\' = ' + util.inspect(pseudo_root));
util.puts('graminfo form for \'' + word_one + '\' = ' + util.inspect(graminfo, false, 10));


//util.puts('Testing bulk mode...\n');

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

//util.puts('bulk mode base form = ' + util.inspect(base_form));
//util.puts('bulk mode all forms = ' + util.inspect(all_forms));



