from __future__ import division
#Flask dependencies
from flask import Blueprint, request, render_template, redirect, url_for
import csv

# Import the database object from the main app module
from app.list.models import JListInputFile

from app.list.pagination import Pagination
from app import app
from random import randint
import random
import json
import string

ITEMS_PER_PAGE = 12

# Define the blueprint: 'list', set its url prefix: app.url/list
mod_list = Blueprint('list', __name__, url_prefix='/list')

@mod_list.route('/process-file')
def insert_csv_file():
	JListInputFile.drop_collection()

	input_file = csv.DictReader(open("input.csv"))
	for dict_row in input_file:
		JListInputFile(content=dict_row).save()
	return redirect(url_for('.index'))

@mod_list.route('/base')
def base():
	headers = sorted(JListInputFile.objects.first()["content"].keys())
	author_list = JListInputFile._get_collection().aggregate([{'$match':{ 'content.Author' : {'$ne' : ''} }}, {'$group':{'_id':'$content.Author','count': { '$sum': 1 }}} ])['result']
	max_count = max(author['count'] for author in author_list)
	list_author_contents = [(author['_id'],((1-(author['count']/max_count))*159)) for author in author_list]

	#affiliation_list = JListInputFile._get_collection().aggregate([{'$match':{ 'content.Affiliation' : {'$ne' : ''} }}, {'$group':{'_id':'$content.Affiliation','count': { '$sum': 1 }}} ])['result']
	#max_count = max(affiliation['count'] for affiliation in affiliation_list)
	#list_affiliation_contents = [(affiliation['_id'],((1-(affiliation['count']/max_count))*159)) for affiliation in affiliation_list]
	
	year_list = JListInputFile._get_collection().aggregate([{'$match':{ 'content.Year' : {'$ne' : ''} }}, {'$group':{'_id':'$content.Year','count': { '$sum': 1 }}} ])['result']
	max_count = max(year['count'] for year in year_list)
	list_year_contents = [(year['_id'],((1-(year['count']/max_count))*159)) for year in year_list]

	conference_list = JListInputFile._get_collection().aggregate([{'$match':{ 'content.Conference' : {'$ne' : ''} }}, {'$group':{'_id':'$content.Conference','count': { '$sum': 1 }}} ])['result']
	max_count = max(conference['count'] for conference in conference_list)
	list_conference_contents = [(conference['_id'],((1-(conference['count']/max_count))*159)) for conference in conference_list]

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
