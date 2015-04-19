# -*- coding: utf-8 -*-
from __future__ import division
#Flask dependencies
from flask import Blueprint, request, render_template, redirect, url_for, session, g
from flask.ext.cache import Cache
import csv

from app.list.pagination import Pagination
from app import app
from random import randint
from collections import defaultdict
from werkzeug import secure_filename
from pymongo import ASCENDING, DESCENDING
import random
import json
import string
import unicodedata
import copy
import os
import md5
import datetime

from ..utils import Utils as DBUtils

ITEMS_PER_PAGE = 10

# Define the blueprint: 'list', set its url prefix: app.url/list
mod_list = Blueprint('list', __name__, url_prefix='/list')
cache = Cache(app,config={'CACHE_TYPE': 'simple'})

###########################
#FILE UPLOAD CONFIGURATION#

ALLOWED_EXTENSIONS = set(['csv'])

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS

###########################

@mod_list.route("/print-session")
def print_session():
	return session['token']
	
@mod_list.route("/", methods=['GET', 'POST'])
def index():
	if request.method == 'POST':
		file = request.files['file']
		if file and allowed_file(file.filename):

			filename = secure_filename(file.filename)
			file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
			file.save(file_path)

			md5sum_generator = md5.new()
			md5sum_generator.update(file.filename)
			md5sum_generator.update(datetime.datetime.now().isoformat())
			collection_name = md5sum_generator.hexdigest()

			new_collection = DBUtils().get_collection_obj(collection_name)
			new_collection.insert(csv.DictReader(open(file_path,"rU")))

			# list_columns = new_collection.find_one().keys()
			# for column in list_columns:
			# 	if new_collection.find({"$where": "this."+column+".length > 100"}).count() > 0:
			# 		print column +" has a length greater than 100"
			
			##Generate a table with the names of all the columns so that this can be referenced further..
			##Caution: Needs to be updated when ever a new entity type is created..
			DBUtils().generate_keys_table(collection_name)

			session['token'] = collection_name
			session.permanent = True

			os.remove(file_path)
			return redirect(url_for('.admin'))
	return render_template('list/index.html')

###########################
#ADMIN APIS

def is_vis25():
	return DBUtils().get_session_token() == app.config['VIS25_DB']

def get_columns_from_session_db():
	headers = DBUtils().get_keys()

	columns_to_be_removed = ['_id', 'SUMMARY']
	
	for key in headers:
		if key.startswith("__"):
			columns_to_be_removed.append(key)

	for key in columns_to_be_removed:
		if key in headers: headers.remove(key)

	return headers

def get_column_list(is_admin_interface = False):
	#TODO: DO this dynamically..
	if is_vis25():
		if is_admin_interface:
			headers = get_columns_from_session_db()
		else:
			headers = ["Author", "Conference", "Year"]
	else:
		headers = get_columns_from_session_db()
	return headers

@mod_list.route('/admin')
def admin():
	if 'token' in session:
		return render_template('list/admin.html', headers=get_column_list(is_admin_interface=True))
	return redirect(url_for('.index'))

@mod_list.route('/rows/', defaults={'page': 1}, methods=['POST'])
@mod_list.route('/rows/page/<int:page>', methods=['POST'])
def rows(page):
	session_db = DBUtils().get_session_db()
	data = session_db.find().skip(ITEMS_PER_PAGE * (page - 1)).limit(ITEMS_PER_PAGE)
	# print type(data)
	pagination = Pagination(page, ITEMS_PER_PAGE, session_db.count())
	return render_template('list/table.html', data=data, headers=get_column_list(is_admin_interface=True), pagination=pagination)

@mod_list.route('/pagination/', defaults={'page': 1}, methods=['POST'])
@mod_list.route('/pagination/page/<int:page>', methods=['POST'])
def pagination(page):
	session_db = DBUtils().get_session_db()
	pagination = Pagination(page, ITEMS_PER_PAGE, session_db.count())
	return render_template('list/pagination.html', pagination=pagination)

@mod_list.route('/rows/sort/page/<int:page>', methods=['POST'])
def sort(page):
	json = request.json
	sort_params = []
	if(json['sort'] == "desc"):
		sort_params.append((json['column'], DESCENDING))
	else:
		sort_params.append((json['column'], ASCENDING))

	session_db = DBUtils().get_session_db()
	data = session_db.find().sort(sort_params).skip(ITEMS_PER_PAGE * (page - 1)).limit(ITEMS_PER_PAGE)
	pagination = Pagination(page, ITEMS_PER_PAGE, session_db.count())
	return render_template('list/table.html', pagination=pagination, data=data, headers=get_column_list(is_admin_interface=True))

