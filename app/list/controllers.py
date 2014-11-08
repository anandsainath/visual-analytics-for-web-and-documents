from __future__ import division
#Flask dependencies
from flask import Blueprint, request, render_template, redirect, url_for
import csv

# Import the database object from the main app module
from app.list.models import JListInputFile

from app.list.pagination import Pagination
from app import app
from random import randint
from collections import defaultdict
import random
import json
import string
import unicodedata
import copy

ITEMS_PER_PAGE = 12

# Define the blueprint: 'list', set its url prefix: app.url/list
mod_list = Blueprint('list', __name__, url_prefix='/list')

@mod_list.route('/new-base')
def new_base():
	headers = sorted(JListInputFile.objects.first()["content"].keys())
	return render_template('list/new_list_base.html', headers=headers)

@mod_list.route('/get-list-entity-types')
def get_list_entity_types():
	#headers = sorted(JListInputFile.objects.first()["content"].keys())
	headers = headers = ["Author Name", "Conference", "Year"]
	return json.dumps(headers);

@mod_list.route('/get-list-contents')
def get_list_contents():
	#headers = sorted(JListInputFile.objects.first()["content"].keys())
	headers = ["Author Name", "Conference", "Year"]
	all_data = []
	for header in headers:
		content_list = JListInputFile._get_collection().aggregate([
				{'$match':{ 'content.'+header : {'$ne' : ''} }}, 
				{'$group':{'_id':'$content.'+header,'count': { '$sum': 1 }}},
				{'$group':{'_id':0, 'maxCount':{'$max':'$count'}, 'docs':{'$push':'$$ROOT'}}},
				{'$project':{'_id':0, 'docs':{'$map':{'input':'$docs','as':'e', 'in':{'_id':'$$e._id', 'count':'$$e.count', 'rate':{'$divide':["$$e.count", "$maxCount"]}}}}}},
				{'$unwind':'$docs'},
				{'$project':{'name':'$docs._id', 'count':'$docs.count','frequency':'$docs.rate','strength':{'$literal':0},'hasStrength':{'$literal':0},'strengthCount':{'$literal':0}}}
			])['result']

		all_data.append({
			"key": header,
			"values": content_list
		})

	return json.dumps(all_data)

@mod_list.route('/get-updated-list-contents', methods=["POST"])
def get_updated_list_contents():
	data = request.json
	return {
		'Any' : get_updated_list_contents_any_mode(data['params'], data['column_list']),
		'All' : get_updated_list_contents_all_mode(data['params'], data['column_list']),
		'And' : get_updated_list_contents_and_mode(data['params'], data['column_list']),
		'All-Any' : get_updated_list_contents_all_any_mode(data['params'], data['column_list'])
	}.get(data['mode'])

def get_updated_list_contents_any_mode(params, column_list):
	#Return strengths for entities related to any of the current selections

	connected_headers = JListInputFile.objects.first()["hidden"].keys()
	or_params = []
	for column_params in params:
		or_params.append({ 'content.'+column_params['column']: { '$in' : column_params['values'] } })
		if column_params['column'] in connected_headers:
			or_params.append({ 'hidden.'+column_params['column']: {'$in' : column_params['values']} })
	return get_aggregate_query_result({'$or':or_params}, column_list)

def get_updated_list_contents_all_mode(params, column_list):
	# entities connected to all of the current selections, though not necessarily in the same document
	entities = defaultdict(int)
	no_of_params = 0

	for column_params in params:
		for column_value in column_params['values']:
				no_of_params += 1
				for header in column_list:
					connected_entities_list = JListInputFile._get_collection().aggregate([
						{ '$match':{ 'content.'+column_params['column']:{ '$eq': column_value } }},
						{ '$project':{ '_id': 0, 'content.'+header: 1 }},
						{ '$group':{ '_id':'$content.'+header }}
					])['result']

					for entity in connected_entities_list:
						entities[entity['_id']] += 1

	header_index_map = defaultdict(int)
	all_data = []
	
	for column_params in params:
		for column_value in column_params['values']:
			for header in column_list:

				if header in header_index_map:
					list_index = header_index_map[header]
				else:
					value_dict = defaultdict(int)
					all_data.append({'key':header, 'values':value_dict})
					list_index = len(all_data)-1
					header_index_map[header] = list_index

				connected_entities_list = JListInputFile._get_collection().aggregate([
						{ '$match':{ 'content.'+column_params['column']:{ '$eq': column_value } }},
						{ '$project':{ '_id': 0, 'content.'+header: 1 }},
						{ '$group':{ '_id':'$content.'+header }}
					])['result']
				for entity in connected_entities_list:
					if entity['_id'] in entities and entities[entity['_id']] == no_of_params:
						all_data[list_index]['values'][entity['_id']] += 1

	json_data = []
	for column_data in all_data:
		values = [{'count':item[1], 'name':item[0]} for item in column_data['values'].items()]
		if values:
			max_count = max([item[1] for item in column_data['values'].items()])
			values = [{'count': item['count'], 'name': item['name'], 'strength': item['count']/max_count} for item in values]
			json_data.append({'key':column_data['key'], 'values': values})
	
	return json.dumps(json_data)

