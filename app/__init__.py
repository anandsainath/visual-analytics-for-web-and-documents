# Import flask and template operators
from flask import Flask, render_template, redirect, url_for
from flask.ext.mongoengine import MongoEngine

# Define the WSGI application object
app = Flask(__name__)
app.config["MONGODB_SETTINGS"] = {'DB': "jigsaw"}
app.config["SECRET_KEY"] = "KeepThisS3cr3t"

db = MongoEngine(app)

@app.route("/")
def index():
	return redirect(url_for('.list.index'))

# Sample HTTP error handling
@app.errorhandler(404)
def not_found(error):
    return "TODO: 404 page", 404


from app.data.controllers import mod_data as mod_data
from app.list.controllers import mod_list as mod_list

# Register blueprint(s)
app.register_blueprint(mod_data)
app.register_blueprint(mod_list)