@mod_list.route('/delete-column/page/<int:page>', methods=['POST'])
def delete_column(page):
	session_db = DBUtils().get_session_db()
	return_val = session_db.update({}, { '$unset': { request.json['column'] : 1 } }, multi=True)

	DBUtils().generate_keys_table(session['token'])

	data = session_db.find().skip(ITEMS_PER_PAGE * (page - 1)).limit(ITEMS_PER_PAGE)
	pagination = Pagination(page, ITEMS_PER_PAGE, session_db.count())
	return render_template('list/table.html', pagination=pagination, data=data, headers=get_column_list(is_admin_interface=True))

@mod_list.route('/rename-column/page/<int:page>', methods=['POST'])
def rename_column(page):
	session_db = DBUtils().get_session_db()
	return_val = session_db.update({}, { '$rename' : {request.json['old'] : request.json['new']} }, multi=True)

	DBUtils().generate_keys_table(session['token'])
	
	data = session_db.find().skip(ITEMS_PER_PAGE * (page - 1)).limit(ITEMS_PER_PAGE)
	pagination = Pagination(page, ITEMS_PER_PAGE, session_db.count())
	return render_template('list/table.html', pagination=pagination, data=data, headers=get_column_list(is_admin_interface=True))

@mod_list.route('/show-select', methods=['POST'])
def show_select():
	return render_template('list/select.html', headers=get_column_list(is_admin_interface=True))

##Function that splits a multi columned value into an array which would then be 
##considered as separate rows when the listVIS is shown to the user.
##TODO: Implement the same logic while showing the results to the user.
@mod_list.route('/split-column-into-rows/page/<int:page>',methods=['POST'])
def split_into_rows(page):
	keysToSplit = request.json['keysToSplit']
	newKeys = request.json['newKeys']
	separator = request.json['separator']

	session_db = DBUtils().get_session_db()
	for document in session_db.find():
		if all(key in document for key in keysToSplit):
			## Only proceed if all the keys that are to be split are available
			## in the document content dictionary..
			try:
				set_dict = {}
				for index in range(0, len(keysToSplit)):
					set_dict[newKeys[index]] = [key.strip() for key in document[keysToSplit[index]].split(separator)]
				session_db.update({"_id":document["_id"]},{ '$set': set_dict })
			except AttributeError, e:
				## When a particular key in the contentDict is null, it wouldn't have
				## an attribute called split.
				pass

	#Create a dictionary for all the columns that need to be deleted..
	delete_params = {}
	for old_key in keysToSplit:
		delete_params[old_key] = 1
	return_val = session_db.update({}, { '$unset': delete_params }, multi=True)

	DBUtils().generate_keys_table(session['token'])

	data = session_db.find().skip(ITEMS_PER_PAGE * (page - 1)).limit(ITEMS_PER_PAGE)
	pagination = Pagination(page, ITEMS_PER_PAGE, session_db.count())
	return render_template('list/table.html', pagination=pagination, data=data, headers=get_column_list(is_admin_interface=True))

@mod_list.route('/split-column-into-cols/page/<int:page>',methods=['POST'])
def split_into_cols(page):
	column_to_split = request.json['column']
	separator = request.json['separator']

	session_db = DBUtils().get_session_db()
	new_columns = [column_name.strip() for column_name in column_to_split.split(separator)]
	for document in session_db.find():
		values = [value.strip() for value in document[column_to_split].split(separator)]
		set_dict = {}
		for column_index in range(0, len(new_columns)):
			try:
				set_dict[new_columns[column_index]] = values[column_index]
			except IndexError, e:
				## Issues with the input CSV (unable to find correct number of elements)
				pass
		session_db.update({"_id":document["_id"]},{ '$set': set_dict })

	return_val = session_db.update({}, { '$unset': {column_to_split:1} }, multi=True)

	DBUtils().generate_keys_table(session['token'])

	data = session_db.find().skip(ITEMS_PER_PAGE * (page - 1)).limit(ITEMS_PER_PAGE)
	pagination = Pagination(page, ITEMS_PER_PAGE, session_db.count())
	return render_template('list/table.html', pagination=pagination, data=data, headers=get_column_list(is_admin_interface=True))

