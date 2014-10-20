from flask import Flask, render_template, url_for
from mongoengine import *

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('home.html')

@app.route('/testdb')
def test():
	connect('jigsaw')
	return "Connection Success"

if __name__ == '__main__':
    app.run(debug=True)