def get_updated_list_contents_and_mode(params, column_list):
	#Entities connected to all of the current selections, through a single document
	outer_and_params = []
	for column_params in params:
		for column_value in column_params['values']:
			 outer_and_params.append({ 'content.'+column_params['column']: column_value })
	return get_aggregate_query_result({'$and':outer_and_params}, column_list)

def get_updated_list_contents_all_any_mode(params, column_list):
	#Entities connected to all of the selections across lists, but any of the selections within a list
	and_params = []
	for column_params in params:
		and_params.append({ 'content.'+column_params['column']: { '$in' : column_params['values'] } })
	return get_aggregate_query_result({'$and':and_params}, column_list)

def get_aggregate_query_result(match_params, column_list):
	all_data = []

	for header in column_list:
		raw_list = JListInputFile._get_collection().aggregate([
			{ '$match': match_params },
			{ '$group':  {'_id': '$content.'+header, 'count': { '$sum': 1 }} },
			{ '$group':{'_id':0, 'maxCount':{'$max':'$count'}, 'docs':{'$push':'$$ROOT'}}},
			{ '$project':{'_id':0, 'docs':{'$map':{'input':'$docs','as':'e', 'in':{'_id':'$$e._id', 'count':'$$e.count', 'rate':{'$divide':["$$e.count", "$maxCount"]}}}}}},
			{ '$unwind':'$docs'},
			{ '$project':{'name':'$docs._id', 'count':'$docs.count','strength':'$docs.rate'}}
		])['result']

		all_data.append({
			'key': header,
			'values': raw_list
		})
	return json.dumps(all_data)


@mod_list.route('/base')
def base():
	headers = sorted(JListInputFile.objects.first()["content"].keys())
	author_list = JListInputFile._get_collection().aggregate([{'$match':{ 'content.Author' : {'$ne' : ''} }}, {'$group':{'_id':'$content.Author','count': { '$sum': 1 }}} ])['result']
	max_count = max(author['count'] for author in author_list)
	list_author_contents = [(author['_id'],((1-(author['count']/max_count))*160)) for author in author_list]

	year_list = JListInputFile._get_collection().aggregate([{'$match':{ 'content.Year' : {'$ne' : ''} }}, {'$group':{'_id':'$content.Year','count': { '$sum': 1 }}} ])['result']
	max_count = max(year['count'] for year in year_list)
	list_year_contents = [(year['_id'],((1-(year['count']/max_count))*160)) for year in year_list]

	conference_list = JListInputFile._get_collection().aggregate([{'$match':{ 'content.Conference' : {'$ne' : ''} }}, {'$group':{'_id':'$content.Conference','count': { '$sum': 1 }}} ])['result']
	max_count = max(conference['count'] for conference in conference_list)
	list_conference_contents = [(conference['_id'],((1-(conference['count']/max_count))*160)) for conference in conference_list]

	return render_template('list/list_base.html', headers=headers, lists = [list_year_contents, list_author_contents, list_conference_contents])


@mod_list.route('/get-selections', methods=['POST'])
def get_selections():
	selection_data = []
	for column_name in request.json['related']:
		document_list = JListInputFile._get_collection().aggregate([ {'$match':{ 'content.'+request.json['current'] : {'$eq' : request.json['selection']} }}, {'$group':{'_id':'$content.'+column_name, 'count':{'$sum':1}}} ])['result']
		max_val = max(int(document['count']) for document in document_list)
		
		for document in document_list:
			document['count'] /= max_val
		
		selection_data.append({
			'list': column_name,
			'values': document_list
		})
	return json.dumps(selection_data)

@mod_list.route('/process-file')
def insert_csv_file():
	JListInputFile.drop_collection()

	input_file = csv.DictReader(open("new-input.csv","rU"))
	for dict_row in input_file:
		JListInputFile(content=dict_row).save()
	return redirect(url_for('.index'))

@mod_list.route('/')
def index():
	headers = sorted(JListInputFile.objects.first()["content"].keys())
	return render_template('list/index.html', headers=headers)

@mod_list.route('/rows/', defaults={'page': 1}, methods=['POST'])
@mod_list.route('/rows/page/<int:page>', methods=['POST'])
def rows(page):
	headers = sorted(JListInputFile.objects.first()["content"].keys())
	data = JListInputFile.objects.paginate(page=page, per_page=ITEMS_PER_PAGE)
	pagination = Pagination(page, ITEMS_PER_PAGE, len(JListInputFile.objects))
	return render_template('list/table.html', data=data, headers=headers, pagination=pagination)

@mod_list.route('/pagination/', defaults={'page': 1}, methods=['POST'])
@mod_list.route('/pagination/page/<int:page>', methods=['POST'])
def pagination(page):
	pagination = Pagination(page, ITEMS_PER_PAGE, len(JListInputFile.objects))
	return render_template('list/pagination.html', pagination=pagination)