def url_for_page(page):
	return url_for('.rows', page=page)

def url_for_pagination(page):
	return url_for('.pagination', page=page)

def url_for_sorting(option, page):
	return url_for('.sort', page=page, option=option)

app.jinja_env.globals['url_for_page'] = url_for_page
app.jinja_env.globals['url_for_pagination'] = url_for_pagination
app.jinja_env.globals['url_for_sorting'] = url_for_sorting

###########################

@mod_list.route('/vis25')
def vis25():
	session['token'] = app.config["VIS25_DB"]
	return render_template('list/viz.html', headers=get_column_list(), token=session['token'], vis25=True)

@mod_list.route('/visualize')
def visualize():
	if 'token' in session:
		return render_template('list/viz.html', headers=get_column_list(), token=session['token'], vis25=False)
	else:
		return redirect(url_for('.index'))

@mod_list.route('/session/<session_id>')
def load_session(session_id):
	#TODO: Check if the session_id exists
	session['token'] = session_id
	return redirect(url_for('.visualize'))

@mod_list.route('/tutorial')
def tutorial():
	return render_template('list/tutorial.html')

@mod_list.route('/get-list-entity-types')
def get_list_entity_types():
	return json.dumps(get_column_list())

def get_columns_with_list_content():
	key_list = DBUtils().get_keys()
	session_db = DBUtils().get_session_db()

	list_columns = []
	for column_name in key_list:
		if column_name in ['_id', '__read_count']:
			continue

		data_dict = session_db.find_one({column_name:{"$exists": True}})
		if type(data_dict[column_name]) is list:
			list_columns.append(column_name)
	return list_columns

@mod_list.route('/get-list-contents')
def get_list_contents():
	headers = get_column_list()
	session_db = DBUtils().get_session_db()
	list_columns = get_columns_with_list_content()

	all_data = []
	for header in headers:
		aggregate_array = []
		
		if header in list_columns:
			aggregate_array.append({ '$unwind' : '$'+header })
		
		aggregate_array.extend([
				{'$match':{ header : {'$ne' : ''} }}, 
				{'$group':{'_id':'$'+header,'count': { '$sum': 1 }}},
				{'$group':{'_id':0, 'maxCount':{'$max':'$count'}, 'docs':{'$push':'$$ROOT'}}},
				{'$project':{'_id':0, 'docs':{'$map':{'input':'$docs','as':'e', 'in':{'_id':'$$e._id', 'count':'$$e.count', 'rate':{'$divide':["$$e.count", "$maxCount"]}}}}}},
				{'$unwind':'$docs'},
				{'$project':{'name':'$docs._id', 'count':'$docs.count','frequency':'$docs.rate','strength':{'$literal':0},'hasStrength':{'$literal':0},'strengthCount':{'$literal':0}}}
		])
		
		content_list = session_db.aggregate(aggregate_array)['result']
		if content_list:
			print content_list, [item['count'] for item in content_list]

			if max([item['count'] for item in content_list]) == 1:
				temp_list = content_list
				content_list = []
				new_count = 1/len(temp_list)
				for dict_item in temp_list:
					dict_item['frequency'] = new_count
					content_list.append(dict_item)

			all_data.append({
				"key": header,
				"values": content_list
			})

	return json.dumps(all_data)

@mod_list.route('/get-updated-list-contents', methods=["POST"])
def get_updated_list_contents():
	data = request.json
	if data['mode'] == 'Any':
		return get_updated_list_contents_any_mode(data['params'], data['column_list'])
	elif data['mode'] == 'All':
		return get_updated_list_contents_all_mode(data['params'], data['column_list'])
	elif data['mode'] == 'And':
		return get_updated_list_contents_and_mode(data['params'], data['column_list'])
	elif data['mode'] == 'All-Any':
		return get_updated_list_contents_all_any_mode(data['params'], data['column_list'])

def get_updated_list_contents_any_mode(params, column_list):
	'''
	Return strengths for entities related to any of the current selections
	'''
	or_params = []
	for column_params in params:
		or_params.append({ column_params['column']: { '$in' : column_params['values'] } })
	return get_aggregate_query_result({'$or':or_params}, column_list)

def get_updated_list_contents_and_mode(params, column_list):
	'''
	Entities connected to all of the current selections, through a single document
	'''
	and_params = []
	for column_params in params:
		and_params.append({ column_params['column']: { '$all' : column_params['values'] } })
	return get_aggregate_query_result({'$and':and_params}, column_list)

