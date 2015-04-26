# Set the path
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask.ext.script import Manager, Server
from flask.ext.triangle import Triangle
from app import app

manager = Manager(app)
Triangle(app)

UPLOAD_FOLDER = os.path.join('.', os.path.dirname(__file__), 'upload/')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Turn on debugger by default and reloader
manager.add_command("runserver", Server( 
    use_debugger = True,
    use_reloader = True,
    threaded=True,
    host = '0.0.0.0')
)

if __name__ == "__main__":
    manager.run()