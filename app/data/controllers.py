#Flask dependencies
from __future__ import division
from flask import Blueprint, request, render_template, redirect, url_for, session
from werkzeug import secure_filename
from app import app
from textblob import TextBlob

import glob
import ner
import os
import zipfile
import json
import re
import md5, datetime
import json

from PageRankSummarizer import PageRankSummarizer
from TFIDF import TFIDF
from ..utils import Utils as DBUtils

# Define the blueprint: 'data', set its url prefix: app.url/data
mod_data = Blueprint('data', __name__, url_prefix='/data')

###########################
#FILE UPLOAD CONFIGURATION#

ALLOWED_EXTENSIONS = set(['zip'])

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS

###########################

def format_line(line):
	open_tag_template = "<span class='label {{entity_type}}'>"
	list_entities = get_entities()

	print list_entities

	for entity_type in list_entities:
		line = line.replace("<"+entity_type+">", open_tag_template.replace("{{entity_type}}", entity_type)).replace("</"+entity_type+">","</span>")

	return line

@mod_data.route("/test")
def test():
	return get_word_cloud()


@mod_data.route("/visualize")
def visualize():
	if 'token' in session:
		return render_template('data/viz.html')
	else:
		return redirect(url_for('.index'))


@mod_data.route('/grid')
def grid():
	return render_template('data/grid.html')

# Public APIs

###### GRID VIEW ######

@mod_data.route('/compute-simmilarity/<seed_doc_id>')
def compute_grid_simmilarity(seed_doc_id):
	from sklearn.feature_extraction.text import TfidfVectorizer
	from sklearn.metrics.pairwise import cosine_similarity
	session_db = DBUtils().get_session_db()

	content_vector = []
	id_vector = []

	current_index = 0
	seed_document_index = -1

	for doc in session_db.find({},{'ID': 1, '__content': 1}):
		content_vector.append(" ".join(doc['__content']))
		id_vector.append(doc['ID'])

		if seed_doc_id == doc['ID']:
			seed_document_index = current_index
		current_index += 1

	tfidf_vectorizer = TfidfVectorizer()
	tfidf_matrix = tfidf_vectorizer.fit_transform(content_vector)
	cosine = cosine_similarity(tfidf_matrix[seed_document_index], tfidf_matrix)

	return json.dumps(dict(zip(id_vector, cosine[0].tolist())))

@mod_data.route('/get-grid-data')
def get_grid_data():
	session_db = DBUtils().get_session_db()
	results = []
	for doc in session_db.find({},{'ID': 1, '__polarity': 1, '__subjectivity': 1, '__num_entities': 1, '__document_length': 1}):
		results.append({'name': doc['ID'], 'p': doc['__polarity'], 's': doc['__subjectivity'], 'e': doc['__num_entities'], 'l': doc['__document_length']})

	return json.dumps(results)

###### DOCUMENT VIEW ######

@mod_data.route('/update-entity/<entity_type>/<entity_text>')
def update_entity(entity_type, entity_text):
	session_db = DBUtils().get_session_db()
	entity_text = entity_text.replace("{_}","/")

	updated_file_count = 0
	updated_documents = []

	list_entities = get_entities()
	
	for doc in session_db.find({}, {'ID': 1, '__formatted_content': 1}):
		__formatted_content = doc['__formatted_content']
		__new_formatted_content = []

		content_has_entity = False
		for line in __formatted_content:
			match_template = "{{entity_text}}([\W]?)"
			replace_template = "<{{entity_type}}>{{entity_text}}</{{entity_type}}>\1"
			if entity_text in line:

				match_str = match_template.replace("{{entity_text}}", entity_text)
				replace_str = replace_template.replace("{{entity_type}}", entity_type).replace("{{entity_text}}", entity_text)

				line = re.sub(match_str, replace_str, line)
				__new_formatted_content.append(line)
				content_has_entity = True
			else:
				__new_formatted_content.append(line)

		if content_has_entity:
			updated_file_count += 1
			updated_documents.append(doc['ID'])
			#Replace the __formatted_content with the new formatted content and add the entity text to the entity type array..
			session_db.find_and_modify(query={'ID': doc['ID']}, update={"$set": {"__formatted_content": __new_formatted_content}, "$addToSet":{entity_type: entity_text}}, upsert=False)

	#Update the entity frequencies for the documents that just got updated

	if not entity_type in list_entities:
		print "Generating Keys Table"
		DBUtils().generate_keys_table(session['token'])

	list_entities = get_entities()

	for doc in session_db.find({'ID':{"$in":updated_documents}}):
		value_template = "<{{type}}>{{value}}</{{type}}>"
		str_content = " ".join(doc['__formatted_content'])
		list_entity_frequency = []

		for entity_type in list_entities:
			if entity_type in doc:
				for value in doc[entity_type]:
					value_str = value_template.replace("{{type}}",entity_type).replace("{{value}}",value)
					list_entity_frequency.append([value_str,str_content.count(value_str)])

		session_db.find_and_modify(query={'ID': doc['ID']}, update={"$set":{'__entity_frequency': list_entity_frequency}})

	return json.dumps({"updated_file_count": updated_file_count})