@mod_list.route('/rows/sort/page/<int:page>', methods=['POST'])
def sort(page):
	json = request.json
	sort_column = ""
	if(json['sort'] == "desc"):
		sort_column = "-"
	sort_column = sort_column + "content." + json['column']
	headers = sorted(JListInputFile.objects.first()["content"].keys())
	data = JListInputFile.objects.order_by(sort_column).paginate(page=page, per_page=ITEMS_PER_PAGE)
	pagination = Pagination(page, ITEMS_PER_PAGE, len(JListInputFile.objects))
	return render_template('list/table.html', pagination=pagination, data=data, headers=headers)

@mod_list.route('/delete-column/page/<int:page>', methods=['POST'])
def delete_column(page):
	JListInputFile.objects.update(**{"unset__content__"+request.json['column']:1})
	headers = sorted(JListInputFile.objects.first()["content"].keys())
	data = JListInputFile.objects.paginate(page=page, per_page=ITEMS_PER_PAGE)
	pagination = Pagination(page, ITEMS_PER_PAGE, len(JListInputFile.objects))
	return render_template('list/table.html', pagination=pagination, data=data, headers=headers)

@mod_list.route('/rename-column/page/<int:page>', methods=['POST'])
def rename_column(page):
	raw_query = {"$rename":{"content."+request.json['old']:"content."+request.json['new']}}
	updated_column_count = JListInputFile.objects.update(__raw__=raw_query)
	headers = sorted(JListInputFile.objects.first()["content"].keys())
	data = JListInputFile.objects.paginate(page=page, per_page=ITEMS_PER_PAGE)
	pagination = Pagination(page, ITEMS_PER_PAGE, len(JListInputFile.objects))
	return render_template('list/table.html', pagination=pagination, data=data, headers=headers)

@mod_list.route('/show-select', methods=['POST'])
def show_select():
	headers = sorted(JListInputFile.objects.first()["content"].keys())
	return render_template('list/select.html', headers=headers)

@mod_list.route('/split-column-into-rows/page/<int:page>',methods=['POST'])
def split_into_rows(page):
	keysToSplit = request.json['keysToSplit']
	newKeys = request.json['newKeys']
	separator = request.json['separator']
	for document in JListInputFile.objects:
		contentDict = document.content
		if all(key in contentDict for key in keysToSplit):
			## Only proceed if all the keys that are to be split are available
			## in the document content dictionary..
			temp = {}
			no_of_elements = 0
			
			try:
				for index in range(0, len(keysToSplit)):
					temp[newKeys[index]] = [key.strip() for key in contentDict[keysToSplit[index]].split(separator)]
					no_of_elements = len(temp[newKeys[index]])
					del contentDict[keysToSplit[index]]
			
				for rowIndex in range(0, no_of_elements):
					new_document = JListInputFile(content=contentDict)
					for key in newKeys:
						try:
							new_document.content[key] = temp[key][rowIndex]
							
							#Create a copy of all the values of the column, remove the current value and add
							#the rest onto a hidden field that represents the connections..
							connected_values = copy.copy(temp[key])
							connected_values.remove(temp[key][rowIndex])
							#filtering removes empty values that may be a part of the array..
							new_document.hidden[key] = filter(None, connected_values)
						except IndexError, e:
							## Issues with the input CSV (unable to find correct number of elements)
							new_document.content[key] = ""
					new_document.save()
				document.delete()
			except AttributeError, e:
				## When a particular key in the contentDict is null, it wouldn't have
				## an attribute called split.
				pass
	headers = sorted(JListInputFile.objects.first()["content"].keys())
	data = JListInputFile.objects.paginate(page=page, per_page=ITEMS_PER_PAGE)
	pagination = Pagination(page, ITEMS_PER_PAGE, len(JListInputFile.objects))
	return render_template('list/table.html', pagination=pagination, data=data, headers=headers)

@mod_list.route('/split-column-into-cols/page/<int:page>',methods=['POST'])
def split_into_cols(page):
	column_to_split = request.json['column']
	separator = request.json['separator']

	new_columns = [column_name.strip() for column_name in column_to_split.split(separator)]
	for document in JListInputFile.objects:
		values = [value.strip() for value in document.content[column_to_split].split(separator)]
		for column_index in range(0, len(new_columns)):
			try:
				document.content[new_columns[column_index]] = values[column_index]
			except IndexError, e:
				## Issues with the input CSV (unable to find correct number of elements)
				document.content[new_columns[column_index]] = ""
		document.save()

	JListInputFile.objects.update(**{"unset__content__"+column_to_split:1})
	headers = sorted(JListInputFile.objects.first()["content"].keys())
	data = JListInputFile.objects.paginate(page=page, per_page=ITEMS_PER_PAGE)
	pagination = Pagination(page, ITEMS_PER_PAGE, len(JListInputFile.objects))
	return render_template('list/table.html', pagination=pagination, data=data, headers=headers)	

def url_for_page(page):
	return url_for('.rows', page=page)

def url_for_pagination(page):
	return url_for('.pagination', page=page)

def url_for_sorting(option, page):
	return url_for('.sort', page=page, option=option)

app.jinja_env.globals['url_for_page'] = url_for_page
app.jinja_env.globals['url_for_pagination'] = url_for_pagination
app.jinja_env.globals['url_for_sorting'] = url_for_sorting
