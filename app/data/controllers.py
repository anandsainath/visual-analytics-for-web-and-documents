# #Flask dependencies
# from flask import Blueprint, request, render_template, flash, g, redirect, url_for

# # Import the database object from the main app module
# from app.data.models import JDocument, JSource
# from app import db
# import pprint
# import glob
# import nltk

# # Define the blueprint: 'data', set its url prefix: app.url/data
# mod_data = Blueprint('data', __name__, url_prefix='/data')

# @mod_data.route('/process-entities')
# def process_entities(text):
# 	for sent in nltk.sent_tokenize(text):
# 		for chunk in nltk.ne_chunk(nltk.pos_tag(nltk.word_tokenize(sent))):
# 			if hasattr(chunk, 'node'):
# 				print chunk.node, ' '.join(c[0] for c in chunk.leaves())

# @mod_data.route('/insert-documents', methods=['GET'])
# def insert_document():
# 	JDocument.drop_collection()
	
# 	last_doc_name = ''
# 	for file_path in glob.glob("document_corpus/*.txt"):
# 		file_content =  [line.rstrip('\n\r') for line in open(file_path,'r')]
# 		document = JDocument(
# 			name = file_content[1],
# 			content = file_content[3]
# 		)
# 		document.save()

# 		process_entities(document.content)

# 		source = JSource(
# 			source_format = 'text/plain'
# 		)
# 		document.source = source
# 		document.save()

# 	return last_doc_name