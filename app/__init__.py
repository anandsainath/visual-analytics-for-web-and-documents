# Import flask and template operators
from flask import Flask, render_template, redirect, url_for
from flask.ext.compress import Compress
import os


# Define the WSGI application object
app = Flask(__name__)
app.config.from_object(__name__)

Compress(app)
app.config['COMPRESS_DEBUG'] = True

app.config['UPLOAD_FOLDER'] = 'uploads'
app.config["MONGODB_SETTINGS"] = {'DB': "jigsaw"}
app.config["SECRET_KEY"] = "c39dcb77e31b57bb094e816c4982ac3c"

##Below configurations need to be changed in the server.
app.config["VIS25_DB"] = "3fddc06d9f3848af6b5cd8ac6bc8d249"
app.config["SITE_DOMAIN"] = "127.0.0.1:5000"

UPLOAD_FOLDER = os.path.join('.', os.path.abspath(os.path.join(__file__, '..')), 'upload/')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

@app.route("/")
def index():
	return redirect(url_for('.data.index'))

# Sample HTTP error handling
@app.errorhandler(404)
def not_found(error):
    return "TODO: 404 page", 404


from app.data.controllers import mod_data as mod_data
from app.list.controllers import mod_list as mod_list

# Register blueprint(s)
app.register_blueprint(mod_data)
app.register_blueprint(mod_list)

