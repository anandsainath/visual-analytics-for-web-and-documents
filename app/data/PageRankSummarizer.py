###################################
#	Source: http://joshbohde.com/blog/document-summarization
###################################

import networkx as nx
import numpy as np
import re

from nltk.tokenize.punkt import PunktSentenceTokenizer
from sklearn.feature_extraction.text import TfidfTransformer, CountVectorizer

class PageRankSummarizer:

	def pagerank(self, _sentences):
		
		bow_matrix = CountVectorizer().fit_transform(_sentences)
		normalized = TfidfTransformer().fit_transform(bow_matrix)
	 
		similarity_graph = normalized * normalized.T
	 
		nx_graph = nx.from_scipy_sparse_matrix(similarity_graph)
		scores = nx.pagerank(nx_graph)
		return sorted(((scores[i],s) for i,s in enumerate(_sentences)),reverse=True)

	def summarize(self, sentences, no_of_lines):
		document = " ".join([line if line.endswith(".") else line+"." for line in sentences])

		#RegEx to replace . followed by Capitalized word to . space Capitalized word
		pattern = re.compile('([.])([A-Z][a-zA-Z]*)')
		document = pattern.sub(r'. \2',document)

		sentence_tokenizer = PunktSentenceTokenizer()
		_sentences = sentence_tokenizer.tokenize(document)
		document_pagerank = self.pagerank(_sentences)

		if no_of_lines == 1:
			return [line[1] for line in document_pagerank[:no_of_lines]]
		else:
			## Maintain the order of the sentences as they appeared in the original document
			output_array_index = []
			summary_array = [line[1] for line in document_pagerank[:no_of_lines]]
			
			for sentence in summary_array:
				output_array_index.append(_sentences.index(sentence))

			return [line for (index,line) in sorted(zip(output_array_index,summary_array))]