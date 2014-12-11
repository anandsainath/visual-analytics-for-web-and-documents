# Import the database object (db) from the main application module
from app import db

# Define a Document model here
class JListInputFile(db.Document):
	
	__CollectionName__ = "list_input_file"

	content = db.DictField(required=True)
	# hidden = db.DictField()

	#Constructor
	def __init__(self, *args, **kwargs):
		db.Document.__init__(self, *args, **kwargs)
		try:
			self.content = kwargs['content']
		except NameError:
			pass

	meta = {
		'collection' : __CollectionName__,
		'allow_inheritance': True
	}