# Import flask and template operators
from flask import Flask, render_template, redirect, url_for

# Define the WSGI application object
app = Flask(__name__)
app.config.from_object(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config["MONGODB_SETTINGS"] = {'DB': "jigsaw"}
app.config["SECRET_KEY"] = "c39dcb77e31b57bb094e816c4982ac3c"

##Below configurations need to be changed in the server.
app.config["VIS25_DB"] = "56bcf92a4e6ac231598459b95de86410"
app.config["SITE_DOMAIN"] = "127.0.0.1:5000"

@app.route("/")
def index():
	return redirect(url_for('.list.index'))

# Sample HTTP error handling
@app.errorhandler(404)
def not_found(error):
    return "TODO: 404 page", 404


# from app.data.controllers import mod_data as mod_data
from app.list.controllers import mod_list as mod_list

# Register blueprint(s)
# app.register_blueprint(mod_data)
app.register_blueprint(mod_list)