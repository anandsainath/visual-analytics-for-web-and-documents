activate_this = '/home/anand/mastersproject/visual-analytics-for-web-and-documents/env/bin/activate_this.py'
execfile(activate_this, dict(__file__=activate_this))

# Set the path
import sys
sys.path.insert(0, '/home/anand/mastersproject/visual-analytics-for-web-and-documents')

from app import app as application

if __name__ == "__main__":
    application.run()