def get_updated_list_contents_all_any_mode(params, column_list):
	'''
	Entities connected to all of the selections across lists, but any of the selections within a list
	'''
	and_params = []
	for column_params in params:
		and_params.append({ column_params['column']: { '$in' : column_params['values'] } })
	return get_aggregate_query_result({'$and':and_params}, column_list)

def get_updated_list_contents_all_mode(params, column_list):
	'''
	Entities connected to all of the current selections, though not necessarily in the same document
	'''
	all_data = []
	session_db = DBUtils().get_session_db()
	list_columns = get_columns_with_list_content()

	for header in column_list:
		values_set_once = False

		dict_intersecting_column_values = {}
		for column_params in params:
			column_name = column_params['column']
			for column_value in column_params['values']:
				aggregate_array = [{'$match':{ column_name : column_value }}]

				if header in list_columns:
					aggregate_array.append({ '$unwind' : '$' + header })

				aggregate_array.extend([
					{ '$group':  {'_id': '$'+header, 'ids' : {'$addToSet': '$_id'}} }
				]);
				
				value_match_list = session_db.aggregate(aggregate_array)['result']
				dict_values_match = dict((x['_id'], x['ids']) for x in value_match_list)
				# print dict_values_match

				if not dict_intersecting_column_values and not values_set_once:
					values_set_once = True
					dict_intersecting_column_values = dict_values_match
				else:
					dict_intersecting_column_values = get_intersecting_documents(dict_intersecting_column_values, dict_values_match)
				
				if not dict_intersecting_column_values:
					break

				# print column_name, column_value, value_match_list

			if not dict_intersecting_column_values:
				all_data.append({'key':header, 'values':[]})
				break
		
		if dict_intersecting_column_values:
			all_data.append({'key':header, 'values': get_column_values(dict_intersecting_column_values)})

	return json.dumps(all_data)

def get_column_values(dict_values):
	list_values = []
	total_count = 0
	for key, value in dict_values.iteritems():
		total_count += len(value)

	for key, value in dict_values.iteritems():
		list_value = {}
		list_value['count'] = len(value)
		list_value['strength'] = list_value['count'] / total_count
		list_value['name'] = key
		list_values.append(list_value)

	return list_values

def get_intersecting_documents(dict_a, dict_b):
	dict_intersection = {}
	for key in dict_a.keys():
		if key in dict_b:
			dict_intersection[key] = {}
			dict_intersection[key] = list(set(dict_a[key] + dict_b[key]))
	return dict_intersection

def get_aggregate_query_result(match_params, column_list):
	all_data = []
	session_db = DBUtils().get_session_db()
	list_columns = get_columns_with_list_content()

	for header in column_list:
		aggregate_array = [{ '$match': match_params }]
		
		if header in list_columns:
			aggregate_array.append({ '$unwind' : '$'+header })
		
		aggregate_array.extend([
			{ '$group':  {'_id': '$'+header, 'count': { '$sum': 1 }} },
			{ '$group':{'_id':0, 'maxCount':{'$max':'$count'}, 'docs':{'$push':'$$ROOT'}}},
			{ '$project':{'_id':0, 'docs':{'$map':{'input':'$docs','as':'e', 'in':{'_id':'$$e._id', 'count':'$$e.count', 'rate':{'$divide':["$$e.count", "$maxCount"]}}}}}},
			{ '$unwind':'$docs'},
			{ '$project':{'name':'$docs._id', 'count':'$docs.count','strength':'$docs.rate'}}
		])	
		raw_list = session_db.aggregate(aggregate_array)['result']

		all_data.append({
			'key': header,
			'values': raw_list
		})
	return json.dumps(all_data)

@mod_list.route('/get-selections', methods=['POST'])
def get_selections():
	selection_data = []
	session_db = DBUtils().get_session_db()

	for column_name in request.json['related']:
		document_list = session_db.aggregate([ {'$match':{ request.json['current'] : {'$eq' : request.json['selection']} }}, {'$group':{'_id':'$'+column_name, 'count':{'$sum':1}}} ])['result']
		max_val = max(int(document['count']) for document in document_list)
		
		for document in document_list:
			document['count'] /= max_val
		
		selection_data.append({
			'list': column_name,
			'values': document_list
		})
	return json.dumps(selection_data)