def get_entities():
	entity_columns = DBUtils().get_keys()
	columns_to_be_removed = ['_id', 'SUMMARY', 'ID']
	
	for key in entity_columns:
		if key.startswith("__"):
			columns_to_be_removed.append(key)

	for key in columns_to_be_removed:
		if key in entity_columns: entity_columns.remove(key)

	return entity_columns

@mod_data.route('/get-entity-types')
def get_entity_types():
	return json.dumps(get_entities())


## Returns list of tuples containing (read_count, doc_id, "__list_selection_color__")
@mod_data.route("/get-document-list")
def get_document_list():
	session_db = DBUtils().get_session_db()
	return json.dumps([{"count":document['__read_count'], "name":document['ID'], "color":""} for document in session_db.find({}, {'ID' : 1, '__read_count': 1})])

@mod_data.route("/get-document/<doc_id>")
def get_document(doc_id):
	session_db = DBUtils().get_session_db()
	session_db.update({'ID':doc_id},{'$inc':{'__read_count': 1}},upsert=False, multi=False)
	document_cursor = session_db.find_one({"ID":doc_id})

	entity_columns = document_cursor.keys()
	columns_to_be_removed = ['_id', 'SUMMARY', 'ID']
	
	for key in entity_columns:
		if key.startswith("__"):
			columns_to_be_removed.append(key)
	
	#['__formatted_content','__read_count','__content', '__word_frequency', '__entity_frequency', '__document_length','__subjectivity','__polarity']
	for key in columns_to_be_removed:
		if key in entity_columns: entity_columns.remove(key)

	return json.dumps({
		"summary": document_cursor["SUMMARY"], 
		"content": [format_line(content_line) for content_line in document_cursor["__formatted_content"]], 
		"entities": {column_name:document_cursor[column_name] for column_name in entity_columns}, 
		"entity_columns": entity_columns, 
		"id": document_cursor["ID"]
	})

@mod_data.route('/get-word-cloud/<int:num_words>/<int:only_entities>')
def get_word_cloud(num_words, only_entities):
	db = DBUtils()
	db.generate_doc_summary(session['token'], (True, False)[only_entities == 0])
	max_count = -1
	word_tag_data = []

	for doc in db.get_session_word_freq_db().find({}).sort('value', -1).limit(num_words):
		if max_count == -1:
			max_count = doc['value']

		plain_value = doc['_id']
		entity_type = ""
		if "</" in plain_value:
			entity_type = plain_value[plain_value.index("<")+1:plain_value.index(">")].strip()
			plain_value = plain_value[plain_value.index(">")+1:plain_value.index("<",1)].strip().lower()

		relative_value = doc['value']/max_count
		font_size = 12 + (relative_value * 24)
		word_tag_data.append([plain_value, entity_type, font_size])

	def sort_key(row):
		return row[0]

	word_tag_data.sort(key = sort_key)
	return json.dumps(word_tag_data)


@mod_data.route('/get-markup-document', methods=['POST'])
def get_markup_document():
	destination_path = os.path.join(app.config['UPLOAD_FOLDER'], session['corpus'], session['folder_name'])
	tagger = ner.SocketNER(host='localhost', port=8080, output_format='inlineXML')
	dict_entities = {}
	file_content = []

	pageRankSummarizer = PageRankSummarizer()
	summary_array = []

	for sample_file_name in glob.glob(destination_path+"/*.txt"):
		file_line_content = filter(None, [line.rstrip('\n\r') for line in open(sample_file_name, 'r')])
		for line in file_line_content:
			dict_line_entities = tagger.get_entities(line)
			file_content.append(format_line(tagger.tag_text(line)))
			
			for key, value in dict_line_entities.iteritems():
				if key in dict_entities:
					dict_entities[key] = list(set(dict_entities[key] + value))
				else:
					dict_entities[key] = list(set(value))
		break

	summary_array = pageRankSummarizer.summarize(file_line_content, 1)
	option_values = []
	option_values.append(os.path.basename(sample_file_name))
	for index in range(len(file_content)):
		option_values.append("Line "+ str(index+1))

	return json.dumps({"entities": dict_entities, "content": file_content, "summary": summary_array, "options": option_values});

@mod_data.route('/get-markup-document-summary/lines/<num_lines>')
def get_markup_document_summary(num_lines):
	if(not(('corpus' in session) & ('folder_name' in session))):
		return json.dumps({"summary": []})

	destination_path = os.path.join(app.config['UPLOAD_FOLDER'], session['corpus'], session['folder_name'])
	pageRankSummarizer = PageRankSummarizer()
	summary_array = []
	file_line_content = []

	for sample_file_name in glob.glob(destination_path+"/*.txt"):
		file_line_content = [line.rstrip('\n\r') for line in open(sample_file_name, 'r')]
		break
	
	summary_array = pageRankSummarizer.summarize(file_line_content, int(num_lines))
	return json.dumps({"summary": summary_array});

