activate_this = '/home/anand/mastersproject/visual-analytics-for-web-and-documents/env/bin/activate_this.py'
execfile(activate_this, dict(__file__=activate_this))

# Set the path
import sys
#import logging
#from logging import FileHandler

sys.path.insert(0, '/home/anand/mastersproject/visual-analytics-for-web-and-documents')

from app import app as application
from flask.ext.triangle import Triangle

Triangle(application)

#file_handler = FileHandler("/home/anand/mastersproject/debug.log","a")
#file_handler.setLevel(logging.WARNING)
#application.logger.addHandler(file_handler)

UPLOAD_FOLDER = os.path.join('.', os.path.dirname(__file__), 'upload/')
appplication.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
appplication.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

if __name__ == "__main__":
    application.run()
