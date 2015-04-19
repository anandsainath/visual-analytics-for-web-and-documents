###################################
#	Source: http://brandonrose.org/clustering
###################################
from __future__ import print_function
import numpy as np
import pandas as pd
import nltk
import re
import os
import codecs
from sklearn import feature_extraction
import math

class DocumentCluster:

	def __init__(self, documents):
		self.documents = documents

	def get_cluster_assignments(self):
		totalvocab_stemmed = []
		totalvocab_tokenized = []
		for doc_content in self.documents['content']:
			allwords_stemmed = self.tokenize_and_stem(doc_content) #for each item in 'documents['content']', tokenize/stem
			totalvocab_stemmed.extend(allwords_stemmed) #extend the 'totalvocab_stemmed' list

			allwords_tokenized = self.tokenize_only(doc_content)
			totalvocab_tokenized.extend(allwords_tokenized)

		vocab_frame = pd.DataFrame({'words': totalvocab_tokenized}, index = totalvocab_stemmed)

		from sklearn.feature_extraction.text import TfidfVectorizer

		#define vectorizer parameters
		tfidf_vectorizer = TfidfVectorizer(max_df=0.70, max_features=200000,
										min_df=0.2, stop_words='english',
										use_idf=True, tokenizer=self.tokenize_and_stem, ngram_range=(1,3))

		tfidf_matrix = tfidf_vectorizer.fit_transform(self.documents['content']) #fit the vectorizer to documents['content']
		terms = tfidf_vectorizer.get_feature_names()

		from sklearn.metrics.pairwise import cosine_similarity
		dist = 1 - cosine_similarity(tfidf_matrix)

		from sklearn.cluster import KMeans
		num_clusters = int(math.floor(math.sqrt(len(self.documents['id'])/2) + 0.5))
		km = KMeans(n_clusters=num_clusters)
		km.fit(tfidf_matrix)
		clusters = km.labels_.tolist()

		# frame = pd.DataFrame(documents, index = [clusters] , columns = ['content', 'id'])

		cluster_assignments = {}
		index = 0

		for cluster_label in clusters:
			if cluster_label in cluster_assignments:
				cluster_assignments[cluster_label]['ids'].append(self.documents['id'][index])
			else:
				cluster_assignments[cluster_label] = {'ids': [self.documents['id'][index]], 'words': []}
			index += 1

		#sort cluster centers by proximity to centroid
		order_centroids = km.cluster_centers_.argsort()[:, ::-1] 

		for i in range(num_clusters):
		    for ind in order_centroids[i, :6]: #replace 6 with n words per cluster
		    	cluster_assignments[i]['words'].append(vocab_frame.ix[terms[ind].split(' ')].values.tolist()[0][0].encode('utf-8', 'ignore'))


		list_cluster_assignments = []
		for key, value in cluster_assignments.iteritems():
			list_cluster_assignments.append({
				'cluster': key,
				'ids': value['ids'],
				'words': value['words']
			})
		return list_cluster_assignments

	def tokenize_and_stem(self, text):
		from nltk.stem.snowball import SnowballStemmer
		stemmer = SnowballStemmer("english")
		# first tokenize by sentence, then by word to ensure that punctuation is caught as it's own token
		tokens = [word for sent in nltk.sent_tokenize(text) for word in nltk.word_tokenize(sent) if len(word)>3]
		filtered_tokens = []
		# filter out any tokens not containing letters (e.g., numeric tokens, raw punctuation)
		for token in tokens:
			if re.search('[a-zA-Z]', token):
				filtered_tokens.append(token)
		stems = [stemmer.stem(t) for t in filtered_tokens]
		return stems

	def tokenize_only(self, text):
		# first tokenize by sentence, then by word to ensure that punctuation is caught as it's own token
		tokens = [word.lower() for sent in nltk.sent_tokenize(text) for word in nltk.word_tokenize(sent) if len(word)>3]
		filtered_tokens = []
		# filter out any tokens not containing letters (e.g., numeric tokens, raw punctuation)
		for token in tokens:
			if re.search('[a-zA-Z]', token):
				filtered_tokens.append(token)
		return filtered_tokens
