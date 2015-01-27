# Import the database object (db) from the main application module
# from app import db

# class JSource(db.EmbeddedDocument):

# 	source_format = db.StringField(max_length=128, required=True)
# 	source_url = db.StringField(max_length=128, required=False)

# # Define a Document model here
# class JDocument(db.Document):

# 	__CollectionName__ = "document_corpus"

# 	name =  db.StringField(max_length=128, required=True)
# 	content =  db.StringField(required=True)
# 	summary =  db.StringField(max_length=512, required=False)
# 	entities =  db.ListField(required=False)
# 	source = db.EmbeddedDocumentField('JSource', required=False)

# 	#Constructor
# 	def __init__(self, *args, **kwargs):
# 		db.Document.__init__(self, *args, **kwargs)
# 		try:
# 			self.name = kwargs['name']
# 			self.content = kwargs['content']
# 		except NameError:
# 			pass

# 	meta = {
# 		'collection' : __CollectionName__,
# 		'allow_inheritance': True,
#     	'indexes': ['name'],
# 	}