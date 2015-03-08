#!/usr/bin/env python
# encoding: utf-8

'''
https://github.com/yebrahim/TF-IDF-Generator/blob/master/tfidf.py
'''

import nltk
import sys, re, math, unicodedata
import glob
import string
from collections import defaultdict

from nltk.stem.wordnet import WordNetLemmatizer
from nltk.tokenize.punkt import PunktWordTokenizer

class TFIDF:

	# a list of (words-freq) pairs for each document
	global_terms_in_doc = {}
	# list to hold occurrences of terms across documents
	global_term_freq    = {}
	num_docs            = 0
	lang        = 'english'
	lang_dictionary     = {}
	top_k               = -1
	supported_langs     = ('english', 'french')

	# support for custom language if needed
	def loadLanguageLemmas(self, filePath):
		f = open(filePath)
		for line in f:
			words = line.split()
			if words[1] == '=' or words[0] == words[1]:
				continue
			self.lang_dictionary[words[0]] = words[1]

	def remove_diacritic(self, words):
		for i in range(len(words)):
			w = unicode(words[i], 'ISO-8859-1')
			w = unicodedata.normalize('NFKD', w).encode('ASCII', 'ignore')
			words[i] = w.lower()
		return words

	# function to tokenize text, and put words back to their roots
	def tokenize(self, text):
		text = ' '.join(text)
		tokens = PunktWordTokenizer().tokenize(text)

		# lemmatize words. try both noun and verb lemmatizations
		lmtzr = WordNetLemmatizer()
		for i in range(0,len(tokens)):
			#tokens[i] = tokens[i].strip("'")
			if self.lang != 'english':
				if tokens[i] in self.lang_dictionary:
					tokens[i] = self.lang_dictionary[tokens[i]]
			else:
				res = lmtzr.lemmatize(tokens[i])
				if res == tokens[i]:
					tokens[i] = lmtzr.lemmatize(tokens[i], 'v')
				else:
					tokens[i] = res

		# don't return any single letters
		tokens = [t for t in tokens if len(t) > 4 and not t.isdigit()]
		return tokens

	def remove_stopwords(self, text):
		# remove punctuation
		chars = ['.',';']
	            #'’', "'", '/', '"', '?', '!', '#', '$', '%', '^', '&',
	            # '*', '(', ')', ' - ', '_', '+' ,'=', '@', ':', '\\', ',',
	            #  '~', '`', '<', '>', '|', '[', ']', '{', '}', '–', '“',
	            # '»', '«', '°'
		for c in chars:
			text = text.replace(c, ' ')
	    
		text = text.split()

		if self.lang == 'english':
			stopwords = nltk.corpus.stopwords.words('english')
		else:
			stopwords = open(self.lang + '_stopwords.txt', 'r').read().split()
		content = [w for w in text if w.lower().strip() not in stopwords]
		return content

	def compute_word_frequency(self, list_file_content):
		terms_in_doc = {}
		doc_words = " ".join(list_file_content).lower()
		doc_words = filter(None, filter(lambda x: x in string.printable, doc_words))
		doc_words = self.remove_stopwords(doc_words)
		doc_words = self.tokenize(doc_words)

		for word in doc_words:
			if word in terms_in_doc:
				terms_in_doc[word] += 1
			else:
				terms_in_doc[word] = 1

		list_word_frequency = []
		for word, value in terms_in_doc.iteritems():
			list_word_frequency.append([word, value])

		return list_word_frequency


	def compute_tfidf(self, input_folder_path):
		display_mode = 'both'

		for input_file_name in glob.glob(input_folder_path):
			# local term frequency map
			terms_in_doc = {}
    
			doc_words = open(input_file_name).read().lower()
			doc_words = filter(None, filter(lambda x: x in string.printable, doc_words))
			# print 'words:\n', doc_words
			doc_words = self.remove_stopwords(doc_words)
			# print 'after stopwords:\n', doc_words
			doc_words = self.tokenize(doc_words)
			# print 'after tokenize:\n', doc_words

			# increment local count
			for word in doc_words:
				if word in terms_in_doc:
					terms_in_doc[word] += 1
				else:
					terms_in_doc[word]  = 1

			# increment global frequency
			for (word,freq) in terms_in_doc.items():
				if word in self.global_term_freq:
					self.global_term_freq[word] += 1
				else:
					self.global_term_freq[word]  = 1

			self.global_terms_in_doc[input_file_name] = terms_in_doc

		# print self.global_term_freq

		result = []			
		for input_file_name in glob.glob(input_folder_path):
			# iterate over terms in input_file_name, calculate their tf-idf, put in new list
			max_freq = 0;
			
			for (term,freq) in self.global_terms_in_doc[input_file_name].items():
				if freq > max_freq:
					max_freq = freq
			
			for (term,freq) in self.global_terms_in_doc[input_file_name].items():
				idf = math.log(float(1 + self.num_docs) / float(1 + self.global_term_freq[term]))
				tfidf = float(freq) / float(max_freq) * float(idf)
				result.append([tfidf, term])

		# sort result on tfidf and write them in descending order
		result = sorted(result, reverse=True)
		print result[:20]