@mod_data.route("/", methods=['GET', 'POST'])
def index():
	if request.method == 'POST':
		file = request.files['file']
		if file and allowed_file(file.filename):

			filename = secure_filename(file.filename)
			file_name_without_extension = filename.rsplit('.', 1)[0]

			md5sum_generator = md5.new()
			md5sum_generator.update(filename)
			md5sum_generator.update(datetime.datetime.now().isoformat())
			collection_name = md5sum_generator.hexdigest()
			file_path = os.path.join(app.config['UPLOAD_FOLDER'], collection_name, filename)
			directory_path =  os.path.join(app.config['UPLOAD_FOLDER'], collection_name)
			destination_path = os.path.join(app.config['UPLOAD_FOLDER'], collection_name, file_name_without_extension)

			if not os.path.exists(directory_path):
				os.makedirs(directory_path, mode=0777)
				os.chmod(directory_path, 0777)

			file.save(file_path)
			
			with zipfile.ZipFile(file_path, "r") as z:
				z.extractall(destination_path)
			
			session['corpus'] = collection_name
			session['folder_name'] = file_name_without_extension
			session.permanent = True

			os.remove(file_path)

			return render_template('data/markup.html')
			
	return render_template('data/index.html')

@mod_data.route('/process-documents', methods=['POST'])
def process_document():
	if 'corpus' in session:

		tagger = ner.SocketNER(host="localhost", port=8080)
		
		collection_name = session['corpus']
		folder_name = session['folder_name']
		destination_path = os.path.join(app.config['UPLOAD_FOLDER'], collection_name, folder_name)
		data_array = []
		pageRankSummarizer = PageRankSummarizer()
		tfidf_parser = TFIDF()

		for input_file_name in glob.glob(destination_path+"/*.txt"):
			dict_entities = {}
			file_content = []

			no_of_entities = 0

			file_line_content = filter(None, [re.sub(r'[^\x00-\x7F]+',' ', line.rstrip('\n\r')).strip() for line in open(input_file_name, 'r')])
			for line in file_line_content:
				dict_line_entities = tagger.get_entities(line)
				file_content.append(tagger.tag_text(line))
				
				for key, value in dict_line_entities.iteritems():
					no_of_entities += len(value)
					if key in dict_entities:
						dict_entities[key] = list(set(dict_entities[key] + value))
					else:
						dict_entities[key] = list(set(value))
			
			list_entity_frequency = []
			str_content = " ".join(file_content)

			value_template = "<{{type}}>{{value}}</{{type}}>"
			for entity_type,list_value in dict_entities.iteritems():
				for value in list_value:
					value_str = value_template.replace("{{type}}",entity_type).replace("{{value}}",value)
					list_entity_frequency.append([value_str,str_content.count(value_str)])

			dict_entities['__entity_frequency'] = list_entity_frequency
			dict_entities['__word_frequency'] = tfidf_parser.compute_word_frequency(file_line_content)

			blob_file_content = TextBlob(str_content)
			dict_entities['__document_length'] = len(re.findall(r'\w+', str_content))
			dict_entities['__num_entities'] = no_of_entities
			dict_entities['__polarity'] =  blob_file_content.sentiment.polarity
			dict_entities['__subjectivity'] = blob_file_content.sentiment.subjectivity
			
			dict_entities['__formatted_content'] = file_content
			dict_entities['__content'] = file_line_content

			# if(request.form['title'] != "?"):
			# 	selected_title_option = int(request.form['title'])
			# 	if(selected_title_option == 1):
			# 		dict_entities['TITLE'] = os.path.basename(input_file_name)
			# 	else:
			# 		dict_entities['TITLE'] = file_line_content[selected_title_option-1]

			# dict_entities['SUMMARY'] = pageRankSummarizer.summarize(file_line_content, int(request.form['summary-lines']))
			dict_entities['SUMMARY'] = pageRankSummarizer.summarize(file_line_content, 2)
			dict_entities['ID'] = os.path.basename(input_file_name)
			dict_entities['__read_count'] = 0
			data_array.append(dict_entities)
			

		new_collection = DBUtils().get_collection_obj(collection_name)
		new_collection.insert(data_array)

		##Generate a table with the names of all the columns so that this can be referenced further..
		##Caution: Needs to be updated when ever a new entity type is created..
		DBUtils().generate_keys_table(collection_name)
		
		#Set the session value..
		session['token'] = collection_name
		# os.remove(os.path.join(app.config['UPLOAD_FOLDER'], collection_name))
		return json.dumps({"success": True, "redirect": url_for('.visualize')})

	return json.dumps({"success": False})