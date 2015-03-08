from app import app
from flask import session
from pymongo import MongoClient
from bson.code import Code
from bson.son import SON

###########################
#DB APIS

def get_db():
	client = MongoClient()
	return client[app.config['MONGODB_SETTINGS']['DB']]

def get_collection_obj(collection_name):
	db = get_db()
	return db[collection_name]

def get_session_db():
	return get_collection_obj(session['token'])

def get_session_key_db():
	return get_collection_obj(session['token']+"_keys")

def get_keys():
	return [document['_id'] for document in get_session_key_db().find({},{'_id': 1})]

def generate_keys_table(collection_name):
	map = Code("function() { for (var key in this) { emit(key, null); } }")
	reduce = Code("function(key, stuff) { return null; }")
	get_collection_obj(collection_name).map_reduce(map, reduce,  out=SON([("replace", collection_name+"_keys"), ("db", app.config['MONGODB_SETTINGS']['DB'])]))

###########################